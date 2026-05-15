'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cashboxService, CashSession } from '@/services/cashbox.service';
import { showToast } from '@/lib/toast';

interface Props {
  session: CashSession | any | null;
  onOpenChange: (open: boolean) => void;
  onResolved: () => void;
}

export function ResolveAutoClosureDialog({ session, onOpenChange, onResolved }: Props) {
  const [countedCash, setCountedCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const open = session !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    if (countedCash === '' || isNaN(Number(countedCash)) || Number(countedCash) < 0) {
      showToast.error('Ingresa un monto válido');
      return;
    }

    setLoading(true);
    try {
      await cashboxService.resolveAutoClosure(session.id, {
        countedClosingCash: Number(countedCash),
        notes: notes.trim() || undefined,
      });
      showToast.success('Arqueo actualizado correctamente');
      onResolved();
      onOpenChange(false);
      // Reset
      setCountedCash('');
      setNotes('');
    } catch (error) {
      showToast.error('Ocurrió un error al resolver la caja');
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  const openedAt = new Date(session.openedAt).toLocaleString('es-AR');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" style={{ borderColor: 'var(--color-gris-claro)' }}>
        <DialogHeader>
          <DialogTitle className="font-tan-nimbus text-xl" style={{ color: 'var(--color-terracota)' }}>
            Arqueo Pendiente
          </DialogTitle>
          <DialogDescription className="font-winter-solid" style={{ color: 'var(--color-ciruela-oscuro)' }}>
            El sistema cerró automáticamente la sesión iniciada el {openedAt}.
            Ingresa el efectivo real con el que terminó la caja para cuadrarla.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="countedCash" style={{ color: 'var(--color-verde-profundo)' }}>Efectivo contado en caja ($)</Label>
            <Input
              id="countedCash"
              type="number"
              step="0.01"
              min="0"
              required
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              placeholder="Ej: 15000"
              className="font-mono text-lg"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" style={{ color: 'var(--color-verde-profundo)' }}>Notas adicionales (Opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre faltantes, sobrantes u observaciones..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              style={{ background: 'var(--color-terracota)', color: 'white' }}
            >
              {loading ? 'Guardando...' : 'Confirmar Arqueo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
