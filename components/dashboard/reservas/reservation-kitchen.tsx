'use client';

// Ficha de la reserva: lo que cocina tiene que saber (restricciones, cumpleaños,
// nota y tortas) y los comprobantes que mandó el cliente por WhatsApp.

import { useEffect, useState } from 'react';
import { Cake, Eye, Paperclip, Pencil, Plus, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { fmtDateTime, fmtPrice } from '@/lib/reservas-format';
import { FREE_CAKE_MIN_PEOPLE, SYMBOLIC_CAKE_LABEL, cakeProductOf } from '@/lib/kitchen';
import { productsService } from '@/services/products.service';
import {
  reservationsAdmin,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import { DietaryPicker, DietaryTags } from './dietary-badge';

const field =
  'h-9 border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

/** Lo que devuelve el backend tras un cambio (para refrescar la ficha). */
export type ReservationPatch = Partial<
  Pick<
    ReservationItem,
    | 'dietaryTags'
    | 'dietaryNotes'
    | 'isBirthday'
    | 'kitchenNotes'
    | 'cakes'
    | 'transferReceipts'
    | 'balanceDue'
    | 'totalAmount'
    | 'extras'
    | 'quantity'
    | 'freeSpots'
    | 'tableCodes'
    | 'extraMinutes'
  >
>;

function patchOf(r: ReservationPatch): ReservationPatch {
  return {
    dietaryTags: r.dietaryTags,
    dietaryNotes: r.dietaryNotes,
    isBirthday: r.isBirthday,
    kitchenNotes: r.kitchenNotes,
    cakes: r.cakes,
    transferReceipts: r.transferReceipts,
    balanceDue: r.balanceDue,
    totalAmount: r.totalAmount,
    extras: r.extras,
  };
}

const errMsg = (e: unknown, fallback: string) =>
  (e as { message?: string })?.message ?? fallback;

// ───────────────────────────── Cocina ─────────────────────────────

/**
 * Restricciones, cumpleaños, nota para cocina y tortas. El admin lo edita; la
 * cuenta de cocina lo ve (sin precios).
 */
export function KitchenSection({
  reservation: r,
  canEdit,
  onChanged,
}: {
  reservation: ReservationItem;
  canEdit: boolean;
  onChanged: (patch: ReservationPatch) => void;
}) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const cakes = r.cakes ?? [];
  const hasInfo =
    (r.dietaryTags?.length ?? 0) > 0 ||
    !!r.dietaryNotes ||
    !!r.kitchenNotes ||
    !!r.isBirthday ||
    cakes.length > 0;
  // Cumple de 10 o más sin torta cargada: le corresponde la simbólica.
  const missingFreeCake =
    !!r.isBirthday && r.quantity >= FREE_CAKE_MIN_PEOPLE && cakes.length === 0;

  useEffect(() => {
    setEditing(false);
    setAdding(false);
  }, [r._id]);

  if (!hasInfo && !canEdit) return null;

  async function removeCake(cakeId: string, label: string, amount?: number) {
    const ok = await confirm({
      title: `Sacar "${label}"`,
      description:
        amount && amount > 0
          ? `Sale de la lista de cocina. Los ${fmtPrice(amount)} que se sumaron al total no se descuentan solos.`
          : 'Sale de la lista de cocina.',
      confirmLabel: 'Sacar',
    });
    if (!ok) return;
    setBusy(true);
    try {
      onChanged(patchOf(await reservationsAdmin.removeCake(r._id, cakeId)));
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo sacar la torta'));
    } finally {
      setBusy(false);
    }
  }

  async function addSymbolic() {
    setBusy(true);
    try {
      onChanged(
        patchOf(
          await reservationsAdmin.addCake(r._id, {
            label: SYMBOLIC_CAKE_LABEL,
            qty: 1,
            amount: 0,
          }),
        ),
      );
      showToast.success('Torta simbólica sumada para cocina');
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo sumar la torta'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-mono text-[11px] font-medium tracking-wider text-[#7a6e6f]'>
          COCINA
        </span>
        {canEdit && !editing && (
          <button
            type='button'
            onClick={() => setEditing(true)}
            className='inline-flex items-center gap-1 text-xs font-semibold text-[#9d684e] hover:underline'
          >
            <Pencil className='h-3 w-3' /> Editar
          </button>
        )}
      </div>

      {editing ? (
        <KitchenEditor
          reservation={r}
          onCancel={() => setEditing(false)}
          onSaved={(patch) => {
            setEditing(false);
            onChanged(patch);
          }}
        />
      ) : (
        <div className='flex flex-col gap-2 text-sm text-[#3d3338]'>
          {r.isBirthday && (
            <span className='inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f4ead9] px-2.5 py-1 text-xs font-semibold text-[#9d684e]'>
              🎂 Cumpleaños
            </span>
          )}
          <DietaryTags tags={r.dietaryTags} notes={r.dietaryNotes} />
          {r.kitchenNotes && (
            <p className='rounded-lg bg-[#fbf5ef] px-3 py-2 text-[13px]'>{r.kitchenNotes}</p>
          )}
          {!hasInfo && (
            <p className='text-[13px] text-[#7a6e6f]'>
              Sin restricciones ni notas para cocina.
            </p>
          )}
        </div>
      )}

      {/* Tortas */}
      {(cakes.length > 0 || canEdit) && (
        <div className='flex flex-col gap-1.5'>
          {cakes.map((c) => (
            <div
              key={c._id ?? c.label}
              className='flex items-center gap-2 rounded-lg border border-[#e6dbcd] bg-white px-3 py-2'
            >
              <Cake className='h-4 w-4 shrink-0 text-[#9d684e]' />
              <span className='min-w-0 flex-1 text-[13px] text-[#3d3338]'>
                {c.qty > 1 ? `${c.qty} × ` : ''}
                {c.label}
                {c.notes && <span className='text-[#7a6e6f]'> · {c.notes}</span>}
                <span className='ml-1.5 text-[11px] text-[#9d684e]'>
                  {c.free || !(c.amount && c.amount > 0)
                    ? 'de regalo'
                    : canEdit && c.amount
                      ? fmtPrice(c.amount * c.qty)
                      : ''}
                </span>
              </span>
              {canEdit && c._id && (
                <button
                  type='button'
                  disabled={busy}
                  onClick={() => void removeCake(c._id!, c.label, (c.amount ?? 0) * c.qty)}
                  aria-label={`Sacar ${c.label}`}
                  className='text-[#a33] hover:opacity-70 disabled:opacity-40'
                >
                  <X className='h-4 w-4' />
                </button>
              )}
            </div>
          ))}
          {canEdit && missingFreeCake && !adding && (
            <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e8b84b]/50 bg-[#fdf6e3] px-3 py-2 text-[13px] text-[#5b512f]'>
              <span>
                Cumple de {FREE_CAKE_MIN_PEOPLE} o más: le corresponde la torta
                simbólica de regalo.
              </span>
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={busy}
                onClick={() => void addSymbolic()}
                className='h-7 border-[#e8b84b] text-[#5b512f]'
              >
                Sumarla
              </Button>
            </div>
          )}
          {canEdit &&
            (adding ? (
              <CakeForm
                reservationId={r._id}
                onCancel={() => setAdding(false)}
                onSaved={(patch) => {
                  setAdding(false);
                  onChanged(patch);
                }}
              />
            ) : (
              <button
                type='button'
                onClick={() => setAdding(true)}
                className='inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-[#9d684e] hover:underline'
              >
                <Plus className='h-3.5 w-3.5' /> Sumar torta
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function KitchenEditor({
  reservation: r,
  onCancel,
  onSaved,
}: {
  reservation: ReservationItem;
  onCancel: () => void;
  onSaved: (patch: ReservationPatch) => void;
}) {
  const [tags, setTags] = useState<string[]>(r.dietaryTags ?? []);
  const [dietNotes, setDietNotes] = useState(r.dietaryNotes ?? '');
  const [isBirthday, setIsBirthday] = useState(!!r.isBirthday);
  const [kitchenNotes, setKitchenNotes] = useState(r.kitchenNotes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await reservationsAdmin.updateReservation(r._id, {
        dietaryTags: tags,
        dietaryNotes: dietNotes.trim(),
        isBirthday,
        kitchenNotes: kitchenNotes.trim(),
      });
      onSaved(patchOf(res));
      showToast.success('Datos para cocina guardados');
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='flex flex-col gap-2.5 rounded-xl border border-[#e6dbcd] bg-white p-3'>
      <DietaryPicker
        tags={tags}
        onTagsChange={setTags}
        notes={dietNotes}
        onNotesChange={setDietNotes}
      />
      <label className='flex items-center gap-2 text-[13px] text-[#455a54]'>
        <input
          type='checkbox'
          checked={isBirthday}
          onChange={(e) => setIsBirthday(e.target.checked)}
          className='size-4 accent-[#9d684e]'
        />
        Es un cumpleaños
      </label>
      <Input
        value={kitchenNotes}
        onChange={(e) => setKitchenNotes(e.target.value)}
        placeholder='Nota para cocina (cumpleañero, edad, sabor de la torta…)'
        maxLength={500}
        className={field}
      />
      <div className='flex justify-end gap-2'>
        <Button type='button' size='sm' variant='outline' onClick={onCancel} className='border-[#e6dbcd] text-[#455a54]'>
          Cancelar
        </Button>
        <Button type='button' size='sm' variant='verde' disabled={saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

type CakeOption = { key: string; label: string; amount: number };

/** Sumar una torta: la simbólica de regalo, una del catálogo u otra. */
function CakeForm({
  reservationId,
  onCancel,
  onSaved,
}: {
  reservationId: string;
  onCancel: () => void;
  onSaved: (patch: ReservationPatch) => void;
}) {
  const symbolic: CakeOption = { key: 'symbolic', label: SYMBOLIC_CAKE_LABEL, amount: 0 };
  const [options, setOptions] = useState<CakeOption[]>([symbolic]);
  const [pick, setPick] = useState<string>('symbolic');
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Las tortas del catálogo de productos (las que se venden aparte).
  useEffect(() => {
    let alive = true;
    productsService
      .getProducts(1, 20, { search: 'torta' })
      .then((res) => {
        const list = res.data?.data ?? [];
        if (!alive) return;
        setOptions([
          symbolic,
          ...list
            .filter((p) => p.name.trim().toLowerCase() !== SYMBOLIC_CAKE_LABEL.toLowerCase())
            .map((p) => ({
              key: p.id,
              label: cakeProductOf(p.barcode)?.kitchenLabel ?? p.name,
              amount: p.price ?? 0,
            })),
        ]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chosen = options.find((o) => o.key === pick);
  const isCustom = pick === 'custom';

  async function save() {
    const label = isCustom ? customLabel.trim() : chosen?.label;
    const amount = isCustom ? Number(customAmount || 0) : (chosen?.amount ?? 0);
    const n = Math.max(1, Math.round(Number(qty) || 1));
    if (!label) return showToast.error('Elegí o escribí qué torta');
    if (!(amount >= 0)) return showToast.error('Poné un precio válido');
    setSaving(true);
    try {
      const res = await reservationsAdmin.addCake(reservationId, {
        label,
        qty: n,
        amount,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onSaved(patchOf(res));
      showToast.success(
        amount > 0
          ? `Torta sumada · ${fmtPrice(amount * n)} al total de la reserva`
          : 'Torta sumada para cocina',
      );
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo sumar la torta'));
    } finally {
      setSaving(false);
    }
  }

  const chip = (on: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-xs font-semibold transition',
      on
        ? 'border-[#455a54] bg-[#455a54] text-white'
        : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
    );

  return (
    <div className='flex flex-col gap-2.5 rounded-xl border border-[#e6dbcd] bg-white p-3'>
      <div className='flex flex-wrap gap-1.5'>
        {options.map((o) => (
          <button key={o.key} type='button' className={chip(pick === o.key)} onClick={() => setPick(o.key)}>
            {o.label}
            <span className='ml-1 opacity-80'>{o.amount > 0 ? fmtPrice(o.amount) : 'regalo'}</span>
          </button>
        ))}
        <button type='button' className={chip(isCustom)} onClick={() => setPick('custom')}>
          Otra
        </button>
      </div>
      {isCustom && (
        <div className='flex gap-2'>
          <Input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder='Qué torta'
            maxLength={80}
            className={field}
          />
          <Input
            type='number'
            inputMode='decimal'
            min={0}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder='Precio (0 = regalo)'
            className={cn('w-40 shrink-0', field)}
          />
        </div>
      )}
      <div className='flex gap-2'>
        <Input
          type='number'
          inputMode='numeric'
          min={1}
          max={20}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          aria-label='Cantidad'
          className={cn('w-20 shrink-0', field)}
        />
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='Detalle (cobertura, sabor, nombre…)'
          maxLength={200}
          className={field}
        />
      </div>
      <div className='flex justify-end gap-2'>
        <Button type='button' size='sm' variant='outline' onClick={onCancel} className='border-[#e6dbcd] text-[#455a54]'>
          Cancelar
        </Button>
        <Button type='button' size='sm' variant='verde' disabled={saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Sumar'}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────── Comprobantes ───────────────────────────

/**
 * Comprobantes que mandó el cliente por WhatsApp para esta reserva (reservó en
 * el local y pagó después). Se miran y, si están bien, se cobra con ellos el
 * saldo por transferencia (queda en la reserva, no pasa por caja).
 */
export function ReceiptsSection({
  reservation: r,
  onChanged,
}: {
  reservation: ReservationItem;
  onChanged: (patch: ReservationPatch) => void;
}) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const receipts = [...(r.transferReceipts ?? [])].sort((a, b) =>
    a.status === 'PENDING' && b.status !== 'PENDING' ? -1 : 0,
  );
  if (receipts.length === 0) return null;

  async function view(key?: string) {
    if (!key) return showToast.error('La imagen no quedó guardada: está en la charla de WhatsApp');
    try {
      const url = await reservationsAdmin.receiptImageUrl(key);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo abrir el comprobante'));
    }
  }

  async function resolve(id: string, action: 'accept' | 'dismiss', amount?: number) {
    if (action === 'dismiss') {
      const ok = await confirm({
        title: 'Descartar comprobante',
        description: 'Queda marcado como revisado, sin cobrar nada.',
        confirmLabel: 'Descartar',
      });
      if (!ok) return;
    }
    setBusy(id);
    try {
      const res = await reservationsAdmin.resolveReceipt(r._id, id, {
        action,
        ...(amount ? { amount } : {}),
      });
      onChanged(patchOf(res));
      showToast.success(
        action === 'accept' ? `Cobrado ${fmtPrice(amount ?? 0)} por transferencia` : 'Comprobante descartado',
      );
    } catch (e) {
      showToast.error(errMsg(e, 'No se pudo registrar'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className='flex flex-col gap-2.5'>
      <span className='font-mono text-[11px] font-medium tracking-wider text-[#7a6e6f]'>
        COMPROBANTES DEL CLIENTE
      </span>
      {receipts.map((x) => {
        const id = x._id ?? '';
        const pending = x.status === 'PENDING';
        const suggested = Math.min(x.amountDetected ?? 0, r.balanceDue ?? Infinity);
        const value = amounts[id] ?? (suggested > 0 ? String(suggested) : '');
        return (
          <div
            key={id}
            className={cn(
              'flex flex-col gap-2 rounded-xl border p-3 text-[13px]',
              pending ? 'border-[#e8b84b]/60 bg-[#fdf6e3]' : 'border-[#e6dbcd] bg-white opacity-75',
            )}
          >
            <div className='flex items-start justify-between gap-2'>
              <span className='flex flex-col gap-0.5 text-[#3d3338]'>
                <span className='inline-flex items-center gap-1.5 font-semibold'>
                  <Paperclip className='h-3.5 w-3.5' />
                  {x.amountDetected != null ? fmtPrice(x.amountDetected) : 'Monto ilegible'}
                  {x.recipientOk === false && (
                    <span className='text-[11px] font-semibold text-[#a33]'>· destinatario no coincide</span>
                  )}
                </span>
                <span className='text-[11px] text-[#7a6e6f]'>
                  Llegó {x.createdAt ? fmtDateTime(x.createdAt) : ''}
                  {x.operationNumber ? ` · op ${x.operationNumber}` : ''}
                  {x.receiptDate ? ` · fecha ${x.receiptDate}` : ''}
                </span>
                {!pending && (
                  <span className='text-[11px] font-semibold text-[#455a54]'>
                    {x.status === 'ACCEPTED'
                      ? `Cobrado ${fmtPrice(x.acceptedAmount ?? 0)}`
                      : 'Descartado'}
                  </span>
                )}
              </span>
              <button
                type='button'
                onClick={() => void view(x.imageKey)}
                className='inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#9d684e] hover:underline'
              >
                <Eye className='h-3.5 w-3.5' /> Ver
              </button>
            </div>
            {pending && (
              <div className='flex flex-wrap items-center gap-2'>
                <Input
                  type='number'
                  inputMode='decimal'
                  min={0}
                  value={value}
                  onChange={(e) => setAmounts({ ...amounts, [id]: e.target.value })}
                  aria-label='Monto a cobrar'
                  className={cn('w-32', field)}
                />
                <Button
                  type='button'
                  size='sm'
                  variant='verde'
                  disabled={busy === id || !(Number(value) > 0)}
                  onClick={() => void resolve(id, 'accept', Number(value))}
                >
                  Cobrar por transferencia
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={busy === id}
                  onClick={() => void resolve(id, 'dismiss')}
                  className='border-[#e6dbcd] text-[#7a6e6f]'
                >
                  Descartar
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
