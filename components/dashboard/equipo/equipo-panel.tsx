'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuthStore } from '@/stores/auth.store';
import {
  tallerAdmin,
  type ShoppingItem,
  type StaffTask,
} from '@/services/taller.admin.service';
import { usersAdmin, type Account } from '@/services/users.admin.service';
import { StatusBadge } from '../reservas/_shared';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

function fmtDate(d?: string) {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Tareas asignadas al personal + lista de compras, en dos pestañas. */
export function EquipoPanel() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<'tareas' | 'compras'>('tareas');
  const chip = (on: boolean) =>
    `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      on
        ? 'border-[#455a54] bg-[#455a54] text-white'
        : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
    }`;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex gap-2'>
        <button type='button' className={chip(tab === 'tareas')} onClick={() => setTab('tareas')}>
          Tareas
        </button>
        <button type='button' className={chip(tab === 'compras')} onClick={() => setTab('compras')}>
          Lista de compras
        </button>
      </div>
      {tab === 'tareas' ? <TareasTab isAdmin={isAdmin} /> : <ComprasTab />}
    </div>
  );
}

// ───────────────────────── Tareas ─────────────────────────

function TareasTab({ isAdmin }: Readonly<{ isAdmin: boolean }>) {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ts, accs] = await Promise.all([
        tallerAdmin.listTasks(),
        isAdmin ? usersAdmin.list() : Promise.resolve([] as Account[]),
      ]);
      setTasks(ts);
      setAccounts(accs);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!title.trim()) return showToast.error('Escribí qué hay que hacer');
    setCreating(true);
    try {
      await tallerAdmin.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeUserId: assignee || undefined,
        dueDate: dueDate || undefined,
      });
      setTitle('');
      setDescription('');
      setAssignee('');
      setDueDate('');
      await load();
      showToast.success('Tarea creada');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreating(false);
    }
  }

  async function toggle(t: StaffTask) {
    try {
      await tallerAdmin.updateTask(t._id, {
        status: t.status === 'DONE' ? 'PENDING' : 'DONE',
      });
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function remove(t: StaffTask) {
    if (!confirm(`¿Eliminar la tarea "${t.title}"?`)) return;
    try {
      await tallerAdmin.removeTask(t._id);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  const pending = tasks.filter((t) => t.status === 'PENDING');
  const done = tasks.filter((t) => t.status === 'DONE');

  return (
    <div className='flex flex-col gap-4'>
      {/* Alta rápida */}
      <div className='flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder='Nueva tarea (ej. "Hornear tanda de tazas")'
            className={`${fieldCls} h-9 min-w-56 flex-1`}
          />
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className={`${fieldCls} h-9 rounded-md border px-2 text-sm`}
          >
            <option value=''>Sin asignar</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.email}
              </option>
            ))}
          </select>
          <DatePicker value={dueDate} onChange={setDueDate} placeholder='Límite' clearable className='w-36' />
          <Button
            type='button'
            variant='verde'
            onClick={create}
            disabled={creating}
            className='gap-1.5'
          >
            <Plus className='h-4 w-4' />
            Crear
          </Button>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={1}
          placeholder='Detalle (opcional)'
          className={fieldCls}
        />
      </div>

      {loading ? (
        <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
      ) : (
        <>
          {pending.length === 0 && (
            <p className='rounded-2xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
              Sin tareas pendientes 🎉
            </p>
          )}
          <div className='flex flex-col gap-2'>
            {pending.map((t) => (
              <TaskRow key={t._id} task={t} onToggle={toggle} onRemove={remove} />
            ))}
          </div>
          {done.length > 0 && (
            <button
              type='button'
              onClick={() => setShowDone(!showDone)}
              className='w-fit text-[12px] font-medium text-[#7a6e6f] underline'
            >
              {showDone ? 'Ocultar' : 'Ver'} finalizadas ({done.length})
            </button>
          )}
          {showDone &&
            done.map((t) => (
              <TaskRow key={t._id} task={t} onToggle={toggle} onRemove={remove} />
            ))}
        </>
      )}
    </div>
  );
}

