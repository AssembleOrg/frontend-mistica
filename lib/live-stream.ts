/**
 * Eventos en vivo del backend (SSE) SIN pasar por el proxy de Netlify.
 *
 * El `EventSource` va directo al backend público (`NEXT_PUBLIC_BACKEND_URL`).
 * La cookie de sesión vive en el dominio del panel y no viaja a Railway, así
 * que antes de cada conexión se pide por el proxy normal (`/api`, un request
 * corto) un token de 90 s (`POST /realtime/stream-token`) y se manda en
 * `?token=`. El backend sólo lo valida al conectar.
 *
 * Si algo de esto no está (variable sin configurar, el token falla, el stream
 * se cae varias veces seguidas) se vuelve al polling con la pestaña visible de
 * `pollWhileVisible`, que es lo que había antes: desplegar esto sin la
 * variable no cambia nada.
 *
 * - En cada (re)conexión corre `sync` (refresco completo): así no se pierde lo
 *   que pasó mientras el stream estuvo caído.
 * - El reintento lo maneja esto, no el `EventSource` (que reusaría el token
 *   vencido): ante un error se cierra y se reconecta con token nuevo y backoff.
 * - Con la pestaña oculta más de un minuto se cierra el stream; al volver se
 *   reconecta (y sincroniza).
 * - El backend manda un `ping` cada 25 s; si dejan de llegar, se reconecta.
 */
import { apiService } from '@/services/api.service';
import { pollWhileVisible } from '@/lib/poll-while-visible';

/** `live`: stream abierto. `reconnecting`: se cayó y se reintenta. `polling`: modo de respaldo. */
export type LiveMode = 'live' | 'reconnecting' | 'polling';

interface LiveStreamOptions<T> {
  /** Ruta del stream bajo `/api` del backend, ej. `/in-app-notifications/stream`. */
  path: string;
  onEvent: (event: T) => void;
  /** Refresco completo: al conectar y, en modo polling, cada `pollMs`. */
  sync: () => void | Promise<void>;
  pollMs: number;
  onModeChange?: (mode: LiveMode) => void;
}

/** Fallas seguidas antes de pasar a polling. */
const MAX_FAILURES = 4;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
/** En modo polling, cada cuánto se vuelve a probar el stream. */
const REALTIME_RETRY_MS = 5 * 60_000;
/** Pestaña oculta más de esto: se cierra el stream. */
const HIDDEN_CLOSE_MS = 60_000;
/** Sin `ping` (cada 25 s en el backend) durante esto: stream colgado. */
const WATCHDOG_MS = 70_000;

/** Base pública del backend para el navegador (con `/api`), o null si no está configurada. */
export function realtimeBaseUrl(): string | null {
  // Literal: Next lo reemplaza en el build.
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!raw || !/^https?:\/\//.test(raw)) return null;
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

async function fetchStreamToken(): Promise<string> {
  const { data } = await apiService.post<{ token: string; expiresIn: number }>(
    '/realtime/stream-token',
    {},
  );
  if (!data?.token) throw new Error('Sin token de stream');
  return data.token;
}

/**
 * Abre el stream en vivo (o el polling de respaldo). Devuelve la función para
 * cortar todo (ideal como cleanup de un `useEffect`).
 */
export function liveOrPoll<T>({
  path,
  onEvent,
  sync,
  pollMs,
  onModeChange,
}: LiveStreamOptions<T>): () => void {
  const base = realtimeBaseUrl();
  if (!base || typeof EventSource === 'undefined') {
    onModeChange?.('polling');
    return pollWhileVisible(sync, pollMs);
  }

  let stopped = false;
  let source: EventSource | null = null;
  let connecting = false;
  let failures = 0;
  let parked = false; // cerrado por pestaña oculta
  let stopFallback: (() => void) | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let syncing = false;

  const runSync = async () => {
    if (syncing || stopped) return;
    syncing = true;
    try {
      await sync();
    } catch {
      /* el que llama decide qué hacer con sus errores */
    } finally {
      syncing = false;
    }
  };

  const clearWatchdog = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = null;
  };

  const armWatchdog = () => {
    clearWatchdog();
    watchdog = setTimeout(fail, WATCHDOG_MS);
  };

  const closeSource = () => {
    clearWatchdog();
    source?.close();
    source = null;
  };

  const schedule = (ms: number) => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, ms);
  };

  function fail() {
    if (stopped) return;
    closeSource();
    failures++;
    if (failures >= MAX_FAILURES) {
      if (!stopFallback) {
        onModeChange?.('polling');
        stopFallback = pollWhileVisible(sync, pollMs);
      }
      schedule(REALTIME_RETRY_MS);
    } else {
      onModeChange?.('reconnecting');
      const backoff = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (failures - 1));
      schedule(backoff + Math.random() * 500);
    }
  }

  async function connect() {
    if (stopped || parked || source || connecting) return;
    connecting = true;
    let token: string;
    try {
      token = await fetchStreamToken();
    } catch {
      connecting = false;
      fail();
      return;
    }
    connecting = false;
    if (stopped || parked || source) return;

    const es = new EventSource(`${base}${path}?token=${encodeURIComponent(token)}`);
    source = es;
    let gotPing = false;

    es.onopen = () => {
      if (source !== es) return;
      failures = 0;
      if (stopFallback) {
        stopFallback();
        stopFallback = null;
      }
      onModeChange?.('live');
      void runSync();
    };
    es.onmessage = (e: MessageEvent<string>) => {
      if (source !== es) return;
      if (gotPing) armWatchdog();
      try {
        onEvent(JSON.parse(e.data) as T);
      } catch {
        /* un evento mal formado no debe tirar abajo la suscripción */
      }
    };
    es.addEventListener('ping', () => {
      if (source !== es) return;
      gotPing = true;
      armWatchdog();
    });
    // Cualquier error: se cierra (el reintento nativo usaría el token vencido)
    // y se reconecta con token nuevo.
    es.onerror = () => {
      if (source !== es) return;
      fail();
    };
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      if (hiddenTimer) clearTimeout(hiddenTimer);
      hiddenTimer = null;
      if (parked) {
        parked = false;
        if (!source && !reconnectTimer) void connect();
      }
    } else if (!hiddenTimer && !parked) {
      hiddenTimer = setTimeout(() => {
        hiddenTimer = null;
        parked = true;
        closeSource();
      }, HIDDEN_CLOSE_MS);
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();
  // Primera carga sin esperar al stream; al abrir se vuelve a sincronizar.
  void runSync();
  void connect();

  return () => {
    stopped = true;
    closeSource();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (hiddenTimer) clearTimeout(hiddenTimer);
    stopFallback?.();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
