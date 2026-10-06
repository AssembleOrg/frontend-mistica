'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarPlus, ChevronLeft, ChevronRight, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth.store';
import {
  tallerAdmin,
  WEEKDAY_SHORT,
  type AttendanceStatus,
  type CreateGroupInput,
  type Group,
  type Student,
  type TrialClass,
} from '@/services/taller.admin.service';
import {
  professorsAdmin,
  type Professor,
} from '@/services/professors.admin.service';
import { ClientsService, type Client } from '@/services/clients.service';
import {
  QuickCreateSelect,
  professorFields,
} from '@/components/ui/quick-create-select';
import { IconBtn, StatusBadge } from '../reservas/_shared';
import { canManageRole } from '@/lib/views';
import {
  EnrollTrialDialog,
  GroupTrials,
  ScheduleTrialDialog,
  todayAR,
  useCancelTrial,
} from './trial-classes';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

const DEFAULT_SLOT = { weekday: 2, start: '18:00', end: '20:00' };
const EMPTY: CreateGroupInput = {
  name: '',
  schedule: [{ ...DEFAULT_SLOT }],
  studentIds: [],
};
const clientsService = new ClientsService();

function clientIdOf(client: Client): string {
  return client.id || client._id || '';
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function datesForMonth(slot: Group['schedule'][number] | undefined, month: Date) {
  if (!slot) return [];
  const result: string[] = [];
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= days; day += 1) {
    const value = new Date(year, monthIndex, day);
    const isoWeekday = value.getDay() === 0 ? 7 : value.getDay();
    if (isoWeekday === slot.weekday) result.push(dateKey(value));
  }
  return result;
}

function displayClassDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(year, month - 1, day));
}

