/**
 * Polling que sólo corre con la pestaña visible.
 *
 * Reemplaza a los EventSource (SSE) del panel: en Netlify cada stream abierto
 * mantenía viva una función (el proxy `/api/[...path]`) hasta el timeout y
 * reconectaba para siempre → horas de cómputo por cada pestaña abierta. Un
 * request corto cada tanto sale muchísimo más barato.
 *
 * - Corre `tick` al arrancar y cada `intervalMs` mientras la pestaña se ve.
 * - Con la pestaña oculta no consulta nada; al volver, refresca al toque.
 * - Nunca superpone dos `tick` (si uno tarda, el siguiente se saltea).
 *
 * Devuelve la función para cortar (ideal como cleanup de un `useEffect`).
 */
export function pollWhileVisible(
  tick: () => void | Promise<void>,
  intervalMs: number,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let stopped = false;

  const run = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await tick();
    } catch {
      /* el que llama decide qué hacer con sus errores */
    } finally {
      running = false;
    }
  };

  const start = () => {
    if (timer) return;
    void run();
    timer = setInterval(() => void run(), intervalMs);
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') start();
    else stop();
  };

  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();

  return () => {
    stopped = true;
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
