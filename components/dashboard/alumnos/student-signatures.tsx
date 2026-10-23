'use client';

import { useEffect, useState } from 'react';
import { PenLine, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import {
  tallerAdmin,
  type SignatureSearchResult,
} from '@/services/taller.admin.service';
import { PIECE_STATUS_LABEL, type PieceStatus } from '@/services/pieces.admin.service';
import { StatusBadge } from '../reservas/_shared';
import { fieldCls } from './monthly-piece';
import { errorText } from '@/lib/api-error-messages';

/** Firma para comparar: sin mayúsculas, tildes, espacios ni signos (igual que el backend). */
export function signatureKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** ¿Alguna firma del alumno coincide con lo buscado? */
export function matchesSignature(signatures: string[] | undefined, query: string): boolean {
  const k = signatureKey(query);
  if (k.length < 2) return false;
  return (signatures ?? []).some((s) => {
    const x = signatureKey(s);
    return x.includes(k) || k.includes(x);
  });
}

/**
 * Cómo firma sus piezas el alumno. La primera es la habitual; se pueden sumar
 * variantes. Se guarda al toque (lo pueden cargar también los profes).
 */
export function SignaturesEditor({
  studentId,
  initial,
  onSaved,
}: Readonly<{
  studentId: string;
  initial: string[];
  onSaved?: (signatures: string[]) => void;
}>) {
  const [list, setList] = useState(initial);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(next: string[]) {
    setSaving(true);
    try {
      const res = await tallerAdmin.setSignatures(studentId, next);
      setList(res.signatures);
      onSaved?.(res.signatures);
      return true;
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo guardar la firma'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    const s = draft.trim();
    if (!s) return;
    if (list.some((x) => signatureKey(x) === signatureKey(s))) {
      setDraft('');
      return;
    }
    if (await save([...list, s])) setDraft('');
  }

  return (
    <div className='flex flex-col gap-1.5 rounded-xl border border-[#e6dbcd] bg-white p-3'>
      <span className='flex items-center gap-1.5 text-sm font-semibold text-[#455a54]'>
        <PenLine className='h-3.5 w-3.5' />
        Firma en sus piezas
      </span>
      {list.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {list.map((s, i) => (
            <span
              key={s}
              className='inline-flex items-center gap-1 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] py-0.5 pl-2.5 pr-1 text-[13px] text-[#3d3338]'
            >
              {s}
              {i === 0 && list.length > 1 && (
                <span className='text-[11px] text-[#7a6e6f]'>(habitual)</span>
              )}
              <button
                type='button'
                onClick={() => void save(list.filter((x) => x !== s))}
                disabled={saving}
                aria-label={`Quitar firma ${s}`}
                className='inline-flex size-5 items-center justify-center rounded-full text-[#9d684e] hover:bg-[#f3e9df]'
              >
                <X className='h-3 w-3' />
              </button>
            </span>
          ))}
        </div>
      )}
      <form
        className='flex gap-2'
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={list.length ? 'Otra forma en que firma…' : 'Cómo firma (p. ej. EMA)'}
          maxLength={60}
          className={`${fieldCls} h-8`}
        />
        <button
          type='submit'
          disabled={saving || !draft.trim()}
          className='shrink-0 rounded-md border border-[#455a54] px-3 text-[12px] font-semibold text-[#455a54] hover:bg-[#fbf5ef] disabled:opacity-40'
        >
          Agregar
        </button>
      </form>
    </div>
  );
}

/**
 * Debajo del buscador de alumnos: las piezas registradas con esa firma, para
 * identificar una pieza suelta del taller. Los alumnos con esa firma ya
 * aparecen en la lista.
 */
export function SignaturePiecesHint({ query }: Readonly<{ query: string }>) {
  const [result, setResult] = useState<SignatureSearchResult | null>(null);
  const k = signatureKey(query);

  useEffect(() => {
    if (k.length < 2) {
      setResult(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      tallerAdmin
        .searchSignature(query)
        .then((r) => alive && setResult(r))
        .catch(() => alive && setResult(null));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [k, query]);

  if (!result || result.pieces.length === 0) return null;
  return (
    <details className='rounded-2xl border border-[#e6dbcd] bg-white text-[13px] text-[#455a54]'>
      <summary className='cursor-pointer px-4 py-2.5 font-semibold'>
        ✍ {result.pieces.length === 30 ? 'Más de 30' : result.pieces.length} pieza(s) registrada(s) con
        firma parecida a «{query.trim()}»
      </summary>
      <div className='flex flex-col divide-y divide-[#efe6dc] border-t border-[#efe6dc]'>
        {result.pieces.map((p) => (
          <div key={p._id} className='flex flex-wrap items-center gap-2 px-4 py-2'>
            <span className='font-semibold'>«{p.signature}»</span>
            <span>{p.studentName || p.personName || p.customerName || 'Sin nombre'}</span>
            {p.pieceType && <span className='text-[#7a6e6f]'>· {p.pieceType}</span>}
            {p.reservationCode && <span className='text-[#7a6e6f]'>· {p.reservationCode}</span>}
            <span className='ml-auto'>
              <StatusBadge
                label={PIECE_STATUS_LABEL[p.status as PieceStatus] ?? p.status}
                bg='#f3e7db'
                fg='#9d684e'
              />
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