function monthLabel(value: Date) {
  const label = new Intl.DateTimeFormat('es-AR', {
    month: 'long', year: 'numeric',
  }).format(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Grupos / talleres / clases. Un profesor ve y administra los SUYOS (el
 * backend liga su cuenta al profesor); el admin ve todos y puede asignar
 * profesor. Desde acá también se toma la asistencia de cada clase.
 */
export function GruposPanel({ focusGroupId }: { focusGroupId?: string } = {}) {
  const user = useAuthStore((s) => s.user);
  // Admin o encargado/a: la gestión operativa.
  const canManage = canManageRole(user?.role);
  const confirm = useConfirm();

  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CreateGroupInput | null>(null);
  const [editing, setEditing] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [attendanceOf, setAttendanceOf] = useState<Group | null>(null);
  // Clases de prueba: las de las últimas semanas (para inscribir) y las próximas.
  const [trials, setTrials] = useState<TrialClass[]>([]);
  const [trialFor, setTrialFor] = useState<Group | null>(null);
  const [enrolling, setEnrolling] = useState<TrialClass | null>(null);
  const cancelTrial = useCancelTrial((id) => setTrials((ts) => ts.filter((t) => t._id !== id)));
  // Deep-link desde la Agenda: abrir la asistencia del grupo indicado una vez.
  const [focusHandled, setFocusHandled] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState('');
  // Clientes elegidos que todavía no son alumnos: se dan de alta al guardar.
  const [pendingClients, setPendingClients] = useState<Client[]>([]);
  // Resultados junto al término que los trajo: si no coincide, sigue buscando.
  const [clientResults, setClientResults] = useState<{ term: string; rows: Client[] }>({ term: '', rows: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(`${todayAR()}T12:00:00Z`);
      since.setUTCDate(since.getUTCDate() - 21);
      const [gs, ss, ps, ts] = await Promise.all([
        tallerAdmin.listGroups(true),
        tallerAdmin.listStudents(false),
        professorsAdmin.list(),
        // Las pruebas son un extra: si no cargan, los grupos se ven igual.
        tallerAdmin
          .listTrials({ from: since.toISOString().slice(0, 10) })
          .catch(() => [] as TrialClass[]),
      ]);
      setGroups(gs);
      setStudents(ss);
      setProfessors(ps);
      setTrials(ts);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cuando llegamos con ?group=<id> (desde la Agenda), abrir su asistencia
  // apenas los grupos estén cargados. Sólo una vez.
  useEffect(() => {
    if (focusHandled || !focusGroupId || groups.length === 0) return;
    const g = groups.find((x) => x._id === focusGroupId);
    if (g) setAttendanceOf(g);
    setFocusHandled(true);
  }, [focusGroupId, focusHandled, groups]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedStudentSearch(studentSearch.trim().toLocaleLowerCase('es-AR')), 250);
    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  // Sin búsqueda no se ofrece a nadie: quien se sacó del grupo no reaparece solo.
  const filteredStudents = useMemo(() => {
    const term = debouncedStudentSearch;
    if (term.length < 2) return [];
    return students.filter((student) => student.name.toLocaleLowerCase('es-AR').includes(term)).slice(0, 20);
  }, [students, debouncedStudentSearch]);

  const studentName = useMemo(
    () => new Map(students.map((s) => [s._id, s.name])),
    [students],
  );

  // Con 2+ letras la misma búsqueda también trae clientes del servidor.
  const formOpen = form !== null;
  useEffect(() => {
    const term = debouncedStudentSearch;
    if (!formOpen || term.length < 2) return;
    let active = true;
    clientsService
      .getClients(1, 12, { search: term })
      .then((response) => {
        if (active) {
          setClientResults({ term, rows: response.data.data.map((client) => ({ ...client, id: clientIdOf(client) })) });
        }
      })
      .catch(() => {
        if (active) setClientResults({ term, rows: [] });
      });
    return () => {
      active = false;
    };
  }, [debouncedStudentSearch, formOpen]);
  const searchingClients =
    debouncedStudentSearch.length >= 2 && clientResults.term !== debouncedStudentSearch;

  // Un cliente que ya es alumno se suma como ese alumno, no se duplica.
  const studentByClient = useMemo(
    () => new Map(students.filter((s) => s.clientId).map((s) => [s.clientId as string, s])),
    [students],
  );
  const clientRows = (searchingClients ? [] : clientResults.rows).filter((client) => {
    const linked = studentByClient.get(client.id);
    return !linked || !filteredStudents.some((s) => s._id === linked._id);
  });

  // El profesor del grupo pudo ser eliminado: se lo lista igual para que el
  // select no quede en blanco mientras el grupo lo sigue teniendo asignado.
  const professorOptions = professors.map((p) => ({ id: p.id, name: p.name }));
  if (editing?.professorId && !professors.some((p) => p.id === editing.professorId)) {
    professorOptions.push({
      id: editing.professorId,
      name: `${editing.professorName ?? 'Profesor'} (eliminado)`,
    });
  }

  function openForm(group?: Group) {
    setEditing(group ?? null);
    setStudentSearch('');
    setDebouncedStudentSearch('');
    setPendingClients([]);
    setForm(
      group
        ? {
            name: group.name,
            professorId: group.professorId,
            schedule: [{ ...(group.schedule[0] ?? DEFAULT_SLOT) }],
            studentIds: [...group.studentIds],
            isActive: group.isActive,
            hasMonthlyPiece: group.hasMonthlyPiece ?? true,
          }
        : { ...EMPTY, schedule: [{ ...DEFAULT_SLOT }], studentIds: [], hasMonthlyPiece: true },
    );
  }

  function toggleStudent(id: string) {
    if (!form) return;
    const current = form.studentIds ?? [];
    setForm({
      ...form,
      studentIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  }

  function toggleClient(client: Client) {
    setPendingClients((prev) =>
      prev.some((p) => p.id === client.id) ? prev.filter((p) => p.id !== client.id) : [...prev, client],
    );
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return showToast.error('El nombre es obligatorio');
    const slot = form.schedule?.[0];
    if (!slot) return showToast.error('Definí el día y horario del grupo');
    if (!slot.start || !slot.end || slot.start >= slot.end) {
      return showToast.error('La hora de fin debe ser posterior a la de inicio');
    }
    setSaving(true);
    try {
      const input = { ...form, clientIds: pendingClients.map((client) => client.id) };
      if (editing) {
        await tallerAdmin.updateGroup(editing._id, input);
        showToast.success('Grupo actualizado');
      } else {
        await tallerAdmin.createGroup(input);
        showToast.success('Grupo creado');
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

  // Orden del listado: el admin arrastra las tarjetas y se guarda al soltar.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // En la tablet: mantener apretada la manija un instante para arrastrar,
    // así deslizar sigue scrolleando la página.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = groups.findIndex((g) => g._id === active.id);
    const to = groups.findIndex((g) => g._id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(groups, from, to);
    setGroups(next);
    try {
      await tallerAdmin.reorderGroups(next.map((g) => g._id));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar el orden');
      await load();
    }
  }

  async function remove(g: Group) {
    if (!(await confirm({ title: `¿Eliminar el grupo ${g.name}?`, description: 'Esta acción no se puede deshacer.' }))) return;
    try {
      await tallerAdmin.removeGroup(g._id);
      showToast.success('Grupo eliminado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-sm text-[#7a6e6f]'>
          Todos los grupos del taller: asistencia y clases de prueba.
        </p>
        <Button
          type='button'
          variant='verde'
          onClick={() => openForm()}
          className='gap-2'
        >
          <Plus className='h-4 w-4' />
          Nuevo grupo
        </Button>
      </div>

      {loading ? (
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
          Cargando…
        </div>
      ) : groups.length === 0 ? (
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
          Sin grupos todavía. Creá el primero.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={groups.map((g) => g._id)} strategy={rectSortingStrategy}>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {groups.map((g) => (
            <SortableCard key={g._id} id={g._id} draggable={canManage}>
              {(handle) => (
              <>
              <div className='flex items-start justify-between gap-2'>
                <div className='flex min-w-0 items-start gap-1.5'>
                  {handle}
                  <h3 className='font-tan-nimbus text-[16px] font-semibold text-[#3d3338]'>
                    {g.name}
                  </h3>
                </div>
                {!g.isActive && (
                  <StatusBadge label='Inactivo' bg='#f1efe9' fg='#7a6e6f' />
                )}
              </div>
              {g.description && (
                <p className='line-clamp-2 text-[13px] text-[#7a6e6f]'>
                  {g.description}
                </p>
              )}
              <p className='text-sm text-[#455a54]'>
                {g.schedule.length
                  ? g.schedule
                      .map(
                        (sl) =>
                          `${WEEKDAY_SHORT[sl.weekday]} ${sl.start}–${sl.end}`,
                      )
                      .join(' · ')
                  : 'Sin horario cargado'}
              </p>
              {g.schedule[0] && (
                <p className='text-[12px] text-[#7a6e6f]'>
                  Este mes: {datesForMonth(g.schedule[0], new Date()).map((d) => Number(d.slice(-2))).join(', ')} · {g.schedule[0].start}
                </p>
              )}
              <p className='text-sm text-[#7a6e6f]'>
                {g.studentIds.length} alumno(s)
                {g.professorName ? ` · Prof. ${g.professorName}` : ''}
              </p>
              <GroupTrials
                trials={trials.filter((t) => t.groupId === g._id)}
                canManage={canManage}
                onCancel={(t) => void cancelTrial(t)}
                onEnroll={setEnrolling}
              />
              <div className='flex flex-wrap items-center justify-end gap-1.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setTrialFor(g)}
                  title='Agendar una clase de prueba (gratis, no cuenta para el mes)'
                  className='h-7 gap-1 border border-[#e6dbcd] bg-white px-2 text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
                >
                  <CalendarPlus className='h-3.5 w-3.5' />
                  Prueba
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setAttendanceOf(g)}
                  className='h-7 gap-1 border border-[#e6dbcd] bg-white px-2 text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
                >
                  <CalendarCheck className='h-3.5 w-3.5' />
                  Asistencia
                </Button>
                <IconBtn
                  icon={Pencil}
                  title='Editar'
                  tone='verde'
                  onClick={() => openForm(g)}
                />
                <IconBtn
                  icon={Trash2}
                  title='Eliminar'
                  tone='rojo'
                  onClick={() => remove(g)}
                />
              </div>
              </>
              )}
            </SortableCard>
          ))}
        </div>
        </SortableContext>
        </DndContext>
      )}

      {/* Alta / edición */}
      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent className='sm:max-w-lg'>
            <DialogHeader className='text-left'>
              <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
                {editing ? 'Editar grupo' : 'Nuevo grupo'}
              </DialogTitle>
            </DialogHeader>
            <div className='flex flex-col gap-3'>
              <Field label='Nombre'>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder='Taller de martes, Escuelita miércoles…'
                  className={fieldCls}
                />
              </Field>
              {canManage && (
                <Field label='Profesor a cargo'>
                  <QuickCreateSelect
                    value={form.professorId ?? ''}
                    onChange={(id) =>
                      setForm({ ...form, professorId: id || undefined })
                    }
                    options={professorOptions}
                    emptyLabel='Sin asignar'
                    placeholder='Sin asignar'
                    createTitle='Nuevo profesor'
                    fields={professorFields}
                    onCreate={async (vals) => {
                      const created = await professorsAdmin.create({
                        name: vals.name,
                        phone: vals.phone,
                        emergencyPhone: vals.emergencyPhone,
                        email: vals.email,
                      });
                      const id = created.id ?? created._id ?? '';
                      setProfessors((prev) => [
                        ...prev,
                        { ...created, id } as Professor,
                      ]);
                      return { id, name: created.name };
                    }}
                  />
                </Field>
              )}

              <Field label='Día y horario semanal'>
                <div className='flex flex-col gap-1.5'>
                  {(form.schedule ?? [{ ...DEFAULT_SLOT }]).slice(0, 1).map((sl) => (
                    <div
                      key='group-slot'
                      className='flex flex-wrap items-center gap-2 rounded-lg border border-[#e6dbcd] bg-white p-2'
                    >
                      <select
                        value={sl.weekday}
                        onChange={(e) => {
                          setForm({ ...form, schedule: [{ ...sl, weekday: Number(e.target.value) }] });
                        }}
                        className={`${fieldCls} h-9 w-20 shrink-0 rounded-md border px-2 text-sm`}
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                          <option key={d} value={d}>
                            {WEEKDAY_SHORT[d]}
                          </option>
                        ))}
                      </select>
                      <div className='flex min-w-0 flex-1 basis-40 items-center gap-1.5'>
                        <Input
                          type='time'
                          value={sl.start}
                          onChange={(e) => {
                            setForm({ ...form, schedule: [{ ...sl, start: e.target.value }] });
                          }}
                          className={`${fieldCls} h-9 min-w-0 flex-1`}
                        />
                        <span className='shrink-0 text-xs text-[#7a6e6f]'>a</span>
                        <Input
                          type='time'
                          value={sl.end}
                          onChange={(e) => {
                            setForm({ ...form, schedule: [{ ...sl, end: e.target.value }] });
                          }}
                          className={`${fieldCls} h-9 min-w-0 flex-1`}
                        />
                      </div>
                    </div>
                  ))}
                  <p className='text-[11px] text-[#7a6e6f]'>
                    Clases de {monthLabel(new Date()).toLocaleLowerCase('es-AR')}: {datesForMonth(form.schedule?.[0], new Date()).map(displayClassDate).join(' · ')}
                  </p>
                </div>
              </Field>

              <label className='flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-2.5'>
                <Switch
                  checked={form.hasMonthlyPiece ?? true}
                  onCheckedChange={(on) => setForm({ ...form, hasMonthlyPiece: on })}
                  aria-label='Lleva pieza del mes'
                  className='mt-0.5'
                />
                <span className='text-sm text-[#455a54]'>
                  Lleva pieza del mes
                  <span className='block text-[11px] text-[#7a6e6f]'>
                    Apagado (como la Escuelita), sus alumnos no aparecen en Piezas del mes.
                  </span>
                </span>
              </label>

              <Field label={`Alumnos (${(form.studentIds?.length ?? 0) + pendingClients.length})`}>
                {(form.studentIds?.length ?? 0) + pendingClients.length === 0 ? (
                  <p className='mb-2 text-xs text-[#7a6e6f]'>El grupo todavía no tiene alumnos.</p>
                ) : (
                  <div className='mb-2 flex flex-wrap gap-1.5'>
                    {(form.studentIds ?? []).map((id) => (
                      <MemberChip
                        key={id}
                        name={studentName.get(id) ?? '(alumno inactivo)'}
                        onRemove={() => toggleStudent(id)}
                      />
                    ))}
                    {pendingClients.map((client) => (
                      <MemberChip
                        key={client.id}
                        name={client.fullName}
                        tag='cliente'
                        onRemove={() => toggleClient(client)}
                      />
                    ))}
                  </div>
                )}
                <Input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder='Buscar alumno o cliente por nombre…'
                  className={`${fieldCls} mb-2 h-9`}
                />
                <p className='mb-1 text-[11px] text-[#7a6e6f]'>
                  Escribí al menos 2 letras para buscar entre alumnos y clientes. Al guardar, el cliente queda vinculado como alumno del grupo.
                </p>
                {debouncedStudentSearch.length >= 2 && (
                  <div className='flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-[#e6dbcd] bg-white p-2'>
                    {filteredStudents.map((s) => (
                      <PickRow
                        key={s._id}
                        on={form.studentIds?.includes(s._id) ?? false}
                        label={s.name}
                        onClick={() => toggleStudent(s._id)}
                      />
                    ))}
                    {(searchingClients || clientRows.length > 0) && (
                      <p className='mt-1 px-2 text-[11px] font-medium uppercase tracking-wide text-[#9d684e]'>
                        Clientes
                      </p>
                    )}
                    {searchingClients ? (
                      <p className='px-2 text-xs text-[#7a6e6f]'>Buscando clientes…</p>
                    ) : (
                      clientRows.map((client) => {
                        const linked = studentByClient.get(client.id);
                        return (
                          <PickRow
                            key={client.id}
                            on={
                              linked
                                ? (form.studentIds?.includes(linked._id) ?? false)
                                : pendingClients.some((p) => p.id === client.id)
                            }
                            label={client.fullName}
                            hint={[linked ? 'ya es alumno' : '', client.phone, client.email].filter(Boolean).join(' · ')}
                            onClick={() => (linked ? toggleStudent(linked._id) : toggleClient(client))}
                          />
                        );
                      })
                    )}
                    {!searchingClients && filteredStudents.length === 0 && clientRows.length === 0 && (
                      <p className='px-2 text-xs text-[#7a6e6f]'>No encontramos alumnos ni clientes con esa búsqueda.</p>
                    )}
                  </div>
                )}
              </Field>

            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setForm(null)}
                className='border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
              >
                Cancelar
              </Button>
              <Button
                type='button'
                variant='terracota'
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {attendanceOf && (
        <AttendanceDialog
          group={attendanceOf}
          allGroups={groups}
          allStudents={students}
          studentName={studentName}
          onClose={() => {
            setAttendanceOf(null);
            // Si marcó una prueba, la tarjeta pasa a decir si vino.
            void load();
          }}
        />
      )}
      {trialFor && (
        <ScheduleTrialDialog
          group={trialFor}
          students={students}
          groups={groups}
          onClose={() => setTrialFor(null)}
          onDone={(t) => {
            setTrialFor(null);
            setTrials((ts) => [...ts, t].sort((a, b) => a.date.localeCompare(b.date)));
            void load();
          }}
        />
      )}
      {enrolling && (
        <EnrollTrialDialog
          trial={enrolling}
          group={groups.find((g) => g._id === enrolling.groupId) ?? groups[0]}
          students={students}
          onClose={() => setEnrolling(null)}
          onDone={() => {
            setEnrolling(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

/** Tarjeta de grupo que el admin puede arrastrar desde la manija. */
function SortableCard({
  id,
  draggable,
  children,
}: Readonly<{
  id: string;
  draggable: boolean;
  children: (handle: React.ReactNode) => React.ReactNode;
}>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !draggable });
  const handle = draggable ? (
    <button
      type='button'
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      title='Arrastrá para reordenar'
      aria-label='Arrastrá para reordenar'
      className='-ml-1 mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-[#a99f92] hover:bg-[#fbf5ef] hover:text-[#455a54] active:cursor-grabbing'
    >
      <GripVertical className='h-4 w-4' />
    </button>
  ) : null;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4 ${
        isDragging ? 'relative z-10 shadow-lg ring-2 ring-[#455a54]/30' : ''
      }`}
    >
      {children(handle)}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-sm font-medium text-[#455a54]'>{label}</span>
      {children}
    </div>
  );
}

/** Integrante ya elegido del grupo, con su botón para quitarlo. */
function MemberChip({ name, tag, onRemove }: Readonly<{
  name: string;
  tag?: string;
  onRemove: () => void;
}>) {
  return (
    <span className='inline-flex items-center gap-1 rounded-full border border-[#bfd2c9] bg-[#E7F0EC] py-0.5 pl-2.5 pr-1 text-[12px] text-[#455a54]'>
      {name}
      {tag && <span className='text-[10px] text-[#6d7d77]'>· {tag}</span>}
      <button
        type='button'
        aria-label={`Quitar a ${name}`}
        onClick={onRemove}
        className='rounded-full p-0.5 text-[#6d7d77] hover:bg-white/70'
      >
        <X className='h-3 w-3' />
      </button>
    </span>
  );
}

function PickRow({ on, label, hint, onClick }: Readonly<{
  on: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}>) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition ${
        on ? 'bg-[#E7F0EC] text-[#455a54]' : 'text-[#3d3338] hover:bg-[#fbf5ef]'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
          on ? 'border-[#455a54] bg-[#455a54] text-white' : 'border-[#c9bfb0]'
        }`}
      >
        {on ? '✓' : ''}
      </span>
      <span className='min-w-0'>
        {label}
        {hint && <span className='block truncate text-[11px] text-[#7a6e6f]'>{hint}</span>}
      </span>
    </button>
  );
}

const ATT_OPTIONS: Array<{ key: AttendanceStatus; label: string }> = [
  { key: 'PRESENT', label: 'Presente' },
  { key: 'ABSENT', label: 'Ausente' },
  { key: 'MAKEUP', label: 'Recupera' },
];

// Para quien vino de otro grupo: presente = recuperó la clase original.
const GUEST_OPTIONS: Array<{ key: AttendanceStatus; label: string }> = [
  { key: 'MAKEUP', label: 'Presente' },
  { key: 'ABSENT', label: 'Ausente' },
];

// Clase de prueba gratuita: vino o no vino (no recupera nada).
const TRIAL_OPTIONS: Array<{ key: AttendanceStatus; label: string }> = [
  { key: 'PRESENT', label: 'Presente' },
  { key: 'ABSENT', label: 'Ausente' },
];

// Las asistencias se llevan desde octubre 2026: antes no hay clases que recuperar.
const RECOVERY_FROM = '2026-10-01';

/**
 * Asistencia de una clase: se elige el día, cada alumno del grupo arranca
 * PRESENTE y se marca ausente/recuperando con un toque. También se puede
 * sumar un alumno de OTRO grupo que vino a recuperar, o a alguien que viene a
 * su clase de prueba gratuita (una sola por alumno).
 */

function AttendanceDialog({
  group,
  allGroups,
  allStudents,
  studentName,
  onClose,
}: Readonly<{
  group: Group;
  allGroups: Group[];
  allStudents: Student[];
  studentName: Map<string, string>;
  onClose: () => void;
}>) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const initialDates = datesForMonth(group.schedule[0], today);
  const todayKey = dateKey(today);
  const [date, setDate] = useState(
    initialDates.find((candidate) => candidate >= todayKey) ?? initialDates.at(-1) ?? todayKey,
  );
  // status null = "sin marcar" (arranque de un día nuevo). Así el resaltado de
  // un botón SÍ significa "lo marcó el usuario", y no se confunde con un default.
  const [records, setRecords] = useState<
    Array<{
      studentId: string;
      status: AttendanceStatus | null;
      makeupForGroupId?: string;
      makeupForDate?: string;
      recoveredInGroupId?: string;
      recoveredInDate?: string;
      recoveredAt?: string;
      trial?: boolean;
    }>
  >(group.studentIds.map((id) => ({ studentId: id, status: null })));
  const canManage = useAuthStore((s) => canManageRole(s.user?.role));
  // Clase de prueba: alumno existente o uno nuevo (sólo admin puede crearlo).
  const [trialStudent, setTrialStudent] = useState('');
  const [trialName, setTrialName] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [addingTrial, setAddingTrial] = useState(false);
  const [newNames, setNewNames] = useState<Map<string, string>>(new Map());
  const nameOf = (id: string) => studentName.get(id) ?? newNames.get(id);
  const [extra, setExtra] = useState('');
  const [extraSourceGroup, setExtraSourceGroup] = useState('');
  const [extraSourceDate, setExtraSourceDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Si ya se tomó asistencia ese día, se carga para editar (no duplicar). Las
  // clases de prueba agendadas para ese día aparecen ya sumadas.
  useEffect(() => {
    let alive = true;
    Promise.all([
      tallerAdmin.attendanceOfGroup(group._id, 60),
      tallerAdmin
        .listTrials({ from: date, to: date, groupId: group._id })
        .catch(() => []),
    ])
      .then(([docs, dayTrials]) => {
        if (!alive) return;
        const withTrials = <T extends { studentId: string }>(rows: T[]) => [
          ...rows,
          ...dayTrials
            .filter((t) => !t.enrolled && !rows.some((r) => r.studentId === t.student._id))
            .map((t) => ({ studentId: t.student._id, status: null, trial: true })),
        ];
        if (dayTrials.length) {
          setNewNames((m) => {
            const next = new Map(m);
            for (const t of dayTrials) next.set(t.student._id, t.student.name);
            return next;
          });
        }
        const doc = docs.find((d) => d.dateKey === date);
        if (doc) {
          const savedByStudent = new Map(doc.records.map((r) => [r.studentId, r]));
          const orderedIds = [
            ...group.studentIds,
            ...doc.records.map((r) => r.studentId).filter((id) => !group.studentIds.includes(id)),
          ];
          setRecords(withTrials(orderedIds.map((studentId) => {
            const r = savedByStudent.get(studentId);
            return r ? {
              studentId: r.studentId,
              status: r.status,
              makeupForGroupId: r.makeupForGroupId,
              makeupForDate: r.makeupForDate,
              recoveredInGroupId: r.recoveredInGroupId,
              recoveredInDate: r.recoveredInDate,
              recoveredAt: r.recoveredAt,
              trial: r.trial,
            } : { studentId, status: null };
          })));
        } else {
          setRecords(
            withTrials(group.studentIds.map((id) => ({ studentId: id, status: null }))),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [date, group._id, group.studentIds]);

  async function save() {
    if (records.some((r) => r.status === 'MAKEUP' && (!r.makeupForGroupId || !r.makeupForDate))) {
      showToast.error('Indicá qué clase recupera cada alumno marcado como Recupera');
      return;
    }
    setSaving(true);
    try {
      await tallerAdmin.saveAttendance({
        groupId: group._id,
        date,
        // Sin marcar → Presente (si tomaste asistencia y no lo tocaste, vino).
        // Un alumno sumado para recuperar sin marcar → vino a recuperar.
        records: records.map((r) => {
          const recovering = isRecoveringGuest(r);
          const status = r.status ?? (recovering ? 'MAKEUP' : 'PRESENT');
          const keepRef = status === 'MAKEUP' || (recovering && status === 'ABSENT');
          return {
            studentId: r.studentId,
            status,
            makeupForGroupId: keepRef ? r.makeupForGroupId : undefined,
            makeupForDate: keepRef ? r.makeupForDate : undefined,
            trial: r.trial || undefined,
          };
        }),
      });
      showToast.success('Asistencia guardada');
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  // Alumno de otro grupo incorporado sólo para recuperar una clase.
  function isRecoveringGuest(r: { studentId: string; makeupForGroupId?: string; makeupForDate?: string }) {
    return !group.studentIds.includes(r.studentId) && !!r.makeupForGroupId && !!r.makeupForDate;
  }

  const outsiders = allStudents.filter(
    (s) => !records.some((r) => r.studentId === s._id),
  );
  // ¿Ya usó la prueba en otra clase? (en ésta misma se puede seguir editando)
  const trialUsedElsewhere = (s: Student) =>
    !!s.trialDate && !(s.trialGroupId === group._id && s.trialDate === date);
  // La prueba es para quien todavía no se anotó en ningún grupo.
  const isEnrolled = (s: Student) => allGroups.some((g) => g.studentIds.includes(s._id));
  const trialBlockedReason = (s: Student) =>
    isEnrolled(s)
      ? ' · ya está inscripto'
      : trialUsedElsewhere(s)
        ? ' · ya usó su clase de prueba'
        : '';

  async function addTrial() {
    let studentId = trialStudent;
    if (studentId === 'new') {
      if (!trialName.trim()) return showToast.error('Escribí el nombre de quien viene a probar');
      setAddingTrial(true);
      try {
        const created = await tallerAdmin.createStudent({
          name: trialName.trim(),
          phone: trialPhone.trim() || undefined,
        });
        studentId = created._id;
        setNewNames((m) => new Map(m).set(created._id, created.name));
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'No se pudo crear el alumno');
        return;
      } finally {
        setAddingTrial(false);
      }
    }
    setRecords([...records, { studentId, status: null, trial: true }]);
    setTrialStudent('');
    setTrialName('');
    setTrialPhone('');
  }
  const classDates = datesForMonth(group.schedule[0], month);

  function changeMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    const nextDates = datesForMonth(group.schedule[0], next);
    if (nextDates[0]) setDate(nextDates[0]);
  }

  function sourceGroupsFor(studentId: string) {
    const enrolled = allGroups.filter((candidate) => candidate.studentIds.includes(studentId));
    return enrolled.length > 0 ? enrolled : allGroups;
  }

  function sourceDatesFor(sourceGroupId?: string) {
    const source = allGroups.find((candidate) => candidate._id === sourceGroupId);
    if (!source?.schedule[0]) return [];
    const targetParts = date.split('-').map(Number);
    const targetMonth = new Date(targetParts[0], targetParts[1] - 1, 1);
    const options: string[] = [];
    for (let offset = -6; offset <= 6; offset += 1) {
      options.push(...datesForMonth(
        source.schedule[0],
        new Date(targetMonth.getFullYear(), targetMonth.getMonth() + offset, 1),
      ));
    }
    return options
      .filter((candidate) => candidate >= RECOVERY_FROM)
      .filter((candidate) => !(sourceGroupId === group._id && candidate === date))
      .sort((a, b) => a.localeCompare(b));
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
            Asistencia · {group.name}
          </DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='rounded-xl border border-[#e6dbcd] bg-[#fbf5ef]/50 p-2.5'>
            <div className='mb-2 flex items-center justify-between'>
              <button type='button' aria-label='Mes anterior' onClick={() => changeMonth(-1)} className='rounded-md p-1 text-[#455a54] hover:bg-white'>
                <ChevronLeft className='h-4 w-4' />
              </button>
              <span className='text-sm font-medium text-[#455a54]'>Clases de {monthLabel(month)}</span>
              <button type='button' aria-label='Mes siguiente' onClick={() => changeMonth(1)} className='rounded-md p-1 text-[#455a54] hover:bg-white'>
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {classDates.map((classDate) => (
                <button
                  key={classDate}
                  type='button'
                  onClick={() => setDate(classDate)}
                  className={`rounded-md border px-2 py-1 text-[12px] transition ${date === classDate ? 'border-[#455a54] bg-[#455a54] text-white' : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#f7eee6]'}`}
                >
                  {displayClassDate(classDate)} · {group.schedule[0]?.start}
                </button>
              ))}
            </div>
          </div>

          {records.length === 0 && (
            <p className='text-xs text-[#7a6e6f]'>El grupo no tiene alumnos.</p>
          )}
          {records.length > 0 &&
            (() => {
              const unmarked = records.filter((r) => r.status === null).length;
              return (
                <p className='text-[12px] text-[#7a6e6f]'>
                  {unmarked === 0
                    ? '✓ Todos marcados'
                    : `${unmarked} sin marcar (al guardar quedan Presente)`}
                </p>
              );
            })()}
          <div className='flex flex-col gap-1.5'>
            {records.map((r, i) => (
              <div
                key={r.studentId}
                className={`flex flex-col gap-2 rounded-lg border px-3 py-2 ${
                  r.status === null
                    ? 'border-dashed border-[#d9cdbd] bg-[#fbf5ef]/40'
                    : 'border-[#e6dbcd]'
                }`}
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='text-[13px] font-medium text-[#3d3338]'>
                    {nameOf(r.studentId) ?? '(alumno)'}
                    {r.trial && (
                      <span className='ml-1.5 rounded-full bg-[#E7F0EC] px-2 py-0.5 text-[11px] font-medium text-[#455a54]'>
                        Clase de prueba · gratis
                      </span>
                    )}
                    {r.recoveredInDate && (
                      <span className='ml-1.5 text-[11px] font-normal text-[#6d5a78]'>
                        · recuperada el {displayClassDate(r.recoveredInDate)}
                      </span>
                    )}
                  </span>
                  <div className='flex gap-1'>
                  {(r.trial ? TRIAL_OPTIONS : isRecoveringGuest(r) ? GUEST_OPTIONS : ATT_OPTIONS).map((o) => (
                    <button
                      key={o.key}
                      type='button'
                      onClick={() => {
                        const next = [...records];
                        next[i] = {
                          ...r,
                          status: o.key,
                          ...(o.key === 'MAKEUP' || isRecoveringGuest(r) ? {} : { makeupForGroupId: undefined, makeupForDate: undefined }),
                        };
                        setRecords(next);
                      }}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                        r.status === o.key
                          ? o.key === 'ABSENT'
                            ? 'border-[#a33] bg-[#a33] text-white'
                            : o.key === 'MAKEUP'
                              ? 'border-[#6d5a78] bg-[#6d5a78] text-white'
                              : 'border-[#455a54] bg-[#455a54] text-white'
                          : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                  {(isRecoveringGuest(r) || r.trial) && (
                    <button
                      type='button'
                      aria-label='Quitar de esta asistencia'
                      onClick={() => setRecords(records.filter((_, j) => j !== i))}
                      className='rounded-md border border-[#e6dbcd] bg-white px-2 py-1 text-[11px] text-[#a33] hover:bg-[#fbe4e4]'
                    >
                      Quitar
                    </button>
                  )}
                  </div>
                </div>
                {r.trial && (
                  <p className='text-[11px] text-[#455a54]'>
                    {r.status === 'ABSENT'
                      ? 'No vino: conserva su clase de prueba para otro día.'
                      : 'No se cobra. Al guardarla presente, ya no puede tener otra clase gratis.'}
                  </p>
                )}
                {isRecoveringGuest(r) && (
                  <p className='text-[11px] text-[#6d5a78]'>
                    Recupera {allGroups.find((candidate) => candidate._id === r.makeupForGroupId)?.name ?? 'otra clase'} del {displayClassDate(r.makeupForDate!)}
                    {r.status === 'ABSENT' ? ' · no vino: la clase original sigue pendiente' : ' · al guardarlo presente, la clase original queda recuperada'}
                  </p>
                )}
                {r.status === 'MAKEUP' && !isRecoveringGuest(r) && (
                  <div className='grid grid-cols-1 gap-1.5 border-t border-[#eee4d8] pt-2 sm:grid-cols-2'>
                    <select
                      value={r.makeupForGroupId ?? ''}
                      onChange={(e) => {
                        const next = [...records];
                        next[i] = { ...r, makeupForGroupId: e.target.value || undefined, makeupForDate: undefined };
                        setRecords(next);
                      }}
                      className={`${fieldCls} h-9 rounded-md border px-2 text-xs`}
                    >
                      <option value=''>Grupo de la clase original…</option>
                      {sourceGroupsFor(r.studentId).map((candidate) => (
                        <option key={candidate._id} value={candidate._id}>{candidate.name}</option>
                      ))}
                    </select>
                    <select
                      value={r.makeupForDate ?? ''}
                      disabled={!r.makeupForGroupId}
                      onChange={(e) => {
                        const next = [...records];
                        next[i] = { ...r, makeupForDate: e.target.value || undefined };
                        setRecords(next);
                      }}
                      className={`${fieldCls} h-9 rounded-md border px-2 text-xs disabled:opacity-50`}
                    >
                      <option value=''>Fecha que recupera…</option>
                      {sourceDatesFor(r.makeupForGroupId).map((sourceDate) => (
                        <option key={sourceDate} value={sourceDate}>{displayClassDate(sourceDate)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Clase de prueba gratuita (una sola por alumno) */}
          <div className='flex flex-col gap-2 rounded-xl border border-[#455a54]/25 bg-[#E7F0EC]/40 p-2.5'>
            <select
              value={trialStudent}
              onChange={(e) => setTrialStudent(e.target.value)}
              className={`${fieldCls} h-9 rounded-md border px-2 text-sm`}
            >
              <option value=''>Sumar clase de prueba (gratis)…</option>
              {canManage && <option value='new'>+ Alumno nuevo</option>}
              {outsiders.map((s) => (
                <option key={s._id} value={s._id} disabled={!!trialBlockedReason(s)}>
                  {s.name}
                  {trialBlockedReason(s)}
                </option>
              ))}
            </select>
            {trialStudent === 'new' && (
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <Input
                  value={trialName}
                  onChange={(e) => setTrialName(e.target.value)}
                  placeholder='Nombre y apellido'
                  className={`${fieldCls} h-9 text-sm`}
                />
                <Input
                  value={trialPhone}
                  onChange={(e) => setTrialPhone(e.target.value)}
                  placeholder='Teléfono (opcional)'
                  className={`${fieldCls} h-9 text-sm`}
                />
              </div>
            )}
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!trialStudent || addingTrial}
              onClick={() => void addTrial()}
              className='border-[#e6dbcd] text-[#455a54]'
            >
              {addingTrial ? 'Creando alumno…' : 'Sumar a esta clase como prueba'}
            </Button>
          </div>

          {/* Recuperando de otro grupo */}
          <div className='flex flex-col gap-2 rounded-xl border border-[#e6dbcd] bg-[#fbf5ef]/40 p-2.5'>
            <select
              value={extra}
              onChange={(e) => {
                setExtra(e.target.value);
                setExtraSourceGroup('');
                setExtraSourceDate('');
              }}
              className={`${fieldCls} h-9 rounded-md border px-2 text-sm`}
            >
              <option value=''>Sumar alumno que recupera clase…</option>
              {outsiders.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            {extra && (
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <select
                  value={extraSourceGroup}
                  onChange={(e) => {
                    setExtraSourceGroup(e.target.value);
                    setExtraSourceDate('');
                  }}
                  className={`${fieldCls} h-9 rounded-md border px-2 text-sm`}
                >
                  <option value=''>Grupo habitual…</option>
                  {sourceGroupsFor(extra).map((candidate) => (
                    <option key={candidate._id} value={candidate._id}>{candidate.name}</option>
                  ))}
                </select>
                <select
                  value={extraSourceDate}
                  disabled={!extraSourceGroup}
                  onChange={(e) => setExtraSourceDate(e.target.value)}
                  className={`${fieldCls} h-9 rounded-md border px-2 text-sm disabled:opacity-50`}
                >
                  <option value=''>Clase que recupera…</option>
                  {sourceDatesFor(extraSourceGroup).map((sourceDate) => (
                    <option key={sourceDate} value={sourceDate}>
                      {displayClassDate(sourceDate)} · {allGroups.find((candidate) => candidate._id === extraSourceGroup)?.schedule[0]?.start}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!extra || !extraSourceGroup || !extraSourceDate}
              onClick={() => {
                setRecords([...records, {
                  studentId: extra,
                  status: null,
                  makeupForGroupId: extraSourceGroup,
                  makeupForDate: extraSourceDate,
                }]);
                setExtra('');
                setExtraSourceGroup('');
                setExtraSourceDate('');
              }}
              className='border-[#e6dbcd] text-[#455a54]'
            >
              Incorporar a esta asistencia
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            className='border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
          >
            Cancelar
          </Button>
          <Button type='button' variant='verde' onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar asistencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
