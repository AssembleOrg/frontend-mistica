'use client';

// Cuentas del sistema: crear, resetear contraseñas, cambiar roles y elegir
// qué vistas del panel ve cada una.
//
// Reglas de acceso (ver lib/views.ts): los admin ven todo; una cuenta común
// sin whitelist ve las vistas estándar; con whitelist, SOLO esas vistas. El
// sidebar esconde los links y ViewGuard bloquea la URL directa.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Dices,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { ASSIGNABLE_VIEWS, RESERVAS_TABS } from '@/lib/views';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import {
  generatePassword,
  usersAdmin,
  type Account,
  type AccountRole,
} from '@/services/users.admin.service';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

/** Etiqueta legible de una clave de vista (incluye las granulares). */
function viewLabel(key: string): string {
  if (key.startsWith('reservas:')) {
    const tab = RESERVAS_TABS.find((t) => t.key === key.slice('reservas:'.length));
    return tab ? `Reservas · ${tab.label}` : key;
  }
  return ASSIGNABLE_VIEWS.find((v) => v.key === key)?.label ?? key;
}

interface FormState {
  name: string;
  email: string;
  role: AccountRole;
  allowedViews: string[];
  /** Vacía = no tocar la contraseña (en edición). */
  password: string;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  role: 'user',
  allowedViews: [],
  password: '',
};

