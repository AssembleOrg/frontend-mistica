'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeyRound, ShieldCheck, Info } from 'lucide-react';
import { settingsService } from '@/services/settings.service';
import { showToast } from '@/lib/toast';

/**
 * Configuración del PIN para borrar egresos.
 *
 * Contexto: la caja se opera con una sola cuenta admin compartida. Para que no
 * cualquiera con acceso pueda borrar un egreso ya consolidado, el borrado exige
 * un PIN que sólo conoce el dueño. Este panel permite configurarlo, cambiarlo o
 * resetearlo — siempre confirmando la contraseña del admin (secreto raíz que el
 * cajero no tiene). Por eso el mismo flujo sirve de recuperación si se olvida.
 */
export function SecuritySettings() {
  const [isSet, setIsSet] = useState<boolean | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsService
      .getCashDeletePinStatus()
      .then((res) => {
        if (!cancelled) setIsSet(!!res.data?.isSet);
      })
      .catch(() => {
        if (!cancelled) setIsSet(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pinValid = /^\d{4,6}$/.test(newPin);
  const pinsMatch = newPin === confirmPin;
  const canSave =
    adminPassword.length > 0 && pinValid && pinsMatch && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await settingsService.setCashDeletePin(adminPassword, newPin);
      showToast.success(
        isSet ? 'PIN actualizado' : 'PIN configurado correctamente',
      );
      setIsSet(true);
      setAdminPassword('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            'No se pudo guardar el PIN';
      showToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='space-y-5'>
      <div className='flex items-start gap-3'>
        <div className='rounded-md bg-[#9d684e]/10 p-2 text-[#9d684e]'>
          <KeyRound className='h-5 w-5' />
        </div>
        <div className='flex-1 space-y-1'>
          <div className='flex items-center gap-2'>
            <h3 className='text-sm font-winter-solid font-medium text-[#455a54]'>
              PIN para borrar egresos
            </h3>
            {isSet !== null &&
              (isSet ? (
                <Badge className='bg-[#455a54] text-white hover:bg-[#455a54]'>
                  <ShieldCheck className='mr-1 h-3 w-3' /> Configurado
                </Badge>
              ) : (
                <Badge variant='outline' className='border-[#9d684e]/40 text-[#9d684e]'>
                  Sin configurar
                </Badge>
              ))}
          </div>
          <p className='text-xs text-[#455a54]/70 font-winter-solid'>
            Borrar un egreso de una caja cerrada pedirá este PIN. Así, aunque la
            caja se opere con la cuenta compartida, sólo quien lo conozca puede
            corregir errores.
          </p>
        </div>
      </div>

      <div className='rounded-md border border-[#9d684e]/20 bg-[#efcbb9]/15 p-3'>
        <p className='flex items-start gap-2 text-xs text-[#455a54]/80'>
          <Info className='mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#9d684e]' />
          <span>
            Para {isSet ? 'cambiar' : 'configurar'} el PIN confirmá la contraseña
            del admin. Si alguna vez olvidás el PIN, entrá acá y ponés uno nuevo
            con la contraseña — no hace falta recordar el anterior.
          </span>
        </p>
      </div>

      <div className='max-w-sm space-y-3'>
        <div className='space-y-1'>
          <Label className='text-xs'>Contraseña del admin *</Label>
          <Input
            type='password'
            autoComplete='current-password'
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder='Tu contraseña de acceso'
            disabled={saving}
          />
        </div>

        <div className='space-y-1'>
          <Label className='text-xs'>
            {isSet ? 'Nuevo PIN' : 'PIN'} (4 a 6 dígitos) *
          </Label>
          <Input
            type='password'
            inputMode='numeric'
            autoComplete='off'
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder='Ej: 4821'
            disabled={saving}
          />
          {newPin.length > 0 && !pinValid && (
            <p className='text-[11px] text-red-600'>
              El PIN debe tener entre 4 y 6 dígitos.
            </p>
          )}
        </div>

        <div className='space-y-1'>
          <Label className='text-xs'>Repetir PIN *</Label>
          <Input
            type='password'
            inputMode='numeric'
            autoComplete='off'
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder='Repetí el PIN'
            disabled={saving}
          />
          {confirmPin.length > 0 && !pinsMatch && (
            <p className='text-[11px] text-red-600'>Los PIN no coinciden.</p>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={!canSave}
          className='w-full bg-[#9d684e] text-white hover:bg-[#9d684e]/90 sm:w-auto'
        >
          {saving ? 'Guardando…' : isSet ? 'Cambiar PIN' : 'Configurar PIN'}
        </Button>
      </div>
    </div>
  );
}
