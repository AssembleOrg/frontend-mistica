'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Info } from 'lucide-react';
import { egressesService } from '@/services/egresses.service';
import { settingsService } from '@/services/settings.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { showToast } from '@/lib/toast';

interface Props {
  /** Id del egreso a borrar. null = diálogo cerrado. */
  egressId: string | null;
  /** Descripción del egreso (para mostrar qué se está borrando). */
  egressDescription?: string;
  /** Monto del egreso (opcional, sólo display). */
  egressAmount?: number;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

type AuthMethod = 'pin' | 'password';

/**
 * Modal para borrar un egreso de una caja CERRADA (corrección de un error, ej.
 * un pago cargado dos veces). Con cuenta admin compartida, el borrado es
 * sensible: exige el PIN del dueño o, como respaldo si lo olvidó, la contraseña
 * del admin. El cajero no tiene ninguno de los dos. El motivo es obligatorio y
 * queda auditado; el backend recalcula la caja cerrada afectada.
 */
export function DeleteEgressDialog({
  egressId,
  egressDescription,
  egressAmount,
  onOpenChange,
  onDeleted,
}: Props) {
  const open = egressId !== null;

  const [reason, setReason] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('pin');
  const [pin, setPin] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // null = todavía consultando el estado del PIN. Si es false, no hay PIN
  // configurado y sólo sirve la contraseña del admin.
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);

  // Al abrir: limpiar el form (no arrastrar secretos) y consultar si hay PIN
  // configurado. Si no lo hay, arrancamos ya en "Contraseña admin" para no
  // dejar al usuario tildado en una opción que no va a funcionar.
  useEffect(() => {
    if (!egressId) {
      setReason('');
      setAuthMethod('pin');
      setPin('');
      setAdminPassword('');
      setSubmitting(false);
      setPinConfigured(null);
      return;
    }
    let cancelled = false;
    settingsService
      .getCashDeletePinStatus()
      .then((res) => {
        if (cancelled) return;
        const isSet = !!res.data?.isSet;
        setPinConfigured(isSet);
        if (!isSet) setAuthMethod('password');
      })
      .catch(() => {
        if (!cancelled) setPinConfigured(null);
      });
    return () => {
      cancelled = true;
    };
  }, [egressId]);

  async function handleSubmit() {
    if (!egressId || submitting) return;

    // Validación con feedback explícito (antes el botón quedaba deshabilitado
    // sin decir por qué, y parecía "roto").
    if (reason.trim().length < 3) {
      showToast.error('Ingresá un motivo (mínimo 3 caracteres)');
      return;
    }
    if (authMethod === 'pin') {
      if (pinConfigured === false) {
        showToast.error(
          'No hay un PIN configurado. Usá la contraseña del admin, o configuralo en Configuración → Seguridad.',
        );
        return;
      }
      if (!/^\d{4,6}$/.test(pin)) {
        showToast.error('El PIN debe tener entre 4 y 6 dígitos');
        return;
      }
    } else if (adminPassword.length === 0) {
      showToast.error('Ingresá la contraseña del admin');
      return;
    }

    setSubmitting(true);
    try {
      await egressesService.deleteEgress(egressId, {
        reason: reason.trim(),
        pin: authMethod === 'pin' ? pin : undefined,
        adminPassword: authMethod === 'password' ? adminPassword : undefined,
      });
      showToast.success('Egreso eliminado');
      onDeleted?.();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            'No se pudo eliminar el egreso';
      showToast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-red-700'>
            <AlertTriangle className='h-5 w-5' />
            Eliminar egreso
          </DialogTitle>
          <DialogDescription>
            Esta acción borra el egreso y recalcula la caja. Queda registrada en
            la auditoría con tu motivo.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2'>
          {(egressDescription || egressAmount !== undefined) && (
            <div className='rounded-md border border-[#9d684e]/20 bg-[#efcbb9]/20 px-3 py-2 text-sm'>
              {egressDescription && (
                <p className='truncate text-[#455a54]' title={egressDescription}>
                  {egressDescription}
                </p>
              )}
              {egressAmount !== undefined && (
                <p className='font-semibold text-red-700'>
                  -{formatCurrency(egressAmount)}
                </p>
              )}
            </div>
          )}

          {pinConfigured === false && (
            <div className='flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800'>
              <Info className='mt-0.5 h-3.5 w-3.5 flex-shrink-0' />
              <span>
                No hay un PIN configurado. Podés eliminar con la contraseña del
                admin, o configurar un PIN en Configuración → Seguridad.
              </span>
            </div>
          )}

          <div className='space-y-1'>
            <Label className='text-xs'>Motivo *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder='Ej: Duplicado — pago EDESUR cargado dos veces'
              disabled={submitting}
            />
          </div>

          {/* Selector de autorización: PIN (habitual) o contraseña (respaldo). */}
          <div className='space-y-1'>
            <Label className='text-xs'>Autorización *</Label>
            <div className='flex gap-1'>
              <button
                type='button'
                onClick={() => setAuthMethod('pin')}
                disabled={submitting || pinConfigured === false}
                title={
                  pinConfigured === false
                    ? 'No hay un PIN configurado'
                    : undefined
                }
                className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-winter-solid transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  authMethod === 'pin'
                    ? 'border-[#9d684e] bg-[#9d684e] text-white'
                    : 'border-[#9d684e]/20 bg-white text-[#455a54] hover:bg-[#efcbb9]/30'
                }`}
              >
                PIN
              </button>
              <button
                type='button'
                onClick={() => setAuthMethod('password')}
                disabled={submitting}
                className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-winter-solid transition ${
                  authMethod === 'password'
                    ? 'border-[#9d684e] bg-[#9d684e] text-white'
                    : 'border-[#9d684e]/20 bg-white text-[#455a54] hover:bg-[#efcbb9]/30'
                }`}
              >
                Contraseña admin
              </button>
            </div>
          </div>

          {authMethod === 'pin' ? (
            <div className='space-y-1'>
              <Input
                type='password'
                inputMode='numeric'
                autoComplete='off'
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder='PIN de 4 a 6 dígitos'
                disabled={submitting}
              />
              <p className='text-[11px] text-[#455a54]/60'>
                ¿Olvidaste el PIN? Usá la contraseña del admin y despues
                reseteálo desde Configuración → Seguridad.
              </p>
            </div>
          ) : (
            <div className='space-y-1'>
              <Input
                type='password'
                autoComplete='off'
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder='Contraseña de la cuenta admin'
                disabled={submitting}
              />
            </div>
          )}
        </div>

        <DialogFooter className='flex-col-reverse sm:flex-row gap-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className='w-full sm:w-auto'
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className='w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto'
          >
            {submitting ? 'Eliminando…' : 'Eliminar egreso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