export function AccountsPanel() {
  const { user: me } = useAuth();
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await usersAdmin.list());
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar las cuentas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          (a.role === 'admin' ? 0 : 1) - (b.role === 'admin' ? 0 : 1) ||
          a.name.localeCompare(b.name),
      ),
    [items],
  );

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, password: generatePassword() });
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      email: account.email,
      role: account.role,
      allowedViews: account.allowedViews ?? [],
      password: '',
    });
  }

  async function save() {
    if (!form) return;
    if (form.name.trim().length < 2) return showToast.error('Poné el nombre');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return showToast.error('Email inválido');
    if (!editing && form.password.length < 6)
      return showToast.error('La contraseña necesita al menos 6 caracteres');
    if (editing && form.password && form.password.length < 6)
      return showToast.error('La contraseña nueva necesita al menos 6 caracteres');

    // No dejamos que un admin se baje de rol a sí mismo: se quedaría afuera
    // de esta misma pantalla.
    if (editing && me && editing.id === me.id && form.role !== 'admin') {
      return showToast.error('No podés quitarte el rol admin a vos mismo.');
    }

    setSaving(true);
    try {
      const base = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        // La whitelist sólo aplica a cuentas comunes; a un admin se le limpia.
        allowedViews: form.role === 'admin' ? [] : form.allowedViews,
      };
      if (editing) {
        await usersAdmin.update(editing.id, {
          ...base,
          ...(form.password ? { password: form.password } : {}),
        });
        showToast.success(
          form.password
            ? 'Cuenta actualizada y contraseña reseteada'
            : 'Cuenta actualizada',
        );
      } else {
        await usersAdmin.create({ ...base, password: form.password });
        showToast.success('Cuenta creada');
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

  async function remove(account: Account) {
    if (me && account.id === me.id) {
      return showToast.error('No podés eliminar tu propia cuenta.');
    }
    if (!window.confirm(`¿Eliminar la cuenta de ${account.name} (${account.email})?`)) {
      return;
    }
    try {
      await usersAdmin.remove(account.id);
      showToast.success('Cuenta eliminada');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  return (
    <section className='overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white'>
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-[#e6dbcd] bg-[#fbf5ef] px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <KeyRound className='h-4 w-4 text-[#9d684e]' />
          <h3 className='font-tan-nimbus text-lg font-semibold text-[#455a54]'>
            Cuentas del sistema
          </h3>
          {loading && <span className='text-xs text-[#7a6e6f]'>cargando…</span>}
        </div>
        <Button type='button' variant='verde' size='sm' onClick={openNew} className='gap-1.5'>
          <Plus className='h-3.5 w-3.5' />
          Nueva cuenta
        </Button>
      </header>

      <div className='flex flex-col divide-y divide-[#e6dbcd]'>
        {!loading && sorted.length === 0 && (
          <p className='py-8 text-center text-sm text-[#7a6e6f]'>Sin cuentas.</p>
        )}
        {sorted.map((a) => (
          <AccountRow
            key={a.id}
            account={a}
            isMe={me?.id === a.id}
            onEdit={() => openEdit(a)}
            onRemove={() => remove(a)}
          />
        ))}
      </div>

      {form && (
        <AccountEditor
          form={form}
          setForm={setForm}
          editing={editing}
          saving={saving}
          onSave={save}
          onCancel={() => {
            setForm(null);
            setEditing(null);
          }}
        />
      )}

      <p className='border-t border-[#e6dbcd] bg-[#fbf5ef] px-4 py-2.5 text-[12px] text-[#7a6e6f]'>
        Los <strong>admin</strong> ven todas las vistas. Una cuenta común sin
        vistas elegidas ve las estándar (Dashboard, Ventas, Clientes, Reservas,
        Productos); si le marcás vistas, ve <strong>sólo esas</strong>. Al
        resetear una contraseña, copiala y pasásela: no se puede volver a ver.
      </p>
    </section>
  );
}

// ─────────────────────────────── fila ───────────────────────────────

function AccountRow({
  account,
  isMe,
  onEdit,
  onRemove,
}: {
  account: Account;
  isMe: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const admin = account.role === 'admin';
  const views = account.allowedViews ?? [];
  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3'>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
          admin ? 'bg-[#455a54]' : 'bg-[#9d684e]',
        )}
      >
        {account.name.trim().charAt(0).toUpperCase() || '?'}
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='truncate text-sm font-semibold text-[#3d3338]'>
            {account.name}
          </span>
          {isMe && (
            <span className='rounded-full bg-[#E7F0EC] px-2 py-0.5 text-[10px] font-semibold text-[#455a54]'>
              vos
            </span>
          )}
        </div>
        <span className='block truncate text-[13px] text-[#7a6e6f]'>{account.email}</span>
      </div>

      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
          admin ? 'bg-[#455a54] text-white' : 'bg-[#f4ead9] text-[#9d684e]',
        )}
      >
        {admin ? <ShieldCheck className='h-3 w-3' /> : <UserIcon className='h-3 w-3' />}
        {admin ? 'Admin' : 'Empleado'}
      </span>

      <span className='flex max-w-[22rem] flex-wrap items-center gap-1'>
        {admin ? (
          <span className='text-[11px] text-[#a99f92]'>todas las vistas</span>
        ) : views.length === 0 ? (
          <span className='text-[11px] text-[#a99f92]'>vistas estándar</span>
        ) : (
          views.map((v) => (
            <span
              key={v}
              className='rounded border border-[#e6dbcd] bg-[#fbf5ef] px-1.5 py-0.5 text-[10px] font-semibold text-[#455a54]'
            >
              {viewLabel(v)}
            </span>
          ))
        )}
      </span>

      <span className='flex items-center gap-1.5'>
        <button
          type='button'
          onClick={onEdit}
          className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-1 text-[12px] font-medium text-[#455a54] hover:bg-[#fbf5ef]'
        >
          <Pencil className='h-3 w-3' />
          Editar
        </button>
        <button
          type='button'
          onClick={onRemove}
          disabled={isMe}
          title={isMe ? 'No podés eliminar tu propia cuenta' : 'Eliminar cuenta'}
          className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-1 text-[12px] font-medium text-[#a33] hover:bg-[#f6e2e2] disabled:cursor-not-allowed disabled:opacity-40'
        >
          <Trash2 className='h-3 w-3' />
        </button>
      </span>
    </div>
  );
}

// ─────────────────────────────── editor ───────────────────────────────

function AccountEditor({
  form,
  setForm,
  editing,
  saving,
  onSave,
  onCancel,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  editing: Account | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = form.role === 'user';

  function toggleView(key: string) {
    setForm({
      ...form,
      allowedViews: form.allowedViews.includes(key)
        ? form.allowedViews.filter((v) => v !== key)
        : [...form.allowedViews, key],
    });
  }

  function regen() {
    setForm({ ...form, password: generatePassword() });
    setCopied(false);
  }

  function copy() {
    void navigator.clipboard?.writeText(form.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className='border-t-2 border-[#9d684e]/40 bg-[#fbf5ef] px-4 py-4'>
      <div className='mb-3 flex items-center justify-between'>
        <h4 className='text-sm font-semibold text-[#455a54]'>
          {editing ? `Editar cuenta — ${editing.name}` : 'Nueva cuenta'}
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

      <div className='flex flex-col gap-4'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label className='text-[13px] text-[#455a54]'>Nombre y apellido</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={fieldCls}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-[13px] text-[#455a54]'>Email (usuario de acceso)</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              inputMode='email'
              className={fieldCls}
            />
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label className='text-[13px] text-[#455a54]'>Rol</Label>
          <div className='flex gap-1.5'>
            {(
              [
                { key: 'user', label: 'Empleado', icon: UserIcon },
                { key: 'admin', label: 'Admin (ve todo)', icon: ShieldCheck },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const on = form.role === key;
              return (
                <button
                  key={key}
                  type='button'
                  onClick={() => setForm({ ...form, role: key })}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                    on
                      ? 'border-[#455a54] bg-[#455a54] text-white'
                      : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#f3e9df]',
                  )}
                >
                  <Icon className='h-3.5 w-3.5' />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {isUser && (
          <div className='space-y-1.5'>
            <Label className='text-[13px] text-[#455a54]'>
              Vistas que puede ver
              <span className='ml-2 font-normal text-[#7a6e6f]'>
                {form.allowedViews.length === 0
                  ? 'sin marcar = las estándar'
                  : `sólo estas ${form.allowedViews.length}`}
              </span>
            </Label>
            <div className='flex flex-wrap gap-1.5'>
              {ASSIGNABLE_VIEWS.filter((v) => v.key !== 'reservas').map((v) => {
                const on = form.allowedViews.includes(v.key);
                return (
                  <button
                    key={v.key}
                    type='button'
                    onClick={() => toggleView(v.key)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                      on
                        ? 'border-[#9d684e] bg-[#9d684e] text-white'
                        : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#f3e9df]',
                    )}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>

            {/* Reservas se habilita entera o pestaña por pestaña (ej. un
                profesor con SOLO Piezas). */}
            <div className='mt-2 rounded-xl border border-[#e6dbcd] bg-white p-2.5'>
              <p className='mb-1.5 text-[12px] font-medium text-[#7a6e6f]'>
                Reservas — entera o por pestaña
              </p>
              <div className='flex flex-wrap gap-1.5'>
                <button
                  type='button'
                  onClick={() =>
                    setForm({
                      ...form,
                      allowedViews: form.allowedViews.includes('reservas')
                        ? form.allowedViews.filter((v) => v !== 'reservas')
                        : [
                            ...form.allowedViews.filter(
                              (v) => !v.startsWith('reservas:'),
                            ),
                            'reservas',
                          ],
                    })
                  }
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                    form.allowedViews.includes('reservas')
                      ? 'border-[#455a54] bg-[#455a54] text-white'
                      : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#f3e9df]',
                  )}
                >
                  Reservas (todo)
                </button>
                {RESERVAS_TABS.map((t) => {
                  const key = `reservas:${t.key}`;
                  const full = form.allowedViews.includes('reservas');
                  const on = full || form.allowedViews.includes(key);
                  return (
                    <button
                      key={key}
                      type='button'
                      disabled={full}
                      onClick={() =>
                        setForm({
                          ...form,
                          allowedViews: form.allowedViews.includes(key)
                            ? form.allowedViews.filter((v) => v !== key)
                            : [...form.allowedViews, key],
                        })
                      }
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-60',
                        on
                          ? 'border-[#9d684e] bg-[#9d684e] text-white'
                          : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#f3e9df]',
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className='space-y-1.5'>
          <Label className='text-[13px] text-[#455a54]'>
            {editing ? 'Resetear contraseña (opcional)' : 'Contraseña'}
          </Label>
          <div className='flex flex-wrap items-center gap-2'>
            <Input
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                setCopied(false);
              }}
              placeholder={editing ? 'Dejar vacío para no cambiarla' : ''}
              className={cn('w-56 font-mono', fieldCls)}
            />
            <button
              type='button'
              onClick={regen}
              title='Generar una contraseña aleatoria'
              className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-2 text-[12px] font-medium text-[#455a54] hover:bg-[#f3e9df]'
            >
              <Dices className='h-3.5 w-3.5' />
              Generar
            </button>
            <button
              type='button'
              onClick={copy}
              disabled={!form.password}
              title='Copiar para pasársela a la persona'
              className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-2.5 py-2 text-[12px] font-medium text-[#455a54] hover:bg-[#f3e9df] disabled:opacity-40'
            >
              {copied ? (
                <Check className='h-3.5 w-3.5 text-[#455a54]' />
              ) : (
                <Copy className='h-3.5 w-3.5' />
              )}
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          </div>
          {editing && form.password && (
            <p className='text-[12px] font-medium text-[#9d684e]'>
              Al guardar, la cuenta pasa a usar esta contraseña nueva.
            </p>
          )}
        </div>

        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='verde'
            size='sm'
            disabled={saving}
            onClick={onSave}
            className='gap-1.5'
          >
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cuenta'}
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
    </div>
  );
}
