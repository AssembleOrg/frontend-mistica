'use client';

// Preguntas frecuentes / políticas del bot. No se responden literal: Ariadna
// las usa como "política definida" con su tono. Lo que no está acá, el bot
// NO lo promete (lo deriva al equipo).

import { useEffect, useState } from 'react';
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { botAdmin, type BotFaq, type BotFaqInput } from '@/services/bot.admin.service';
import { IconBtn } from '../_shared';
import { Field, Section, fieldCls } from './_shared';

export function BotFaqPanel() {
  const confirm = useConfirm();
  const [items, setItems] = useState<BotFaq[] | null>(null);
  const [editing, setEditing] = useState<BotFaq | 'new' | null>(null);

  async function load() {
    try {
      setItems(await botAdmin.faqs());
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudieron cargar las preguntas');
      setItems([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(f: BotFaq) {
    try {
      const updated = await botAdmin.updateFaq(f.id, { active: !f.active });
      setItems((prev) => (prev ?? []).map((x) => (x.id === f.id ? updated : x)));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cambiar');
    }
  }

  async function remove(f: BotFaq) {
    const ok = await confirm({
      title: 'Borrar pregunta',
      description: `¿Borrar "${f.title}"? El bot deja de conocer esa política.`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    try {
      await botAdmin.deleteFaq(f.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== f.id));
      showToast.success('Pregunta borrada');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo borrar');
    }
  }

  async function move(f: BotFaq, dir: -1 | 1) {
    const list = items ?? [];
    const i = list.findIndex((x) => x.id === f.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    try {
      const [ua, ub] = await Promise.all([
        botAdmin.updateFaq(a.id, { order: j }),
        botAdmin.updateFaq(b.id, { order: i }),
      ]);
      const next = [...list];
      next[i] = ub;
      next[j] = ua;
      setItems(next);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo reordenar');
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      <Section
        title='Preguntas y respuestas'
        help='Políticas y preguntas frecuentes que el bot conoce. Las contesta con su tono, sin inventar: lo que no está acá, lo deriva al equipo.'
        action={
          <Button type='button' variant='verde' className='gap-2' onClick={() => setEditing('new')}>
            <Plus className='h-4 w-4' /> Nueva pregunta
          </Button>
        }
      >
        {items === null ? (
          <div className='flex justify-center py-10'>
            <Loader2 className='h-6 w-6 animate-spin text-[#9d684e]' />
          </div>
        ) : items.length === 0 ? (
          <p className='rounded-xl border border-dashed border-[#e6dbcd] bg-[#fbf5ef] p-6 text-center text-sm text-[#7a6e6f]'>
            Todavía no hay preguntas cargadas.
          </p>
        ) : (
          <div className='flex flex-col gap-2'>
            {items.map((f, idx) => (
              <div
                key={f.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border border-[#e6dbcd] p-4',
                  !f.active && 'opacity-60',
                )}
              >
                <div className='flex flex-col items-center gap-0.5 pt-0.5 text-[#c3b7a4]'>
                  <button type='button' onClick={() => void move(f, -1)} disabled={idx === 0} className='disabled:opacity-30' aria-label='Subir'>
                    <GripVertical className='h-4 w-4 rotate-90' />
                  </button>
                  <button type='button' onClick={() => void move(f, 1)} disabled={idx === items.length - 1} className='disabled:opacity-30' aria-label='Bajar'>
                    <GripVertical className='h-4 w-4 -rotate-90' />
                  </button>
                </div>
                <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                  <p className='font-semibold text-[#3d3338]'>{f.title}</p>
                  <p className='whitespace-pre-wrap text-sm text-[#455a54]'>{f.answer}</p>
                  {f.examples.length > 0 && (
                    <div className='flex flex-wrap gap-1.5 pt-1'>
                      {f.examples.map((e, i) => (
                        <span key={i} className='rounded-full bg-[#fbf5ef] px-2.5 py-0.5 text-xs text-[#7a6e6f]'>
                          “{e}”
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className='flex shrink-0 items-center gap-1.5'>
                  <Switch checked={f.active} onCheckedChange={() => void toggle(f)} aria-label='Activa' />
                  <IconBtn icon={Pencil} title='Editar' onClick={() => setEditing(f)} />
                  <IconBtn icon={Trash2} title='Borrar' tone='rojo' onClick={() => void remove(f)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {editing && (
        <FaqModal
          faq={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function FaqModal({
  faq,
  onClose,
  onDone,
}: {
  faq: BotFaq | null;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(faq?.title ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');
  const [examples, setExamples] = useState((faq?.examples ?? []).join('\n'));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (title.trim().length < 2) return showToast.error('Poné un título');
    if (answer.trim().length < 2) return showToast.error('Poné la respuesta');
    const input: BotFaqInput = {
      title: title.trim(),
      answer: answer.trim(),
      examples: examples
        .split('\n')
        .map((e) => e.trim())
        .filter(Boolean),
    };
    setSaving(true);
    try {
      if (faq) await botAdmin.updateFaq(faq.id, input);
      else await botAdmin.createFaq(input);
      showToast.success(faq ? 'Pregunta actualizada' : 'Pregunta creada');
      await onDone();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            {faq ? 'Editar pregunta' : 'Nueva pregunta'}
          </DialogTitle>
          <DialogDescription>
            El bot la va a usar con su tono. Escribí la política como se la explicarías a un cliente.
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <Field label='Tema / pregunta'>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='¿Hacen gift cards?' className={fieldCls} autoFocus />
          </Field>
          <Field label='Respuesta / política'>
            <Textarea
              rows={5}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder='Sí, hacemos gift cards. Se abona el total al comprarla y hay 2 meses para canjearla…'
              className={cn(fieldCls, 'text-sm')}
            />
          </Field>
          <Field label='Cómo lo preguntan (opcional)' help='Una por línea. Ayuda al bot a reconocer el tema.'>
            <Textarea
              rows={3}
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
              placeholder={'quiero regalar una experiencia\nvale regalo'}
              className={cn(fieldCls, 'text-sm')}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose} className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54]'>
            Cancelar
          </Button>
          <Button type='button' variant='verde' disabled={saving} onClick={() => void save()}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
