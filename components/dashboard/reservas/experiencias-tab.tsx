'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { fmtPrice } from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type AdminExperience,
  type CreateExperienceInput,
} from '@/services/reservations.admin.service';

const EMPTY: CreateExperienceInput = {
  name: '',
  description: '',
  durationMinutes: 120,
  basePrice: 0,
  defaultCapacity: 8,
  depositPct: 50,
  isActive: true,
};

export function ExperienciasTab() {
  const [items, setItems] = useState<AdminExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminExperience | null>(null);
  const [form, setForm] = useState<CreateExperienceInput | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await reservationsAdmin.listExperiences(true));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
  }
  function openEdit(e: AdminExperience) {
    setEditing(e);
    setForm({
      name: e.name,
      description: e.description ?? '',
      durationMinutes: e.durationMinutes,
      basePrice: e.basePrice,
      defaultCapacity: e.defaultCapacity,
      depositPct: e.depositPct ?? 50,
      isActive: e.isActive,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      showToast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await reservationsAdmin.updateExperience(editing._id, form);
        showToast.success('Experiencia actualizada');
      } else {
        await reservationsAdmin.createExperience(form);
        showToast.success('Experiencia creada');
      }
      setForm(null);
      setEditing(null);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: AdminExperience) {
    if (!confirm(`¿Dar de baja "${e.name}"?`)) return;
    try {
      await reservationsAdmin.deleteExperience(e._id);
      showToast.success('Experiencia dada de baja');
      await load();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-end'>
        <button
          type='button'
          onClick={openNew}
          className='flex items-center gap-2 rounded-lg bg-[#9d684e] px-4 py-2.5 font-mono text-xs tracking-wider text-white'
        >
          <Plus className='h-4 w-4' /> NUEVA EXPERIENCIA
        </button>
      </div>

      <div className='overflow-hidden rounded-xl border border-[#e6dbcd] bg-white'>
        <div className='grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 border-b border-[#e6dbcd] bg-[#fbf5ef] px-5 py-3 font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
          <span>EXPERIENCIA</span>
          <span>DURACIÓN</span>
          <span>PRECIO</span>
          <span>CUPO DEF.</span>
          <span className='text-right'>ESTADO</span>
        </div>
        {loading ? (
          <div className='p-6 text-sm text-[#7a6e6f]'>Cargando…</div>
        ) : items.length === 0 ? (
          <div className='p-6 text-sm text-[#7a6e6f]'>
            No hay experiencias. Creá la primera.
          </div>
        ) : (
          items.map((e) => (
            <div
              key={e._id}
              className='grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2 border-b border-[#e6dbcd] px-5 py-4 last:border-0'
            >
              <div>
                <p className='font-playfair text-base text-[#3d3338]'>
                  {e.name}
                </p>
                {e.description && (
                  <p className='line-clamp-1 text-xs text-[#7a6e6f]'>
                    {e.description}
                  </p>
                )}
              </div>
              <span className='text-sm text-[#3d3338]'>
                {e.durationMinutes} min
              </span>
              <span className='text-sm text-[#3d3338]'>
                {fmtPrice(e.basePrice)}
              </span>
              <span className='text-sm text-[#3d3338]'>{e.defaultCapacity}</span>
              <div className='flex items-center justify-end gap-3'>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    e.isActive
                      ? 'bg-[#E7F0EC] text-[#455a54]'
                      : 'bg-[#f1ede6] text-[#7a6e6f]'
                  }`}
                >
                  {e.isActive ? 'Activa' : 'Pausada'}
                </span>
                <button type='button' onClick={() => openEdit(e)}>
                  <Pencil className='h-4 w-4 text-[#7a6e6f] hover:text-[#3d3338]' />
                </button>
                <button type='button' onClick={() => remove(e)}>
                  <Trash2 className='h-4 w-4 text-[#7a6e6f] hover:text-[#b23b2e]' />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {form && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-md rounded-xl bg-white p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='font-playfair text-xl text-[#3d3338]'>
                {editing ? 'Editar experiencia' : 'Nueva experiencia'}
              </h2>
              <button type='button' onClick={() => setForm(null)}>
                <X className='h-5 w-5 text-[#7a6e6f]' />
              </button>
            </div>
            <div className='flex flex-col gap-3'>
              <Field label='Nombre'>
                <input
                  value={form.name}
                  onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label='Descripción'>
                <textarea
                  value={form.description}
                  onChange={(ev) =>
                    setForm({ ...form, description: ev.target.value })
                  }
                  rows={2}
                  className={inputCls}
                />
              </Field>
              <div className='grid grid-cols-3 gap-3'>
                <Field label='Duración (min)'>
                  <input
                    type='number'
                    value={form.durationMinutes}
                    onChange={(ev) =>
                      setForm({
                        ...form,
                        durationMinutes: Number(ev.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label='Precio p/p'>
                  <input
                    type='number'
                    value={form.basePrice}
                    onChange={(ev) =>
                      setForm({ ...form, basePrice: Number(ev.target.value) })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label='Cupo def.'>
                  <input
                    type='number'
                    value={form.defaultCapacity}
                    onChange={(ev) =>
                      setForm({
                        ...form,
                        defaultCapacity: Number(ev.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label='Seña % (lo que se cobra al reservar)'>
                <input
                  type='number'
                  min={0}
                  max={100}
                  value={form.depositPct ?? 50}
                  onChange={(ev) =>
                    setForm({ ...form, depositPct: Number(ev.target.value) })
                  }
                  className={inputCls}
                />
              </Field>
              <label className='flex items-center gap-2 text-sm text-[#3d3338]'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={(ev) =>
                    setForm({ ...form, isActive: ev.target.checked })
                  }
                />
                Activa (visible al público)
              </label>
            </div>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setForm(null)}
                className='rounded-lg border border-[#e6dbcd] px-4 py-2.5 text-sm text-[#3d3338]'
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={save}
                disabled={saving}
                className='rounded-lg bg-[#9d684e] px-4 py-2.5 text-sm text-white disabled:opacity-60'
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-2.5 text-sm text-[#3d3338] outline-none focus:border-[#9d684e]';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className='flex flex-col gap-1.5'>
      <span className='font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}
