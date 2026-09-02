'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { AsyncSelect } from '@/components/ui/async-select';
import { ClientsService, type Client } from '@/services/clients.service';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth.store';
import { fmtPrice } from '@/lib/reservas-format';
import {
  tallerAdmin,
  WEEKDAY_SHORT,
  type CreateStudentInput,
  type Group,
  type PaymentAlert,
  type Student,
  type StudentAdminProfile,
  type StudentPracticalProfile,
} from '@/services/taller.admin.service';
import { IconBtn, StatusBadge } from '../reservas/_shared';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

const EMPTY: CreateStudentInput = { name: '', isActive: true };
const clientsService = new ClientsService();

function clientIdOf(client: Client): string {
  return client.id || client._id || '';
}

// Valores canónicos del sistema (ventas/caja usan estos), label en español.
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'MERCADOPAGO', label: 'Mercado Pago' },
];

function fmtDate(d?: string) {
  if (!d) return '—';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

/**
 * Alumnos del taller. El ADMIN ve todo (datos, pagos, regularidad,
 * vencimientos); un PROFESOR ve la parte PRÁCTICA (grupos, asistencia,
 * piezas) sin información administrativa.
 */
export function AlumnosPanel() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const confirm = useConfirm();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [alerts, setAlerts] = useState<PaymentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<CreateStudentInput | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Student | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, al, gs] = await Promise.all([
        tallerAdmin.listStudents(showInactive),
        isAdmin ? tallerAdmin.paymentAlerts(7) : Promise.resolve([]),
        tallerAdmin.listGroups(),
      ]);
      setStudents(list);
      setAlerts(al);
      setGroups(gs);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [showInactive, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return showToast.error('El nombre es obligatorio');
    setSaving(true);
    try {
      if (editing) {
        await tallerAdmin.updateStudent(editing._id, form);
        showToast.success('Alumno actualizado');
      } else {
        await tallerAdmin.createStudent(form);
        showToast.success('Alumno creado');
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

  async function remove(s: Student) {
    if (!(await confirm({ title: `¿Dar de baja a ${s.name}?`, description: 'El historial se conserva.', confirmLabel: 'Dar de baja' }))) return;
    try {
      await tallerAdmin.removeStudent(s._id);
      showToast.success('Alumno dado de baja');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  const visible = students.filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  // Mapa alumno → grupos (cruzando group.studentIds) para mostrar en la card.
  const groupsByStudent = new Map<string, Group[]>();
  for (const g of groups) {
    for (const sid of g.studentIds) {
      const arr = groupsByStudent.get(sid);
      if (arr) arr.push(g);
      else groupsByStudent.set(sid, [g]);
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* Situaciones administrativas: cuotas vencidas y por vencer */}
      {isAdmin && alerts.length > 0 && (
        <div className='rounded-2xl border border-[#e8b84b]/50 bg-[#fdf6e3] p-4'>
          <p className='mb-2 flex items-center gap-2 text-sm font-semibold text-[#8a6d1a]'>
            <AlertTriangle className='h-4 w-4' />
            Pagos que requieren atención
          </p>
          <div className='flex flex-col gap-1.5'>
            {alerts.map((a) => (
              <div
                key={a.paymentId}
                className='flex flex-wrap items-center gap-2 text-[13px] text-[#5b512f]'
              >
                <span className='font-medium'>{a.studentName}</span>
                <span>· {a.concept}</span>
                <span>· {fmtPrice(a.amount)}</span>
                <span>· vence {fmtDate(a.dueDate)}</span>
                {a.overdue && (
                  <StatusBadge label='VENCIDA' bg='#fbe4e4' fg='#a33' />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Buscar alumno…'
            className={`${fieldCls} h-9 w-56`}
          />
          {/* Filtro "Ver inactivos" oculto: hoy la baja borra (soft-delete) y no
              se generan inactivos-no-eliminados, así que el toggle no aporta.
          <label className='flex items-center gap-2 text-sm text-[#7a6e6f]'>
            <Switch
              checked={showInactive}
              onCheckedChange={setShowInactive}
              className='data-[state=checked]:bg-[#455a54]'
            />
            Ver inactivos
          </label>
          */}
        </div>
        {isAdmin && (
          <Button
            type='button'
            variant='verde'
            onClick={() => {
              setEditing(null);
              setSelectedClient(null);
              setForm({ ...EMPTY });
            }}
            className='gap-2'
          >
            <Plus className='h-4 w-4' />
            Nuevo alumno
          </Button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
          Cargando…
        </div>
      ) : visible.length === 0 ? (
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
          {students.length === 0 ? 'Sin alumnos todavía.' : 'Sin resultados.'}
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {visible.map((s) => (
            <div
              key={s._id}
              className='flex flex-col gap-2 rounded-2xl border border-[#e6dbcd] bg-white p-4'
            >
              <div className='flex items-start justify-between gap-2'>
                <button
                  type='button'
                  onClick={() => setDetail(s)}
                  className='min-w-0 flex-1 text-left font-tan-nimbus text-[16px] font-semibold text-[#3d3338] hover:text-[#9d684e]'
                >
                  {s.name}
                </button>
                {!s.isActive && (
                  <StatusBadge label='Baja' bg='#f1efe9' fg='#7a6e6f' />
                )}
              </div>
              {(isAdmin || s.joinedAt || s.guardianName || s.phone) && (
                <p className='text-sm text-[#7a6e6f]'>
                  {s.joinedAt && `Desde ${fmtDate(s.joinedAt)}`}
                  {s.guardianName ? `${s.joinedAt ? ' · ' : ''}Resp.: ${s.guardianName}` : ''}
                  {s.phone ? `${s.joinedAt || s.guardianName ? ' · ' : ''}${s.phone}` : ''}
                </p>
              )}
              {(groupsByStudent.get(s._id)?.length ?? 0) > 0 && (
                <div className='flex flex-col gap-0.5'>
                  {groupsByStudent.get(s._id)!.map((g) => (
                    <p key={g._id} className='text-[13px] text-[#455a54]'>
                      {g.name}
                      {g.professorName ? ` · Prof. ${g.professorName}` : ''}
                    </p>
                  ))}
                </div>
              )}
              <div className='flex items-center justify-end gap-1.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setDetail(s)}
                  className='h-7 border border-[#e6dbcd] bg-white px-2 text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
                >
                  Ficha
                </Button>
                {isAdmin && (
                  <>
                    <IconBtn
                      icon={Pencil}
                      title='Editar'
                      tone='verde'
                      onClick={() => {
                        setEditing(s);
                        setSelectedClient(s.clientId ? { id: s.clientId, fullName: s.clientName ?? s.name, prepaid: 0, createdAt: '', updatedAt: '' } : null);
                        setForm({
                          name: s.name,
                          clientId: s.clientId,
                          phone: s.phone,
                          email: s.email,
                          guardianName: s.guardianName,
                          birthDate: s.birthDate?.slice(0, 10),
                          joinedAt: s.joinedAt?.slice(0, 10),
                          adminNotes: s.adminNotes,
                          practicalNotes: s.practicalNotes,
                          isActive: s.isActive,
                        });
                      }}
                    />
                    <IconBtn
                      icon={Trash2}
                      title='Dar de baja'
                      tone='rojo'
                      onClick={() => remove(s)}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alta / edición */}
      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent className='sm:max-w-md'>
            <DialogHeader className='text-left'>
              <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
                {editing ? 'Editar alumno' : 'Nuevo alumno'}
              </DialogTitle>
            </DialogHeader>
            <div className='flex flex-col gap-3'>
              <Field label='Vincular a un cliente (opcional)'>
                <AsyncSelect<Client>
                  value={selectedClient}
                  onChange={(client) => {
                    if (!client) {
                      setSelectedClient(null);
                      setForm((current) => current ? { ...current, clientId: undefined } : current);
                      return;
                    }
                    const clientId = clientIdOf(client);
                    const normalized = { ...client, id: clientId };
                    setSelectedClient(normalized);
                    setForm((current) => current ? {
                      ...current,
                      clientId,
                      name: client.fullName,
                      phone: client.phone ?? '',
                      email: client.email ?? '',
                    } : current);
                  }}
                  fetcher={async (term, page, pageSize) => {
                    const result = await clientsService.getClients(page, pageSize, { search: term });
                    return {
                      items: result.data.data.map((client) => ({ ...client, id: clientIdOf(client) })),
                      hasMore: result.data.meta.hasNextPage,
                    };
                  }}
                  getKey={clientIdOf}
                  getLabel={(client) => client.fullName}
                  placeholder='Buscá un cliente por nombre…'
                  noResultsLabel='No encontramos clientes'
                  className='w-full'
                />
                <p className='mt-1 text-[11px] text-[#7a6e6f]'>Al elegirlo se completan sus datos y queda asociado al alumno.</p>
              </Field>
              {selectedClient ? (
                <div className='rounded-xl border border-[#bfd2c9] bg-[#E7F0EC] px-3 py-2 text-sm text-[#455a54]'>
                  <p className='font-semibold'>Datos tomados del cliente</p>
                  <p>{selectedClient.fullName}</p>
                  {(selectedClient.phone || selectedClient.email) && (
                    <p className='text-xs text-[#6d7d77]'>
                      {[selectedClient.phone, selectedClient.email].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <Field label='Nombre y apellido'>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={fieldCls}
                    />
                  </Field>
                  <div className='grid grid-cols-2 gap-3'>
                    <Field label='Teléfono'>
                      <Input
                        value={form.phone ?? ''}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className={fieldCls}
                      />
                    </Field>
                    <Field label='Email'>
                      <Input
                        value={form.email ?? ''}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={fieldCls}
                      />
                    </Field>
                  </div>
                </>
              )}
              <Field label='Adulto responsable (escuelita)'>
                <Input
                  value={form.guardianName ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, guardianName: e.target.value })
                  }
                  placeholder='Para niños: mamá/papá y contacto'
                  className={fieldCls}
                />
              </Field>
              <div className='grid grid-cols-2 gap-3'>
                <Field label='Nacimiento'>
                  <DateInput
                    value={form.birthDate}
                    onChange={(birthDate) => setForm({ ...form, birthDate })}
                  />
                </Field>
                <Field label='Incorporación'>
                  <DateInput
                    value={form.joinedAt}
                    onChange={(joinedAt) => setForm({ ...form, joinedAt })}
                  />
                </Field>
              </div>
              <Field label='Notas administrativas'>
                <Textarea
                  value={form.adminNotes ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, adminNotes: e.target.value })
                  }
                  rows={2}
                  placeholder='Acuerdos de pago, situaciones a seguir…'
                  className={fieldCls}
                />
              </Field>
              <Field label='Notas de práctica (las ve el profesor)'>
                <Textarea
                  value={form.practicalNotes ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, practicalNotes: e.target.value })
                  }
                  rows={2}
                  placeholder='Técnica, avances, materiales…'
                  className={fieldCls}
                />
              </Field>
              <div className='flex items-center gap-2.5'>
                <Switch
                  id='alumno-activo'
                  checked={form.isActive ?? true}
                  onCheckedChange={(isActive) => setForm({ ...form, isActive })}
                  className='data-[state=checked]:bg-[#455a54]'
                />
                <Label htmlFor='alumno-activo' className='text-sm text-[#455a54]'>
                  Activo (cursando)
                </Label>
              </div>
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

      {detail && (
        <StudentDetailDialog
          student={detail}
          isAdmin={isAdmin}
          onClose={() => setDetail(null)}
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

const ATT_LABEL: Record<string, string> = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
  MAKEUP: 'Recuperando',
};

/**
 * Ficha del alumno. Admin: pestañas Administrativa (pagos, regularidad) y
 * Práctica. Cuentas no-admin (profesores): sólo la práctica.
 */
function StudentDetailDialog({
  student,
  isAdmin,
  onClose,
}: Readonly<{
  student: Student;
  isAdmin: boolean;
  onClose: () => void;
}>) {
  const [tab, setTab] = useState<'admin' | 'practica'>(
    isAdmin ? 'admin' : 'practica',
  );
  const [adminData, setAdminData] = useState<StudentAdminProfile | null>(null);
  const [practical, setPractical] = useState<StudentPracticalProfile | null>(
    null,
  );
  const [payForm, setPayForm] = useState<{
    concept: string;
    amount: number;
    status: 'PAID' | 'PENDING';
    dueDate?: string;
    method?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAdmin = useCallback(async () => {
    try {
      setAdminData(await tallerAdmin.adminProfile(student._id));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    }
  }, [student._id]);
  const loadPractical = useCallback(async () => {
    try {
      setPractical(await tallerAdmin.practicalProfile(student._id));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    }
  }, [student._id]);

  useEffect(() => {
    if (isAdmin) loadAdmin();
    loadPractical();
  }, [isAdmin, loadAdmin, loadPractical]);

  async function savePayment() {
    if (!payForm) return;
    if (!payForm.concept.trim() || payForm.amount <= 0)
      return showToast.error('Concepto y monto son obligatorios');
    setSaving(true);
    try {
      await tallerAdmin.addPayment(student._id, payForm);
      setPayForm(null);
      await loadAdmin();
      showToast.success('Registrado');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(paymentId: string) {
    try {
      await tallerAdmin.updatePayment(paymentId, { status: 'PAID' });
      await loadAdmin();
      showToast.success('Marcada como pagada');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  const chip = (on: boolean) =>
    `rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition ${
      on
        ? 'border-[#455a54] bg-[#455a54] text-white'
        : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
    }`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl font-bold text-[#455a54]'>
            {student.name}
          </DialogTitle>
        </DialogHeader>

        {isAdmin && (
          <div className='flex gap-1.5'>
            <button type='button' className={chip(tab === 'admin')} onClick={() => setTab('admin')}>
              Administrativo
            </button>
            <button
              type='button'
              className={chip(tab === 'practica')}
              onClick={() => setTab('practica')}
            >
              Práctica
            </button>
          </div>
        )}

        {tab === 'admin' && isAdmin && (
          <div className='flex flex-col gap-3'>
            {!adminData ? (
              <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
            ) : (
              <>
                <div className='rounded-xl border border-[#e6dbcd] bg-[#fbf5ef] p-3 text-[13px] text-[#455a54]'>
                  <p>
                    Incorporación: {fmtDate(adminData.student.joinedAt)}
                    {adminData.student.phone && ` · ${adminData.student.phone}`}
                    {adminData.student.email && ` · ${adminData.student.email}`}
                  </p>
                  {adminData.student.guardianName && (
                    <p>Responsable: {adminData.student.guardianName}</p>
                  )}
                  {adminData.groups.length > 0 && (
                    <p>
                      Cursa:{' '}
                      {adminData.groups
                        .map(
                          (g) =>
                            `${g.name} (${g.schedule
                              .map((sl) => `${WEEKDAY_SHORT[sl.weekday]} ${sl.start}`)
                              .join(', ')})`,
                        )
                        .join(' · ')}
                    </p>
                  )}
                  {adminData.student.adminNotes && (
                    <p className='mt-1 text-[#7a6e6f]'>
                      📝 {adminData.student.adminNotes}
                    </p>
                  )}
                </div>

                {/* Regularidad */}
                <div
                  className={`rounded-xl border p-3 text-sm ${
                    adminData.regularity.upToDate
                      ? 'border-[#c9dcd2] bg-[#E7F0EC] text-[#455a54]'
                      : 'border-[#efb9b9] bg-[#fbe4e4] text-[#a33]'
                  }`}
                >
                  {adminData.regularity.upToDate
                    ? '✓ Al día con los pagos'
                    : `⚠ ${adminData.regularity.overdueCount} cuota(s) vencida(s) por ${fmtPrice(adminData.regularity.overdueAmount)}`}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <span className='text-sm font-semibold text-[#455a54]'>
                    Historial de regularidad
                  </span>
                  {adminData.regularityHistory.length === 0 ? (
                    <p className='text-xs text-[#7a6e6f]'>
                      Se empezará a registrar con los próximos cambios de cuota.
                    </p>
                  ) : (
                    <div className='flex flex-col gap-1'>
                      {adminData.regularityHistory.map((event) => (
                        <div
                          key={event._id}
                          className='flex items-center justify-between rounded-lg border border-[#e6dbcd] px-3 py-2 text-[12px]'
                        >
                          <span className={event.status === 'UP_TO_DATE' ? 'text-[#455a54]' : 'text-[#a33]'}>
                            {event.status === 'UP_TO_DATE'
                              ? '✓ Al día'
                              : `⚠ ${event.overdueCount} cuota(s) vencida(s)`}
                          </span>
                          <span className='text-[#7a6e6f]'>
                            {fmtDate(event.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historial de pagos */}
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-semibold text-[#455a54]'>
                    Historial de pagos
                  </span>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setPayForm({ concept: '', amount: 0, status: 'PAID' })
                    }
                    className='h-7 gap-1 border-[#e6dbcd] bg-white px-2 text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
                  >
                    <Plus className='h-3 w-3' />
                    Registrar
                  </Button>
                </div>
                {adminData.payments.length === 0 ? (
                  <p className='text-xs text-[#7a6e6f]'>Sin pagos registrados.</p>
                ) : (
                  <div className='flex flex-col gap-1.5'>
                    {adminData.payments.map((p) => {
                      const overdue =
                        p.status === 'PENDING' &&
                        p.dueDate &&
                        new Date(p.dueDate) < new Date();
                      return (
                        <div
                          key={p._id}
                          className='flex flex-wrap items-center gap-2 rounded-lg border border-[#e6dbcd] px-3 py-2 text-[13px] text-[#3d3338]'
                        >
                          <span className='font-medium'>{p.concept}</span>
                          <span>{fmtPrice(p.amount)}</span>
                          {p.status === 'PAID' ? (
                            <StatusBadge
                              label={`Pagada ${fmtDate(p.paidAt)}`}
                              bg='#E7F0EC'
                              fg='#455a54'
                            />
                          ) : (
                            <StatusBadge
                              label={
                                overdue
                                  ? `VENCIDA ${fmtDate(p.dueDate)}`
                                  : `Vence ${fmtDate(p.dueDate)}`
                              }
                              bg={overdue ? '#fbe4e4' : '#fdf6e3'}
                              fg={overdue ? '#a33' : '#8a6d1a'}
                            />
                          )}
                          {p.method && (
                            <span className='text-[#7a6e6f]'>· {p.method}</span>
                          )}
                          {p.status === 'PENDING' && (
                            <button
                              type='button'
                              onClick={() => markPaid(p._id)}
                              className='ml-auto text-[12px] font-medium text-[#455a54] underline hover:opacity-70'
                            >
                              Marcar pagada
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {payForm && (
                  <div className='flex flex-col gap-2 rounded-xl border-2 border-[#9d684e]/40 bg-[#fbf5ef]/60 p-3'>
                    <Input
                      value={payForm.concept}
                      onChange={(e) =>
                        setPayForm({ ...payForm, concept: e.target.value })
                      }
                      placeholder="Concepto ('Cuota agosto 2026')"
                      className={`${fieldCls} h-9`}
                    />
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-sm text-[#7a6e6f]'>$</span>
                      <Input
                        type='number'
                        min={0}
                        value={payForm.amount || ''}
                        onChange={(e) =>
                          setPayForm({
                            ...payForm,
                            amount: Number(e.target.value),
                          })
                        }
                        className={`${fieldCls} h-9 w-32`}
                      />
                      <button
                        type='button'
                        onClick={() =>
                          setPayForm({
                            ...payForm,
                            status:
                              payForm.status === 'PAID' ? 'PENDING' : 'PAID',
                          })
                        }
                        className={chip(true)}
                      >
                        {payForm.status === 'PAID'
                          ? 'Pago recibido'
                          : 'Cuota a cobrar'}
                      </button>
                      {payForm.status === 'PENDING' && (
                        <DateInput
                          value={payForm.dueDate}
                          onChange={(dueDate) =>
                            setPayForm({ ...payForm, dueDate })
                          }
                          className='w-36'
                        />
                      )}
                      {payForm.status === 'PAID' && (
                        <select
                          value={payForm.method ?? ''}
                          onChange={(e) =>
                            setPayForm({ ...payForm, method: e.target.value })
                          }
                          className={`${fieldCls} h-9 w-40 rounded-md border px-2 text-sm`}
                        >
                          <option value=''>Medio de pago…</option>
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className='flex justify-end gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => setPayForm(null)}
                        className='border-[#e6dbcd] text-[#455a54]'
                      >
                        Cancelar
                      </Button>
                      <Button
                        type='button'
                        variant='verde'
                        size='sm'
                        onClick={savePayment}
                        disabled={saving}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'practica' && (
          <div className='flex flex-col gap-3'>
            {!practical ? (
              <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
            ) : (
              <>
                {practical.groups.length > 0 ? (
                  <div className='rounded-xl border border-[#e6dbcd] bg-[#fbf5ef] p-3 text-[13px] text-[#455a54]'>
                    {practical.groups.map((g) => (
                      <p key={g._id}>
                        <span className='font-medium'>{g.name}</span>
                        {' · '}
                        {g.schedule
                          .map(
                            (sl) =>
                              `${WEEKDAY_SHORT[sl.weekday]} ${sl.start}–${sl.end}`,
                          )
                          .join(' · ') || 'sin horario cargado'}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className='text-xs text-[#7a6e6f]'>
                    No está asignado a ningún grupo.
                  </p>
                )}
                {practical.student.practicalNotes && (
                  <p className='text-[13px] text-[#455a54]'>
                    📝 {practical.student.practicalNotes}
                  </p>
                )}

                <span className='text-sm font-semibold text-[#455a54]'>
                  Últimas clases
                </span>
                {practical.attendance.length === 0 ? (
                  <p className='text-xs text-[#7a6e6f]'>Sin asistencias registradas.</p>
                ) : (
                  <div className='flex flex-wrap gap-1.5'>
                    {practical.attendance.slice(0, 12).map((a) => (
                      <span
                        key={`${a.groupId}-${a.dateKey}`}
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${
                          a.record?.status === 'ABSENT'
                            ? 'border-[#efb9b9] bg-[#fbe4e4] text-[#a33]'
                            : a.record?.status === 'MAKEUP'
                              ? 'border-[#d9c9e6] bg-[#efe6f2] text-[#6d5a78]'
                              : 'border-[#c9dcd2] bg-[#E7F0EC] text-[#455a54]'
                        }`}
                        title={a.record?.notes}
                      >
                        {fmtDate(a.dateKey)} ·{' '}
                        {ATT_LABEL[a.record?.status ?? 'PRESENT']}
                      </span>
                    ))}
                  </div>
                )}

                <span className='text-sm font-semibold text-[#455a54]'>Piezas</span>
                {practical.pieces.length === 0 ? (
                  <p className='text-xs text-[#7a6e6f]'>Sin piezas registradas.</p>
                ) : (
                  <div className='flex flex-col gap-1.5'>
                    {practical.pieces.map((p) => (
                      <div
                        key={p._id}
                        className='flex flex-wrap items-center gap-2 rounded-lg border border-[#e6dbcd] px-3 py-2 text-[13px] text-[#3d3338]'
                      >
                        <span className='font-medium'>
                          {p.notes || p.experienceName || 'Pieza'}
                        </span>
                        <span className='text-[#7a6e6f]'>×{p.quantity}</span>
                        <StatusBadge label={p.status} bg='#f3e7db' fg='#9d684e' />
                        {(p.photos?.length ?? 0) > 0 && (
                          <span className='text-[11px] text-[#7a6e6f]'>
                            📷 {p.photos!.length}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
