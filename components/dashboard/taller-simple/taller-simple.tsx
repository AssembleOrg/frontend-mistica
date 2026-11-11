'use client';

// Modo simple del taller (la cuenta que sólo tiene la vista Producción):
// pantalla completa, dos botones gigantes y nada más. Pedidos = las piezas
// del mes que pidieron los alumnos; Hice = lo que produjo hoy.

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Amphora, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { tallerAdmin, type MonthlyPieceRow } from '@/services/taller.admin.service';
import {
  kitchenProductionAdmin,
  type KitchenProductionItem,
} from '@/services/kitchen-production.admin.service';
import { Pedidos, pendingCount } from './pedidos';
import { Hice } from './hice';
import { todayAR } from './dates';

type Screen = 'home' | 'pedidos' | 'hice';

/** Sólo Producción y no es admin: entra directo al modo simple. */
export function isTallerSimple(role?: string, allowedViews?: string[]): boolean {
  return role !== 'admin' && allowedViews?.length === 1 && allowedViews[0] === 'produccion';
}

export function TallerSimple() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const [screen, setScreen] = useState<Screen>('home');
  const [rows, setRows] = useState<MonthlyPieceRow[] | null>(null);
  const [made, setMade] = useState<KitchenProductionItem[] | null>(null);
  // Errores de carga: se muestran como un aviso fijo dentro de cada pantalla
  // (nada de toasts, que se repiten y ella no los causó).
  const [rowsFailed, setRowsFailed] = useState(false);
  const [madeFailed, setMadeFailed] = useState(false);

  const loadRows = useCallback(async () => {
    try {
      setRows(await tallerAdmin.productionList(false));
      setRowsFailed(false);
    } catch {
      setRowsFailed(true);
      setRows((prev) => prev ?? []);
    }
  }, []);

  const loadMade = useCallback(async () => {
    const day = todayAR();
    try {
      setMade(await kitchenProductionAdmin.list(day, day, undefined, 'taller'));
      setMadeFailed(false);
    } catch {
      setMadeFailed(true);
      setMade((prev) => prev ?? []);
    }
  }, []);

  // Al cambiar de pantalla se refresca: la tablet puede quedar abierta todo el día.
  useEffect(() => {
    void loadRows();
    void loadMade();
  }, [screen, loadRows, loadMade]);

  // Y cuando vuelve a la pestaña / desbloquea la tablet.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void loadRows();
      void loadMade();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadRows, loadMade]);

  async function exit() {
    if (!(await confirm({ title: '¿Cerrar sesión?', description: 'Vas a salir de tu cuenta.', variant: 'normal', confirmLabel: 'Cerrar sesión' }))) return;
    await logout();
    router.push('/login');
  }

  const pending = rows ? pendingCount(rows) : null;
  const madeTotal = made?.reduce((n, m) => n + m.quantity, 0) ?? null;

  return (
    <div className='fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[#fbf5ef]'>
      <header className='flex items-center gap-3 px-4 py-3'>
        <div className='flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#9d684e]'>
          <Image
            src='/Logo-2-mistica.png'
            alt='MÍSTICA'
            width={36}
            height={36}
            className='object-contain'
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>
        <p className='min-w-0 flex-1 truncate text-xl font-bold text-[#4e4247]'>
          ¡Hola, {user?.name?.split(' ')[0]}!
        </p>
        <button
          type='button'
          onClick={() => void exit()}
          aria-label='Salir'
          className='flex size-12 items-center justify-center rounded-2xl bg-white text-[#7a6e6f] shadow-sm active:scale-95'
        >
          <LogOut className='size-6' />
        </button>
      </header>

      <main className='flex flex-1 flex-col px-4 pb-6'>
        {screen === 'home' && (
          <div className='grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2'>
            <BigButton
              color='bg-[#455a54]'
              icon={<ClipboardList className='size-20' strokeWidth={1.75} />}
              label='PEDIDOS'
              badge={pending}
              onClick={() => setScreen('pedidos')}
            />
            <BigButton
              color='bg-[#cc844a]'
              icon={<Amphora className='size-20' strokeWidth={1.75} />}
              label='HICE'
              badge={madeTotal}
              onClick={() => setScreen('hice')}
            />
          </div>
        )}
        {screen === 'pedidos' && (
          <Pedidos rows={rows} failed={rowsFailed} setRows={setRows} onBack={() => setScreen('home')} />
        )}
        {screen === 'hice' && (
          <Hice made={made} failed={madeFailed} reload={loadMade} onBack={() => setScreen('home')} />
        )}
      </main>
    </div>
  );
}

function BigButton({
  color,
  icon,
  label,
  badge,
  onClick,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  badge: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`${color} relative flex min-h-[38vh] flex-col items-center justify-center gap-4 rounded-[2rem] text-white shadow-lg transition-transform active:scale-[0.97]`}
    >
      {icon}
      <span className='text-3xl font-black tracking-wide'>{label}</span>
      {badge != null && badge > 0 && (
        <span className='absolute right-5 top-5 flex size-14 items-center justify-center rounded-full bg-white text-2xl font-black text-[#3d3338] shadow'>
          {badge}
        </span>
      )}
    </button>
  );
}