function TaskRow({
  task: t,
  onToggle,
  onRemove,
}: Readonly<{
  task: StaffTask;
  onToggle: (t: StaffTask) => void;
  onRemove: (t: StaffTask) => void;
}>) {
  const overdue =
    t.status === 'PENDING' && t.dueDate && new Date(t.dueDate) < new Date();
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border bg-white px-4 py-3 ${
        t.status === 'DONE'
          ? 'border-[#e6dbcd] opacity-60'
          : overdue
            ? 'border-[#efb9b9]'
            : 'border-[#e6dbcd]'
      }`}
    >
      <button
        type='button'
        onClick={() => onToggle(t)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          t.status === 'DONE'
            ? 'border-[#455a54] bg-[#455a54] text-white'
            : 'border-[#c9bfb0] bg-white hover:border-[#455a54]'
        }`}
        aria-label={t.status === 'DONE' ? 'Reabrir' : 'Marcar hecha'}
      >
        {t.status === 'DONE' && <Check className='h-3.5 w-3.5' />}
      </button>
      <div className='min-w-0 flex-1'>
        <p
          className={`text-sm font-medium text-[#3d3338] ${
            t.status === 'DONE' ? 'line-through' : ''
          }`}
        >
          {t.title}
        </p>
        {t.description && (
          <p className='text-sm text-[#7a6e6f]'>{t.description}</p>
        )}
        <div className='mt-1 flex flex-wrap items-center gap-1.5'>
          {t.assigneeName && (
            <StatusBadge label={t.assigneeName} bg='#E7F0EC' fg='#455a54' />
          )}
          {t.dueDate && (
            <StatusBadge
              label={`${overdue ? '⚠ ' : ''}límite ${fmtDate(t.dueDate)}`}
              bg={overdue ? '#fbe4e4' : '#f3e7db'}
              fg={overdue ? '#a33' : '#9d684e'}
            />
          )}
          {t.status === 'DONE' && t.completedAt && (
            <span className='text-[11px] text-[#7a6e6f]'>
              hecha el {fmtDate(t.completedAt)}
            </span>
          )}
        </div>
      </div>
      <button
        type='button'
        onClick={() => onRemove(t)}
        className='text-[#a33] hover:opacity-70'
        aria-label='Eliminar'
      >
        <Trash2 className='h-4 w-4' />
      </button>
    </div>
  );
}

// ───────────────────────── Lista de compras ─────────────────────────

function ComprasTab() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [showBought, setShowBought] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await tallerAdmin.listShopping());
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await tallerAdmin.addShoppingItem({
        name: name.trim(),
        quantity: qty.trim() || undefined,
      });
      setName('');
      setQty('');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreating(false);
    }
  }

  async function toggle(it: ShoppingItem) {
    try {
      await tallerAdmin.updateShoppingItem(it._id, {
        status: it.status === 'BOUGHT' ? 'PENDING' : 'BOUGHT',
      });
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function remove(it: ShoppingItem) {
    try {
      await tallerAdmin.removeShoppingItem(it._id);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  const pending = items.filter((i) => i.status === 'PENDING');
  const bought = items.filter((i) => i.status === 'BOUGHT');

  return (
    <div className='flex flex-col gap-4'>
      {/* Carga rápida: pensada para usarse al vuelo durante la jornada */}
      <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder='¿Qué hace falta? (ej. "Esmalte blanco")'
          className={`${fieldCls} h-9 min-w-56 flex-1`}
        />
        <Input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder='Cantidad (ej. 2 cajas)'
          className={`${fieldCls} h-9 w-40`}
        />
        <Button
          type='button'
          variant='verde'
          onClick={add}
          disabled={creating || !name.trim()}
          className='gap-1.5'
        >
          <Plus className='h-4 w-4' />
          Agregar
        </Button>
      </div>

      {loading ? (
        <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
      ) : (
        <>
          {pending.length === 0 && (
            <p className='rounded-2xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
              Nada pendiente de comprar.
            </p>
          )}
          <div className='flex flex-col gap-1.5'>
            {pending.map((it) => (
              <ShoppingRow key={it._id} item={it} onToggle={toggle} onRemove={remove} />
            ))}
          </div>
          {bought.length > 0 && (
            <button
              type='button'
              onClick={() => setShowBought(!showBought)}
              className='w-fit text-[12px] font-medium text-[#7a6e6f] underline'
            >
              {showBought ? 'Ocultar' : 'Ver'} ya compradas ({bought.length})
            </button>
          )}
          {showBought &&
            bought.map((it) => (
              <ShoppingRow key={it._id} item={it} onToggle={toggle} onRemove={remove} />
            ))}
        </>
      )}
    </div>
  );
}

function ShoppingRow({
  item: it,
  onToggle,
  onRemove,
}: Readonly<{
  item: ShoppingItem;
  onToggle: (i: ShoppingItem) => void;
  onRemove: (i: ShoppingItem) => void;
}>) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-[#e6dbcd] bg-white px-4 py-2.5 ${
        it.status === 'BOUGHT' ? 'opacity-60' : ''
      }`}
    >
      <button
        type='button'
        onClick={() => onToggle(it)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          it.status === 'BOUGHT'
            ? 'border-[#455a54] bg-[#455a54] text-white'
            : 'border-[#c9bfb0] bg-white hover:border-[#455a54]'
        }`}
        aria-label={it.status === 'BOUGHT' ? 'Volver a pendiente' : 'Marcar comprado'}
      >
        {it.status === 'BOUGHT' && <Check className='h-3.5 w-3.5' />}
      </button>
      <span
        className={`min-w-0 flex-1 text-sm text-[#3d3338] ${
          it.status === 'BOUGHT' ? 'line-through' : ''
        }`}
      >
        {it.name}
        {it.quantity && (
          <span className='text-[#7a6e6f]'> · {it.quantity}</span>
        )}
        {it.notes && <span className='text-[#7a6e6f]'> · {it.notes}</span>}
      </span>
      {it.addedByName && (
        <span className='hidden text-[11px] text-[#7a6e6f] sm:inline'>
          {it.addedByName}
        </span>
      )}
      <button
        type='button'
        onClick={() => onRemove(it)}
        className='text-[#a33] hover:opacity-70'
        aria-label='Eliminar'
      >
        <Trash2 className='h-4 w-4' />
      </button>
    </div>
  );
}
