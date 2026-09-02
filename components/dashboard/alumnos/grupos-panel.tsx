'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Pencil, Plus, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DateInput } from '@/components/ui/date-input';
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
} from '@/services/taller.admin.service';
import {
  professorsAdmin,
  type Professor,
} from '@/services/professors.admin.service';
import {
  QuickCreateSelect,
  QuickCreateButton,
  professorFields,
  studentFields,
} from '@/components/ui/quick-create-select';
import { IconBtn, StatusBadge } from '../reservas/_shared';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

const EMPTY: CreateGroupInput = { name: '', schedule: [], studentIds: [] };

/**
 * Grupos / talleres / clases. Un profesor ve y administra los SUYOS (el
 * backend liga su cuenta al profesor); el admin ve todos y puede asignar
 * profesor. Desde acá también se toma la asistencia de cada clase.
 */
export function GruposPanel() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const confirm = useConfirm();

  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CreateGroupInput | null>(null);
  const [editing, setEditing] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [attendanceOf, setAttendanceOf] = useState<Group | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gs, ss, ps] = await Promise.all([
        tallerAdmin.listGroups(true),
        tallerAdmin.listStudents(false),
        professorsAdmin.list(),
      ]);
      setGroups(gs);
      setStudents(ss);
      setProfessors(ps);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedStudentSearch(studentSearch.trim().toLocaleLowerCase('es-AR')), 250);
    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  const filteredStudents = useMemo(() => {
    const term = debouncedStudentSearch;
    return students.filter((student) => !term || student.name.toLocaleLowerCase('es-AR').includes(term)).slice(0, 20);
  }, [students, debouncedStudentSearch]);

  const studentName = useMemo(
    () => new Map(students.map((s) => [s._id, s.name])),
    [students],
  );

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return showToast.error('El nombre es obligatorio');
    setSaving(true);
    try {
      if (editing) {
        await tallerAdmin.updateGroup(editing._id, form);
        showToast.success('Grupo actualizado');
      } else {
        await tallerAdmin.createGroup(form);
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
          {isAdmin
            ? 'Todos los grupos del taller.'
            : 'Tus grupos: creá, editá y tomá asistencia.'}
        </p>
        <Button
          type='button'
          variant='verde'
          onClick={() => {
            setEditing(null);
            setStudentSearch('');
            setForm({ ...EMPTY, schedule: [], studentIds: [] });
          }}
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
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {groups.map((g) => (
            <div
              key={g._id}
              className='flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'
            >
              <div className='flex items-start justify-between gap-2'>
                <h3 className='font-tan-nimbus text-[16px] font-semibold text-[#3d3338]'>
                  {g.name}
                </h3>
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
              <p className='text-sm text-[#7a6e6f]'>
                {g.studentIds.length} alumno(s)
                {g.professorName ? ` · Prof. ${g.professorName}` : ''}
              </p>
              <div className='flex items-center justify-end gap-1.5'>
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
                  onClick={() => {
                    setEditing(g);
                    setForm({
                      name: g.name,
                      description: g.description,
                      professorId: g.professorId,
                      schedule: g.schedule.map((s) => ({ ...s })),
                      studentIds: [...g.studentIds],
                      notes: g.notes,
                      isActive: g.isActive,
                    });
                  }}
                />
                <IconBtn
                  icon={Trash2}
                  title='Eliminar'
                  tone='rojo'
                  onClick={() => remove(g)}
                />
              </div>
            </div>
          ))}
        </div>
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
              <Field label='Descripción'>
                <Textarea
                  value={form.description ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className={fieldCls}
                />
              </Field>
              {isAdmin && (
                <Field label='Profesor a cargo'>
                  <QuickCreateSelect
                    value={form.professorId ?? ''}
                    onChange={(id) =>
                      setForm({ ...form, professorId: id || undefined })
                    }
                    options={professors.map((p) => ({ id: p.id, name: p.name }))}
                    emptyLabel='Sin asignar'
                    placeholder='Sin asignar'
                    createTitle='Nuevo profesor'
                    fields={professorFields}
                    onCreate={async (vals) => {
                      const created = await professorsAdmin.create({
                        name: vals.name,
                        phone: vals.phone,
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

              <Field label='Días y horarios'>
                <div className='flex flex-col gap-1.5'>
                  {(form.schedule ?? []).map((sl, i) => (
                    <div
                      key={i}
                      className='flex flex-wrap items-center gap-2 rounded-lg border border-[#e6dbcd] bg-white p-2'
                    >
                      <select
                        value={sl.weekday}
                        onChange={(e) => {
                          const schedule = [...(form.schedule ?? [])];
                          schedule[i] = {
                            ...sl,
                            weekday: Number(e.target.value),
                          };
                          setForm({ ...form, schedule });
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
                            const schedule = [...(form.schedule ?? [])];
                            schedule[i] = { ...sl, start: e.target.value };
                            setForm({ ...form, schedule });
                          }}
                          className={`${fieldCls} h-9 min-w-0 flex-1`}
                        />
                        <span className='shrink-0 text-xs text-[#7a6e6f]'>a</span>
                        <Input
                          type='time'
                          value={sl.end}
                          onChange={(e) => {
                            const schedule = [...(form.schedule ?? [])];
                            schedule[i] = { ...sl, end: e.target.value };
                            setForm({ ...form, schedule });
                          }}
                          className={`${fieldCls} h-9 min-w-0 flex-1`}
                        />
                      </div>
                      <button
                        type='button'
                        onClick={() =>
                          setForm({
                            ...form,
                            schedule: (form.schedule ?? []).filter(
                              (_, idx) => idx !== i,
                            ),
                          })
                        }
                        className='shrink-0 text-[#a33] hover:opacity-70'
                        aria-label='Quitar horario'
                      >
                        <X className='h-4 w-4' />
                      </button>
                    </div>
                  ))}
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setForm({
                        ...form,
                        schedule: [
                          ...(form.schedule ?? []),
                          { weekday: 2, start: '18:00', end: '20:00' },
                        ],
                      })
                    }
                    className='h-8 w-fit gap-1 border-[#e6dbcd] bg-white px-2 text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
                  >
                    <Plus className='h-3 w-3' />
                    Agregar horario
                  </Button>
                </div>
              </Field>

              <Field label={`Alumnos (${form.studentIds?.length ?? 0})`}>
                <div className='mb-1.5 flex justify-end'>
                  <QuickCreateButton
                    label='Nuevo alumno'
                    createTitle='Nuevo alumno'
                    fields={studentFields}
                    onCreate={async (vals) => {
                      const created = await tallerAdmin.createStudent({
                        name: vals.name,
                        phone: vals.phone,
                      });
                      setStudents((prev) => [...prev, created]);
                      return { id: created._id, name: created.name };
                    }}
                    onCreated={(created) =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              studentIds: [...(f.studentIds ?? []), created.id],
                            }
                          : f,
                      )
                    }
                  />
                </div>
                <Input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder='Buscar alumno por nombre…'
                  className={`${fieldCls} mb-2 h-9`}
                />
                <p className='mb-1 text-[11px] text-[#7a6e6f]'>Mostrando hasta 20 alumnos{studentSearch ? ' que coinciden con la búsqueda' : '. Escribí para filtrar.'}</p>
                <div className='flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-[#e6dbcd] bg-white p-2'>
                  {students.length === 0 && (
                    <p className='text-xs text-[#7a6e6f]'>
                      No hay alumnos activos cargados.
                    </p>
                  )}
                  {filteredStudents.map((s) => {
                    const on = form.studentIds?.includes(s._id) ?? false;
                    return (
                      <button
                        key={s._id}
                        type='button'
                        onClick={() =>
                          setForm({
                            ...form,
                            studentIds: on
                              ? (form.studentIds ?? []).filter(
                                  (id) => id !== s._id,
                                )
                              : [...(form.studentIds ?? []), s._id],
                          })
                        }
                        className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition ${
                          on
                            ? 'bg-[#E7F0EC] text-[#455a54]'
                            : 'text-[#3d3338] hover:bg-[#fbf5ef]'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${
                            on
                              ? 'border-[#455a54] bg-[#455a54] text-white'
                              : 'border-[#c9bfb0]'
                          }`}
                        >
                          {on ? '✓' : ''}
                        </span>
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label='Información de la actividad'>
                <Textarea
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder='Materiales, temario, particularidades…'
                  className={fieldCls}
                />
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
          allStudents={students}
          studentName={studentName}
          onClose={() => setAttendanceOf(null)}
        />
      )}
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

const ATT_OPTIONS: Array<{ key: AttendanceStatus; label: string }> = [
  { key: 'PRESENT', label: 'Presente' },
  { key: 'ABSENT', label: 'Ausente' },
  { key: 'MAKEUP', label: 'Recupera' },
];

/**
 * Asistencia de una clase: se elige el día, cada alumno del grupo arranca
 * PRESENTE y se marca ausente/recuperando con un toque. También se puede
 * sumar un alumno de OTRO grupo que vino a recuperar.
 */
function AttendanceDialog({
  group,
  allStudents,
  studentName,
  onClose,
}: Readonly<{
  group: Group;
  allStudents: Student[];
  studentName: Map<string, string>;
  onClose: () => void;
}>) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(todayKey);
  // status null = "sin marcar" (arranque de un día nuevo). Así el resaltado de
  // un botón SÍ significa "lo marcó el usuario", y no se confunde con un default.
  const [records, setRecords] = useState<
    Array<{ studentId: string; status: AttendanceStatus | null }>
  >(group.studentIds.map((id) => ({ studentId: id, status: null })));
  const [extra, setExtra] = useState('');
  const [saving, setSaving] = useState(false);

  // Si ya se tomó asistencia ese día, se carga para editar (no duplicar).
  useEffect(() => {
    let alive = true;
    tallerAdmin
      .attendanceOfGroup(group._id, 60)
      .then((docs) => {
        if (!alive) return;
        const doc = docs.find((d) => d.dateKey === date);
        if (doc) {
          setRecords(
            doc.records.map((r) => ({
              studentId: r.studentId,
              status: r.status,
            })),
          );
        } else {
          setRecords(
            group.studentIds.map((id) => ({ studentId: id, status: null })),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [date, group._id, group.studentIds]);

  async function save() {
    setSaving(true);
    try {
      await tallerAdmin.saveAttendance({
        groupId: group._id,
        date,
        // Sin marcar → Presente (si tomaste asistencia y no lo tocaste, vino).
        records: records.map((r) => ({
          studentId: r.studentId,
          status: r.status ?? 'PRESENT',
        })),
      });
      showToast.success('Asistencia guardada');
      onClose();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const outsiders = allStudents.filter(
    (s) => !records.some((r) => r.studentId === s._id),
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
            Asistencia · {group.name}
          </DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <DateInput value={date} onChange={setDate} className='w-40' />

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
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                  r.status === null
                    ? 'border-dashed border-[#d9cdbd] bg-[#fbf5ef]/40'
                    : 'border-[#e6dbcd]'
                }`}
              >
                <span className='text-[13px] font-medium text-[#3d3338]'>
                  {studentName.get(r.studentId) ?? '(alumno)'}
                </span>
                <div className='flex gap-1'>
                  {ATT_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      type='button'
                      onClick={() => {
                        const next = [...records];
                        next[i] = { ...r, status: o.key };
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
                </div>
              </div>
            ))}
          </div>

          {/* Recuperando de otro grupo */}
          <div className='flex items-center gap-2'>
            <select
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              className={`${fieldCls} h-9 flex-1 rounded-md border px-2 text-sm`}
            >
              <option value=''>Sumar alumno que recupera clase…</option>
              {outsiders.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!extra}
              onClick={() => {
                setRecords([...records, { studentId: extra, status: 'MAKEUP' }]);
                setExtra('');
              }}
              className='border-[#e6dbcd] text-[#455a54]'
            >
              Sumar
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
