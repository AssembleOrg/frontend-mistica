'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Hourglass, Plus, RotateCcw, Send, Trash2 } from 'lucide-react';
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
  type TaskStatus,
} from '@/services/taller.admin.service';
import { usersAdmin, type TeamPerson } from '@/services/users.admin.service';
import { StatusBadge } from '../reservas/_shared';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ResponsableField, useResponsable } from '../responsable-field';
import { canManageRole } from '@/lib/views';

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
  // Admin o encargado/a: la gestión operativa.
  const canManage = canManageRole(user?.role);
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
      {tab === 'tareas' ? (
        <TareasTab canManage={canManage} />
      ) : (
        <ComprasTab canManage={canManage} />
      )}
    </div>
  );
}

// ───────────────────────── Tareas ─────────────────────────

function TareasTab({ canManage }: Readonly<{ canManage: boolean }>) {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [accounts, setAccounts] = useState<TeamPerson[]>([]);
  const [loading, setLoading] = useState(true);
  // Completadas: se ven las últimas; el resto, a pedido.
  const [showAllDone, setShowAllDone] = useState(false);
  // Filtro del admin por responsable: '' = todas, NONE = sin asignar.
  const [person, setPerson] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const confirm = useConfirm();
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ts, accs] = await Promise.all([
        tallerAdmin.listTasks(),
        // team() y no list(): /users/all es sólo para admin y al Encargado
        // le hacía fallar toda la carga de Tareas.
        canManage ? usersAdmin.team() : Promise.resolve([] as TeamPerson[]),
      ]);
      setTasks(ts);
      setAccounts(accs);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

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
        assigneeUserIds: assigneeIds.length ? assigneeIds : undefined,
        dueDate: dueDate || undefined,
      });
      setTitle('');
      setDescription('');
      setAssigneeIds([]);
      setDueDate('');
      await load();
      showToast.success('Tarea creada');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(t: StaffTask, status: TaskStatus) {
    // Se mueve de sección al instante; si falla, se recarga como estaba.
    const now = new Date().toISOString();
    setTasks((ts) =>
      ts.map((x) =>
        x._id === t._id
          ? {
              ...x,
              status,
              completedAt: status === 'DONE' ? now : undefined,
              startedAt: status === 'IN_PROGRESS' ? now : status === 'PENDING' ? undefined : x.startedAt,
            }
          : x,
      ),
    );
    try {
      await tallerAdmin.updateTask(t._id, { status });
      if (status === 'DONE') showToast.success(`"${t.title}" completada`);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
      await load();
    }
  }

  async function remove(t: StaffTask) {
    if (!(await confirm({ title: `¿Eliminar la tarea ${t.title}?`, description: 'Esta acción no se puede deshacer.' }))) return;
    try {
      await tallerAdmin.removeTask(t._id);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function addComment(t: StaffTask, body: string) {
    await tallerAdmin.addTaskComment(t._id, body);
    await load();
  }

  // Chips de responsables (admin): cada persona con tareas, con sus pendientes.
  const people = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; pending: number; done: number }>();
    let unassigned = 0;
    for (const t of tasks) {
      const list = assigneesOf(t);
      if (list.length === 0) unassigned += 1;
      for (const { userId, name } of list) {
        const c = counts.get(userId) ?? { id: userId, name, pending: 0, done: 0 };
        if (t.status === 'DONE') c.done += 1;
        else c.pending += 1;
        counts.set(userId, c);
      }
    }
    const rows = [...counts.values()].sort((x, y) =>
      x.name.localeCompare(y.name, 'es', { sensitivity: 'base' }),
    );
    return { rows, unassigned };
  }, [tasks]);

  const visible = !canManage || !person
    ? tasks
    : tasks.filter((t) => {
        const ids = assigneesOf(t).map((a) => a.userId);
        return person === NONE ? ids.length === 0 : ids.includes(person);
      });
  const inProgress = visible.filter((t) => t.status === 'IN_PROGRESS');
  const pending = visible.filter((t) => t.status === 'PENDING');
  const done = visible
    .filter((t) => t.status === 'DONE')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const DONE_PREVIEW = 5;
  const shownDone = showAllDone ? done : done.slice(0, DONE_PREVIEW);
  const personName =
    person === NONE ? 'Sin asignar' : people.rows.find((r) => r.id === person)?.name;

  return (
    <div className='flex flex-col gap-4'>
      {/* Alta rápida: las tareas las crea el admin. El resto ve las suyas. */}
      {!canManage && (
        <p className='text-sm text-[#7a6e6f]'>
          Tus tareas asignadas. Sumá tu progreso en cada una y marcala hecha
          cuando la termines.
        </p>
      )}
      {canManage && (
        <div className='flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
          {/* Mobile: campos apilados; desktop: una fila que envuelve. */}
          <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder='Nueva tarea (ej. "Hornear tanda de tazas")'
              className={`${fieldCls} h-9 min-w-56 sm:flex-1`}
            />
            <div className='flex max-h-24 min-h-9 flex-wrap items-center gap-1 overflow-y-auto rounded-md border border-[#e6dbcd] bg-[#fbf5ef] px-2 py-1'>
              {accounts.length === 0 ? <span className='text-xs text-[#7a6e6f]'>Sin responsables</span> : accounts.map((a) => {
                const selected = assigneeIds.includes(a.id);
                return <button key={a.id} type='button' onClick={() => setAssigneeIds((ids) => selected ? ids.filter((id) => id !== a.id) : [...ids, a.id])}
                  className={`rounded px-2 py-1 text-xs transition ${selected ? 'bg-[#455a54] text-white' : 'bg-white text-[#455a54] hover:bg-[#f3e9df]'}`}>
                  {a.name}
                </button>;
              })}
            </div>
            <div className='flex items-center gap-2'>
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
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={1}
            placeholder='Detalle (opcional)'
            className={fieldCls}
          />
        </div>
      )}

      {/* Filtro por responsable: tocar un nombre muestra sus tareas,
          pendientes y finalizadas, con sus observaciones. */}
      {canManage && !loading && (people.rows.length > 0 || people.unassigned > 0) && (
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='mr-1 text-xs font-medium text-[#7a6e6f]'>Ver tareas de</span>
          <PersonChip label='Todas' on={!person} onClick={() => setPerson('')} />
          {people.rows.map((r) => (
            <PersonChip
              key={r.id}
              label={r.name}
              count={r.pending}
              on={person === r.id}
              onClick={() => setPerson(person === r.id ? '' : r.id)}
            />
          ))}
          {people.unassigned > 0 && (
            <PersonChip
              label='Sin asignar'
              count={people.unassigned}
              on={person === NONE}
              onClick={() => setPerson(person === NONE ? '' : NONE)}
            />
          )}
        </div>
      )}

      {loading ? (
        <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
      ) : (
        <>
          {canManage && personName && (
            <p className='text-sm text-[#455a54]'>
              <strong>{personName}</strong>: {inProgress.length} en proceso · {pending.length} pendiente(s) · {done.length} completada(s)
            </p>
          )}
          {inProgress.length === 0 && pending.length === 0 && (
            <p className='rounded-2xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
              {!canManage
                ? 'No tenés tareas pendientes 🎉'
                : personName
                  ? `${personName} no tiene tareas pendientes 🎉`
                  : 'Sin tareas pendientes 🎉'}
            </p>
          )}
          <TaskSection title='En proceso' tone='#9d684e' tasks={inProgress} render={(t) => (
            <TaskRow key={t._id} task={t} onStatus={setStatus} onRemove={canManage ? remove : undefined} onComment={addComment} />
          )} />
          <TaskSection title='Pendientes' tone='#455a54' tasks={pending} render={(t) => (
            <TaskRow key={t._id} task={t} onStatus={setStatus} onRemove={canManage ? remove : undefined} onComment={addComment} />
          )} />
          <TaskSection title='Completadas' tone='#7a6e6f' tasks={shownDone} total={done.length} render={(t) => (
            <TaskRow key={t._id} task={t} onStatus={setStatus} onRemove={canManage ? remove : undefined} onComment={addComment} />
          )} />
          {done.length > DONE_PREVIEW && (
            <button
              type='button'
              onClick={() => setShowAllDone(!showAllDone)}
              className='w-fit text-[12px] font-medium text-[#7a6e6f] underline'
            >
              {showAllDone ? 'Ver sólo las últimas' : `Ver todas las completadas (${done.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const NONE = '__none__';

/** Una sección de la lista (En proceso / Pendientes / Completadas). */
function TaskSection({
  title,
  tone,
  tasks,
  total,
  render,
}: Readonly<{
  title: string;
  tone: string;
  tasks: StaffTask[];
  total?: number;
  render: (t: StaffTask) => React.ReactNode;
}>) {
  if (tasks.length === 0) return null;
  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-xs font-semibold uppercase tracking-wider' style={{ color: tone }}>
        {title} <span className='font-normal text-[#7a6e6f]'>({total ?? tasks.length})</span>
      </h3>
      {tasks.map(render)}
    </section>
  );
}

/** Responsables de una tarea (incluye el campo legacy de un solo responsable). */
function assigneesOf(t: StaffTask): { userId: string; name: string }[] {
  if (t.assignees?.length) return t.assignees;
  return t.assigneeName ? [{ userId: t.assigneeUserId ?? '', name: t.assigneeName }] : [];
}

function PersonChip({
  label,
  count,
  on,
  onClick,
}: Readonly<{ label: string; count?: number; on: boolean; onClick: () => void }>) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        on
          ? 'border-[#455a54] bg-[#455a54] text-white'
          : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
      }`}
    >
      {label}
      {count ? <span className={on ? 'ml-1 opacity-80' : 'ml-1 text-[#9d684e]'}>{count}</span> : null}
    </button>
  );
}

function TaskRow({
  task: t,
  onStatus,
  onRemove,
  onComment,
}: Readonly<{
  task: StaffTask;
  onStatus: (t: StaffTask, status: TaskStatus) => void;
  /** Sólo el admin borra tareas. */
  onRemove?: (t: StaffTask) => void;
  onComment: (t: StaffTask, body: string) => Promise<void>;
}>) {
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const overdue =
    t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < new Date();
  async function submitComment() {
    const body = comment.trim();
    if (!body || commenting) return;
    setCommenting(true);
    try {
      await onComment(t, body);
      setComment('');
      showToast.success('Actualización agregada');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo agregar el comentario');
    } finally {
      setCommenting(false);
    }
  }
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        t.status === 'DONE'
          ? 'border-[#e6dbcd] bg-[#fbf9f6]'
          : t.status === 'IN_PROGRESS'
            ? 'border-[#e2c4ad] bg-white'
            : overdue
              ? 'border-[#efb9b9] bg-white'
              : 'border-[#e6dbcd] bg-white'
      }`}
    >
      <div className='min-w-0 flex-1'>
        <p
          className={`text-sm font-medium ${
            t.status === 'DONE' ? 'text-[#7a6e6f] line-through' : 'text-[#3d3338]'
          }`}
        >
          {t.title}
        </p>
        {t.description && (
          <p className='text-sm text-[#7a6e6f]'>{t.description}</p>
        )}
        <div className='mt-1 flex flex-wrap items-center gap-1.5'>
          {assigneesOf(t).map((assignee) => (
            <StatusBadge key={assignee.userId} label={assignee.name} bg='#E7F0EC' fg='#455a54' />
          ))}
          {t.dueDate && (
            <StatusBadge
              label={`${overdue ? '⚠ ' : ''}límite ${fmtDate(t.dueDate)}`}
              bg={overdue ? '#fbe4e4' : '#f3e7db'}
              fg={overdue ? '#a33' : '#9d684e'}
            />
          )}
          {t.status === 'IN_PROGRESS' && (
            <StatusBadge
              label={`En proceso${t.startedAt ? ` desde ${fmtDate(t.startedAt)}` : ''}`}
              bg='#f6e9dc'
              fg='#9d684e'
            />
          )}
          {t.status === 'DONE' && t.completedAt && (
            <span className='text-[11px] text-[#7a6e6f]'>
              completada el {fmtDate(t.completedAt)}
            </span>
          )}
        </div>
        {/* Estado: En proceso (vuelve a pendiente si se toca de nuevo) y
            completada; una completada se puede reabrir. */}
        <div className='mt-2 flex flex-wrap gap-1.5'>
          {t.status === 'DONE' ? (
            <button
              type='button'
              onClick={() => onStatus(t, 'PENDING')}
              className='inline-flex items-center gap-1.5 rounded-lg border border-[#e6dbcd] bg-white px-2.5 py-1 text-xs font-medium text-[#7a6e6f] hover:bg-[#fbf5ef]'
            >
              <RotateCcw className='h-3.5 w-3.5' />
              Reabrir
            </button>
          ) : (
            <>
              <button
                type='button'
                onClick={() => onStatus(t, t.status === 'IN_PROGRESS' ? 'PENDING' : 'IN_PROGRESS')}
                aria-pressed={t.status === 'IN_PROGRESS'}
                title={t.status === 'IN_PROGRESS' ? 'Volver a pendiente' : 'Marcar en proceso'}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  t.status === 'IN_PROGRESS'
                    ? 'border-[#9d684e] bg-[#9d684e] text-white'
                    : 'border-[#e6dbcd] bg-white text-[#9d684e] hover:bg-[#fbf5ef]'
                }`}
              >
                <Hourglass className='h-3.5 w-3.5' />
                En proceso
              </button>
              <button
                type='button'
                onClick={() => onStatus(t, 'DONE')}
                className='inline-flex items-center gap-1.5 rounded-lg border border-[#455a54] bg-[#455a54] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#3a4c47]'
              >
                <CheckCircle2 className='h-3.5 w-3.5' />
                Tarea completada
              </button>
            </>
          )}
        </div>
        {(t.comments?.length ?? 0) > 0 && (
          <div className='mt-2 flex flex-col gap-1.5 border-l-2 border-[#e6dbcd] pl-2.5'>
            {t.comments!.map((entry) => (
              <div key={entry._id} className='text-[12px] text-[#455a54]'>
                <span className='font-semibold'>{entry.authorName}</span>
                <span className='text-[#7a6e6f]'> · {fmtDate(entry.createdAt)}</span>
                <p className='whitespace-pre-wrap text-[#3d3338]'>{entry.body}</p>
              </div>
            ))}
          </div>
        )}
        <div className='mt-2 flex items-end gap-1.5'>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={1}
            placeholder='Agregar progreso, necesidad u observación…'
            className={`${fieldCls} min-h-9 resize-none text-xs`}
          />
          <Button type='button' variant='outline' size='sm' onClick={submitComment} disabled={!comment.trim() || commenting} className='h-9 shrink-0 border-[#e6dbcd] px-2 text-[#455a54]'>
            <Send className='h-3.5 w-3.5' />
            <span className='sr-only'>Agregar comentario</span>
          </Button>
        </div>
      </div>
      {onRemove && (
        <button
          type='button'
          onClick={() => onRemove(t)}
          className='text-[#a33] hover:opacity-70'
          aria-label='Eliminar'
        >
          <Trash2 className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}

// ───────────────────────── Lista de compras ─────────────────────────

/** Quién pidió el ítem (la persona; si no, la cuenta que lo cargó). */
const requesterOf = (it: ShoppingItem) =>
  it.requestedByName || it.addedByName || 'Sin nombre';

/**
 * Lista de compras. Cada cuenta ve sólo lo que pidió (así no se mezcla lo de
 * cocina con lo del taller); el admin ve todo, separado por persona.
 */
function ComprasTab({ canManage }: Readonly<{ canManage: boolean }>) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [showBought, setShowBought] = useState(true);
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const responsable = useResponsable();
  // Admin: '' = todos (separados por persona); si no, sólo los de esa persona.
  const [person, setPerson] = useState('');

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
        ...(responsable.value.trim()
          ? { requestedBy: responsable.value.trim() }
          : {}),
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
    if (!(await confirm({ title: `¿Eliminar definitivamente ${it.name}?`, description: 'Se quitará también del historial de compras.' }))) return;
    try {
      await tallerAdmin.removeShoppingItem(it._id);
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  // Personas con algo pedido, con cuántos pendientes tiene cada una.
  const people = useMemo(() => {
    const count = new Map<string, number>();
    for (const it of items) {
      const who = requesterOf(it);
      count.set(who, (count.get(who) ?? 0) + (it.status === 'PENDING' ? 1 : 0));
    }
    return [...count.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);
  const shown = person ? items.filter((i) => requesterOf(i) === person) : items;
  const pending = shown.filter((i) => i.status === 'PENDING');
  const bought = shown.filter((i) => i.status === 'BOUGHT');
  // Vista general del admin: lo pendiente, separado por quién lo pidió.
  const pendingByPerson = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>();
    for (const it of pending) {
      const who = requesterOf(it);
      groups.set(who, [...(groups.get(who) ?? []), it]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pending]);
  // El nombre de quién pidió sólo aporta cuando se ven pedidos de varios.
  const showWho = canManage || responsable.shared;

  return (
    <div className='flex flex-col gap-4'>
      {!canManage && (
        <p className='text-[13px] text-[#7a6e6f]'>
          Ves lo que pediste desde esta cuenta.
        </p>
      )}
      {/* Carga rápida: pensada para usarse al vuelo durante la jornada */}
      <div className='flex flex-col gap-3 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
        <div className='flex flex-wrap items-center gap-2'>
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
        <ResponsableField
          value={responsable.value}
          onChange={responsable.onChange}
          label='¿Quién lo pide?'
        />
      </div>

      {canManage && people.length > 1 && (
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='mr-1 text-[12px] text-[#7a6e6f]'>Pedidos de</span>
          <PersonChip label='Todos' on={!person} onClick={() => setPerson('')} />
          {people.map(([who, n]) => (
            <PersonChip
              key={who}
              label={who}
              count={n}
              on={person === who}
              onClick={() => setPerson(person === who ? '' : who)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
      ) : (
        <>
          {pending.length === 0 && (
            <p className='rounded-2xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
              Nada pendiente de comprar.
            </p>
          )}
          {canManage && !person && pendingByPerson.length > 1 ? (
            pendingByPerson.map(([who, list]) => (
              <div key={who} className='flex flex-col gap-1.5'>
                <h3 className='text-[13px] font-semibold text-[#455a54]'>
                  {who} <span className='font-normal text-[#9d684e]'>· {list.length}</span>
                </h3>
                {list.map((it) => (
                  <ShoppingRow key={it._id} item={it} onToggle={toggle} onRemove={remove} />
                ))}
              </div>
            ))
          ) : (
            <div className='flex flex-col gap-1.5'>
              {pending.map((it) => (
                <ShoppingRow
                  key={it._id}
                  item={it}
                  showWho={showWho && !person}
                  onToggle={toggle}
                  onRemove={remove}
                />
              ))}
            </div>
          )}
          {bought.length > 0 && (
            <div className='flex items-center justify-between gap-2 border-t border-[#e6dbcd] pt-3'>
              <h3 className='text-sm font-semibold text-[#455a54]'>
                Resueltos ({bought.length})
              </h3>
              <button
                type='button'
                onClick={() => setShowBought(!showBought)}
                className='text-[12px] font-medium text-[#7a6e6f] underline'
              >
                {showBought ? 'Ocultar historial' : 'Ver historial'}
              </button>
            </div>
          )}
          {showBought &&
            bought.map((it) => (
              <ShoppingRow
                key={it._id}
                item={it}
                showWho={showWho && !person}
                onToggle={toggle}
                onRemove={remove}
              />
            ))}
        </>
      )}
    </div>
  );
}

function ShoppingRow({
  item: it,
  showWho = false,
  onToggle,
  onRemove,
}: Readonly<{
  item: ShoppingItem;
  /** Mostrar quién lo pidió (cuando se ven pedidos de varias personas). */
  showWho?: boolean;
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
        aria-label={it.status === 'BOUGHT' ? 'Volver a pendiente' : 'Mover a Resueltos'}
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
      <span className='shrink-0 text-right text-[11px] leading-tight text-[#7a6e6f]'>
        Pedido {fmtDate(it.createdAt)}
        {showWho && <span> · {requesterOf(it)}</span>}
        {it.status === 'BOUGHT' && it.boughtAt && (
          <span className='block'>Resuelto {fmtDate(it.boughtAt)}</span>
        )}
      </span>
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
