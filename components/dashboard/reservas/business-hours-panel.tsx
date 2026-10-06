'use client';

// Horario del salón: desde qué hora y hasta qué hora se toman reservas. Lo
// usan el alta de reservas, la web y el bot. Para ofrecer una actividad en una
// franja nueva (p. ej. a la mañana) además hace falta un turno en esa franja.

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { setBusinessHoursCache } from '@/hooks/useBusinessHours';
import { tablesAdmin } from '@/services/tables.admin.service';
import { canManageRole } from '@/lib/views';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

export function BusinessHoursPanel({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  // Admin o encargado/a: la gestión operativa.
  const canManage = canManageRole(user?.role);
  const [saved, setSaved] = useState<{ open: string; close: string } | null>(null);
  const [open, setOpen] = useState('');
  const [close, setClose] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    tablesAdmin
      .businessHours()
      .then((h) => {
        setSaved(h);
        setOpen(h.open);
        setClose(h.close);
      })
      .catch(() => {});
  }, []);

  const dirty = !!saved && (open !== saved.open || close !== saved.close);

  async function save() {
    if (!open || !close) return showToast.error('Completá apertura y cierre');
    if (close <= open) return showToast.error('El cierre tiene que ser después de la apertura');
    setBusy(true);
    try {
      const res = await tablesAdmin.setBusinessHours({ open, close });
      setSaved({ open: res.open, close: res.close });
      setBusinessHoursCache({ open: res.open, close: res.close });
      showToast.success(`Horario del salón: ${res.open} a ${res.close}`);
      if (res.outsideShifts.length) {
        showToast.error(
          `Quedan fuera del horario y no se ofrecen: ${res.outsideShifts.join(', ')}. Ajustalos en Turnos del día.`,
        );
      }
      onSaved?.();
    } catch (e) {
      showToast.error((e as { message?: string })?.message ?? 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  if (!saved) return null;

  return (
    <div className='flex flex-col gap-3 rounded-2xl border border-[#e6dbcd] bg-white p-5'>
      <div className='flex flex-col gap-1'>
        <h3 className='flex items-center gap-2 font-tan-nimbus text-lg font-semibold text-[#455a54]'>
          <Clock className='h-4 w-4' />
          Horario del salón
        </h3>
        <p className='max-w-2xl text-[13px] leading-relaxed text-[#7a6e6f]'>
          Desde qué hora y hasta qué hora se toman reservas (panel, web y bot).
          Para ofrecer actividades en una franja nueva, por ejemplo a la mañana,
          además armá un turno para esa franja en Turnos del día, eligiendo qué
          experiencias van.
        </p>
      </div>
      {canManage ? (
        <div className='flex flex-wrap items-end gap-3'>
          <label className='flex flex-col gap-1 text-[13px] font-medium text-[#455a54]'>
            Abre
            <Input
              type='time'
              step={300}
              value={open}
              onChange={(e) => setOpen(e.target.value)}
              className={`h-9 w-28 ${fieldCls}`}
            />
          </label>
          <label className='flex flex-col gap-1 text-[13px] font-medium text-[#455a54]'>
            Cierra
            <Input
              type='time'
              step={300}
              value={close}
              onChange={(e) => setClose(e.target.value)}
              className={`h-9 w-28 ${fieldCls}`}
            />
          </label>
          <Button
            type='button'
            variant='verde'
            disabled={!dirty || busy}
            onClick={() => void save()}
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      ) : (
        <p className='text-sm text-[#455a54]'>
          De {saved.open} a {saved.close}.
        </p>
      )}
    </div>
  );
}
