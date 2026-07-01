'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, LogOut, RefreshCw, RotateCw, Smartphone } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { botAdmin, type BotStatus } from '@/services/bot.admin.service';

export default function BotControlPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [paused, setPaused] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await botAdmin.status());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo contactar al bot');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresca el estado/QR mientras NO esté vinculado y no esté pausado.
  // A los 3 minutos se pausa solo (para no consultar eternamente) y aparece
  // "Conectar" para reanudar.
  useEffect(() => {
    if (paused || status?.loggedIn) return;
    const interval = setInterval(load, 5000);
    const timeout = setTimeout(() => setPaused(true), 3 * 60 * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [paused, status?.loggedIn, load]);

  function resume() {
    setPaused(false);
    load();
  }

  async function restart() {
    if (!confirm('¿Reiniciar el bot?')) return;
    setActing(true);
    try {
      await botAdmin.restart();
      showToast.success('Reinicio solicitado');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo reiniciar');
    } finally {
      setActing(false);
    }
  }

  async function logout() {
    if (!confirm('¿Cerrar sesión del bot? Vas a tener que escanear el QR de nuevo.')) return;
    setActing(true);
    try {
      await botAdmin.logout();
      showToast.success('Sesión cerrada. Escaneá el nuevo QR.');
      setTimeout(load, 2000);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cerrar sesión');
    } finally {
      setActing(false);
    }
  }

  const connected = status?.connected;
  const loggedIn = status?.loggedIn;

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-[#455a54] font-tan-nimbus'>Bot de WhatsApp</h1>
          <p className='text-sm text-[#455a54]/60 font-winter-solid mt-0.5'>
            Estado del bot, vinculación por QR y reconexión.
          </p>
        </div>
        <button
          type='button'
          onClick={resume}
          className='flex items-center gap-2 rounded-lg border border-[#e6dbcd] bg-white px-3 py-2 text-sm text-[#455a54]'
        >
          <RefreshCw className='h-4 w-4' /> Actualizar
        </button>
      </div>

      {error && (
        <div className='rounded-xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#b23b2e]'>
          {error}
        </div>
      )}

      <div className='grid gap-4 md:grid-cols-[1fr_320px]'>
        {/* Estado */}
        <div className='flex flex-col gap-4 rounded-xl border border-[#e6dbcd] bg-white p-5'>
          <div className='flex items-center gap-2'>
            <Smartphone className='h-5 w-5 text-[#9d684e]' />
            <h2 className='font-tan-nimbus text-lg font-bold text-[#455a54]'>Estado</h2>
          </div>
          {loading ? (
            <p className='text-sm text-[#455a54]/60'>Cargando…</p>
          ) : (
            <div className='flex flex-col gap-2 text-sm'>
              <Row label='Conexión' on={!!connected} onTxt='Conectado' offTxt='Desconectado' />
              <Row label='Vinculación' on={!!loggedIn} onTxt='Vinculado' offTxt='Sin vincular' />
            </div>
          )}
          <div className='mt-2 flex gap-2'>
            <button
              type='button'
              onClick={restart}
              disabled={acting}
              className='flex items-center gap-2 rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-4 py-2.5 text-sm text-[#455a54] disabled:opacity-60'
            >
              <RotateCw className='h-4 w-4' /> Reiniciar
            </button>
            <button
              type='button'
              onClick={logout}
              disabled={acting}
              className='flex items-center gap-2 rounded-lg border border-[#e6dbcd] px-4 py-2.5 text-sm text-[#b23b2e] disabled:opacity-60'
            >
              <LogOut className='h-4 w-4' /> Cerrar sesión
            </button>
          </div>
        </div>

        {/* QR */}
        <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-[#e6dbcd] bg-white p-5'>
          {loggedIn ? (
            <p className='flex items-center justify-center gap-2 text-center text-sm text-[#455a54]'>
              <CheckCircle2 className='h-4 w-4 text-[#455a54]' /> Bot vinculado. No hace falta escanear
              nada.
            </p>
          ) : paused ? (
            // Pausado tras 3 min: QR difuminado + botón para reanudar.
            <div className='relative flex h-56 w-56 items-center justify-center'>
              {status?.qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${status.qr}`}
                  alt=''
                  aria-hidden
                  className='h-56 w-56 select-none blur-md opacity-30'
                />
              )}
              <div className='absolute inset-0 flex flex-col items-center justify-center gap-3'>
                <p className='px-4 text-center text-xs text-[#455a54]/60'>
                  Pausamos la actualización. Tocá para volver a mostrar el QR.
                </p>
                <button
                  type='button'
                  onClick={resume}
                  className='flex items-center gap-2 rounded-lg bg-[#9d684e] px-5 py-2.5 font-mono text-xs tracking-wider text-white'
                >
                  <RefreshCw className='h-4 w-4' /> Conectar
                </button>
              </div>
            </div>
          ) : status?.qr ? (
            <>
              <p className='text-center text-sm text-[#455a54]/60'>
                Escaneá desde WhatsApp → Dispositivos vinculados
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${status.qr}`}
                alt='QR de vinculación del bot'
                className='h-56 w-56'
              />
            </>
          ) : (
            <p className='text-center text-sm text-[#455a54]/60'>
              Esperando el QR… (si no aparece, reiniciá el bot)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  on,
  onTxt,
  offTxt,
}: {
  label: string;
  on: boolean;
  onTxt: string;
  offTxt: string;
}) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-[#455a54]/60'>{label}</span>
      <span
        className='rounded-full px-2.5 py-1 text-xs font-medium'
        style={{
          backgroundColor: on ? '#E7F0EC' : '#f1ede6',
          color: on ? '#455a54' : '#7a6e6f',
        }}
      >
        {on ? onTxt : offTxt}
      </span>
    </div>
  );
}
