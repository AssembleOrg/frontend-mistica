'use client';

// Profesores del taller: CRUD + creación de su cuenta de acceso en un paso.
//
// Cada pieza se asigna a un profesor (ver pestaña Piezas de Reservas). Desde
// acá se le puede crear la cuenta de acceso al panel con la vista de Piezas
// como única habilitada; después, desde Cuentas, el admin puede sumarle o
// quitarle pestañas una por una.

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Dices,
  GraduationCap,
  KeyRound,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  professorsAdmin,
  type Professor,
} from '@/services/professors.admin.service';
import {
  generatePassword,
  usersAdmin,
} from '@/services/users.admin.service';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

interface FormState {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const EMPTY: FormState = { name: '', phone: '', email: '', notes: '' };

export function ProfessorsPanel() {
  const [items, setItems] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  /** Profesor al que se le está creando la cuenta de acceso. */
  const [accountFor, setAccountFor] = useState<Professor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await professorsAdmin.list());
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar profesores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form) return;
    if (form.name.trim().length < 2) return showToast.error('Poné el nombre');
    setSaving(true);
    try {
      const base = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await professorsAdmin.update(editing.id, base);
        showToast.success('Profesor actualizado');
      } else {
        await professorsAdmin.create(base);
        showToast.success('Profesor creado');
      }
      setForm(null);
      setEditing(null);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(prof: Professor) {
    if (!window.confirm(`¿Eliminar al profesor ${prof.name}? Su cuenta de acceso (si tiene) no se borra: manejala desde Cuentas.`)) {
      return;
    }
    try {
      await professorsAdmin.remove(prof.id);
      showToast.success('Profesor eliminado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  return (
    <section className='overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white'>
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-[#e6dbcd] bg-[#fbf5ef] px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <GraduationCap className='h-4 w-4 text-[#9d684e]' />
          <h3 className='font-tan-nimbus text-lg font-semibold text-[#455a54]'>
            Profesores del taller
          </h3>
          {loading && <span className='text-xs text-[#7a6e6f]'>cargando…</span>}
        </div>
        <Button
          type='button'
          variant='verde'
          size='sm'
          onClick={() => {
            setEditing(null);
            setForm({ ...EMPTY });
          }}
          className='gap-1.5'
        >
          <Plus className='h-3.5 w-3.5' />
          Nuevo profesor
        </Button>
      </header>

      <div className='flex flex-col divide-y divide-[#e6dbcd]'>
        {!loading && items.length === 0 && (
          <p className='py-8 text-center text-sm text-[#7a6e6f]'>Sin profesores.</p>
        )}
        {items.map((p) => (
          <div key={p.id} className='flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-[#9d684e] text-sm font-bold text-white'>
              {p.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className='min-w-0 flex-1'>
              <span className='block truncate text-sm font-semibold text-[#3d3338]'>
                {p.name}
                {!p.active && (
                  <span className='ml-2 text-xs font-normal text-[#a99f92]'>(inactivo)</span>
                )}
              </span>
              <span className='block truncate text-sm text-[#7a6e6f]'>
                {[p.phone, p.email].filter(Boolean).join(' · ') || 'sin contacto'}
              </span>
            </div>

            {p.accountEmail ? (
              <span className='inline-flex items-center gap-1 rounded-full bg-[#E7F0EC] px-2.5 py-1 text-xs font-semibold text-[#455a54]'>
                <KeyRound className='h-3 w-3' />
                {p.accountEmail}
              </span>
            ) : (
              <button
                type='button'
                onClick={() => setAccountFor(p)}
                className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#9d684e]/40 bg-[#f4ead9] px-2.5 py-1 text-sm font-medium text-[#9d684e] hover:bg-[#f0dfc6]'
              >
                <KeyRound className='h-3 w-3' />
                Crear cuenta de acceso
              </button>
            )}

            <span className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={() => {
                  setEditing(p);
                  setForm({
                    name: p.name,
                    phone: p.phone ?? '',
                    email: p.email ?? '',
                    notes: p.notes ?? '',
                  });
                }}
                className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-1 text-sm font-medium text-[#455a54] hover:bg-[#fbf5ef]'
              >
                <Pencil className='h-3 w-3' />
                Editar
              </button>
              <button
                type='button'
                onClick={() => remove(p)}
                className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-1 text-sm font-medium text-[#a33] hover:bg-[#f6e2e2]'
              >
                <Trash2 className='h-3 w-3' />
              </button>
            </span>
          </div>
        ))}
      </div>

      {form && (
        <div className='border-t-2 border-[#9d684e]/40 bg-[#fbf5ef] px-4 py-4'>
          <div className='mb-3 flex items-center justify-between'>
            <h4 className='text-sm font-semibold text-[#455a54]'>
              {editing ? `Editar profesor — ${editing.name}` : 'Nuevo profesor'}
            </h4>
            <button
              type='button'
              onClick={() => {
                setForm(null);
                setEditing(null);
              }}
              className='text-[#7a6e6f] hover:text-[#3d3338]'
              aria-label='Cerrar'
            >
              <X className='h-4 w-4' />
            </button>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label className='text-sm text-[#455a54]'>Nombre y apellido</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={fieldCls}
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-sm text-[#455a54]'>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder='Opcional'
                className={fieldCls}
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-sm text-[#455a54]'>Email de contacto</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder='Opcional'
                className={fieldCls}
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-sm text-[#455a54]'>Notas</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder='Opcional'
                className={fieldCls}
              />
            </div>
          </div>
          <div className='mt-3 flex items-center gap-2'>
            <Button type='button' variant='verde' size='sm' disabled={saving} onClick={save}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear profesor'}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={saving}
              onClick={() => {
                setForm(null);
                setEditing(null);
              }}
              className='border-[#e6dbcd] text-[#7a6e6f]'
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {accountFor && (
        <AccountForProfessor
          professor={accountFor}
          onDone={async () => {
            setAccountFor(null);
            await load();
          }}
          onCancel={() => setAccountFor(null)}
        />
      )}

      <p className='border-t border-[#e6dbcd] bg-[#fbf5ef] px-4 py-2.5 text-sm text-[#7a6e6f]'>
        Las piezas se asignan a un profesor desde la pestaña Piezas de Reservas.
        La cuenta de acceso se crea con <strong>sólo la pestaña Piezas</strong>{' '}
        habilitada; podés sumarle o quitarle vistas desde Cuentas.
      </p>
    </section>
  );
}

/** Alta de la cuenta de acceso del profesor: email + contraseña, vista Piezas. */
function AccountForProfessor({
  professor,
  onDone,
  onCancel,
}: {
  professor: Professor;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(professor.email ?? '');
  const [password, setPassword] = useState(() => generatePassword());
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return showToast.error('Email inválido');
    if (password.length < 6)
      return showToast.error('La contraseña necesita al menos 6 caracteres');
    setSaving(true);
    try {
      const account = await usersAdmin.create({
        name: professor.name,
        email: email.trim().toLowerCase(),
        password,
        role: 'user',
        // Única vista habilitada: la pestaña Piezas de Reservas. El admin
        // puede activarle más pestañas después, desde Cuentas.
        allowedViews: ['reservas:piezas'],
      });
      await professorsAdmin.update(professor.id, { userId: account.id });
      showToast.success(
        `Cuenta creada para ${professor.name}. Copiá la contraseña y pasásela.`,
      );
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo crear la cuenta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='border-t-2 border-[#9d684e]/40 bg-[#fbf5ef] px-4 py-4'>
      <div className='mb-3 flex items-center justify-between'>
        <h4 className='text-sm font-semibold text-[#455a54]'>
          Cuenta de acceso para {professor.name}
        </h4>
        <button
          type='button'
          onClick={onCancel}
          className='text-[#7a6e6f] hover:text-[#3d3338]'
          aria-label='Cerrar'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='space-y-1.5'>
          <Label className='text-sm text-[#455a54]'>Email (usuario)</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode='email'
            className={cn('w-64', fieldCls)}
          />
        </div>
        <div className='space-y-1.5'>
          <Label className='text-sm text-[#455a54]'>Contraseña</Label>
          <Input
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setCopied(false);
            }}
            className={cn('w-44 font-mono', fieldCls)}
          />
        </div>
        <button
          type='button'
          onClick={() => {
            setPassword(generatePassword());
            setCopied(false);
          }}
          className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-2 text-sm font-medium text-[#455a54] hover:bg-[#f3e9df]'
        >
          <Dices className='h-3.5 w-3.5' />
          Generar
        </button>
        <button
          type='button'
          onClick={() => {
            void navigator.clipboard?.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-2 text-sm font-medium text-[#455a54] hover:bg-[#f3e9df]'
        >
          {copied ? <Check className='h-3.5 w-3.5' /> : <Copy className='h-3.5 w-3.5' />}
          {copied ? 'Copiada' : 'Copiar'}
        </button>
      </div>
      <p className='mt-2 text-sm text-[#7a6e6f]'>
        Se crea como cuenta común con <strong>sólo la pestaña Piezas</strong> de
        Reservas habilitada.
      </p>
      <div className='mt-3 flex items-center gap-2'>
        <Button type='button' variant='verde' size='sm' disabled={saving} onClick={create}>
          {saving ? 'Creando…' : 'Crear cuenta'}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={saving}
          onClick={onCancel}
          className='border-[#e6dbcd] text-[#7a6e6f]'
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
