'use client';

// Configuración general del bot: encendido/apagado, datos del negocio, datos
// de transferencia y los textos fijos (los que NO pasan por la IA).

import { useEffect, useState } from 'react';
import { Loader2, Power, Save } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  botAdmin,
  type BotBusiness,
  type BotSettings,
  type BotTexts,
  type BotTransfer,
} from '@/services/bot.admin.service';
import { Field, Section, fieldCls } from './_shared';

const BUSINESS: { key: keyof BotBusiness; label: string; help?: string }[] = [
  { key: 'name', label: 'Nombre del negocio' },
  { key: 'address', label: 'Dirección' },
  { key: 'maps', label: 'Link de Google Maps', help: 'URL completa: WhatsApp la vuelve clickeable.' },
  { key: 'hours', label: 'Horarios del local', help: 'Texto libre, como se lo dirías a un cliente.' },
  { key: 'instagram', label: 'Instagram (URL)' },
  { key: 'facebook', label: 'Facebook (URL)', help: 'Vacío = no lo menciona.' },
];

const TRANSFER: { key: keyof BotTransfer; label: string; help?: string }[] = [
  { key: 'alias', label: 'Alias' },
  { key: 'ownerName', label: 'Titular' },
  { key: 'ownerCuit', label: 'CUIT del titular', help: 'Sólo números. Se usa para validar los comprobantes.' },
  { key: 'bank', label: 'Banco / billetera' },
];

const TEXTS: { key: keyof BotTexts; label: string; help: string }[] = [
  {
    key: 'greeting',
    label: 'Saludo inicial',
    help: 'Cuando alguien escribe sólo "hola" al empezar una charla. {negocio} se reemplaza por el nombre.',
  },
  { key: 'farewell', label: 'Despedida', help: 'Cuando la persona se despide y no hay una reserva en curso.' },
  { key: 'botOff', label: 'Bot apagado', help: 'Con el bot apagado, cada charla nueva recibe esto y pasa al equipo.' },
  {
    key: 'error',
    label: 'Error',
    help: 'Si algo falla al responder. {redes} y {lugar} se completan con los datos de arriba.',
  },
  { key: 'audioFail', label: 'No entendió un audio', help: 'Cuando no se pudo transcribir una nota de voz.' },
  { key: 'rateLimit', label: 'Demasiados mensajes seguidos', help: 'Freno anti-spam (una vez por ventana).' },
  {
    key: 'safeFallback',
    label: 'Respuesta de resguardo',
    help: 'Cuando la IA no logra armar una respuesta válida.',
  },
  { key: 'jailbreakRefusal', label: 'Pedido fuera de lugar', help: 'Ante intentos de manipular al bot.' },
  { key: 'transferNotReceipt', label: 'La imagen no es un comprobante', help: 'Cuando mandan una foto que no se puede leer como comprobante.' },
  { key: 'transferReview', label: 'Comprobante a revisar', help: 'Se recibió pero no se pudo validar automáticamente.' },
  { key: 'transferOrphan', label: 'Comprobante sin reserva', help: 'Mandan un comprobante y no hay reserva esperando.' },
  { key: 'transferExpired', label: 'Comprobante vencido', help: 'Se venció el tiempo para transferir y el lugar se liberó.' },
];

export function BotConfigPanel() {
  const [cfg, setCfg] = useState<BotSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    botAdmin
      .settings()
      .then(setCfg)
      .catch((e) => showToast.error(e instanceof Error ? e.message : 'No se pudo cargar la configuración'));
  }, []);

  if (!cfg) {
    return (
      <div className='flex justify-center py-16'>
        <Loader2 className='h-6 w-6 animate-spin text-[#9d684e]' />
      </div>
    );
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      setCfg(await botAdmin.saveSettings(cfg));
      showToast.success('Configuración guardada. El bot la toma en menos de un minuto.');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(on: boolean) {
    if (!cfg) return;
    const prev = cfg;
    setCfg({ ...cfg, botActive: on });
    try {
      setCfg(await botAdmin.saveSettings({ botActive: on }));
      showToast.success(on ? 'Bot encendido' : 'Bot apagado: las charlas nuevas pasan al equipo');
    } catch (e) {
      setCfg(prev);
      showToast.error(e instanceof Error ? e.message : 'No se pudo cambiar');
    }
  }

  const setB = (k: keyof BotBusiness, v: string) =>
    setCfg({ ...cfg, business: { ...cfg.business, [k]: v } });
  const setT = (k: keyof BotTransfer, v: string) =>
    setCfg({ ...cfg, transfer: { ...cfg.transfer, [k]: v } });
  const setX = (k: keyof BotTexts, v: string) =>
    setCfg({ ...cfg, texts: { ...cfg.texts, [k]: v } });

  return (
    <div className='flex flex-col gap-5'>
      {/* Encendido */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5',
          cfg.botActive ? 'border-[#bfd2c9] bg-[#E7F0EC]' : 'border-[#e6dbcd] bg-[#f6e2e2]',
        )}
      >
        <div className='flex items-center gap-3'>
          <Power className={cn('h-5 w-5', cfg.botActive ? 'text-[#455a54]' : 'text-[#b23b2e]')} />
          <div>
            <p className='font-tan-nimbus text-lg font-bold text-[#455a54]'>
              {cfg.botActive ? 'Bot encendido' : 'Bot apagado'}
            </p>
            <p className='text-sm text-[#7a6e6f]'>
              {cfg.botActive
                ? 'Responde solo las consultas de WhatsApp.'
                : 'No responde con IA: cada charla nueva avisa y pasa al equipo (Consultas).'}
            </p>
          </div>
        </div>
        <Switch checked={cfg.botActive} onCheckedChange={toggleActive} aria-label='Bot encendido' />
      </div>

      <Section
        title='Datos del negocio'
        help='Lo que el bot recita tal cual (nunca lo inventa): dirección, horarios, redes.'
      >
        <div className='grid gap-4 md:grid-cols-2'>
          {BUSINESS.map((f) => (
            <Field key={f.key} label={f.label} help={f.help}>
              <Input value={cfg.business[f.key] ?? ''} onChange={(e) => setB(f.key, e.target.value)} className={fieldCls} />
            </Field>
          ))}
        </div>
      </Section>

      <Section
        title='Datos para la seña por transferencia'
        help='Se los pasa al cliente al reservar y se usan para validar el comprobante que manda.'
      >
        <div className='grid gap-4 md:grid-cols-2'>
          {TRANSFER.map((f) => (
            <Field key={f.key} label={f.label} help={f.help}>
              <Input value={cfg.transfer[f.key] ?? ''} onChange={(e) => setT(f.key, e.target.value)} className={fieldCls} />
            </Field>
          ))}
        </div>
      </Section>

      <Section
        title='Textos fijos'
        help='Mensajes que el bot manda siempre iguales (no pasan por la IA). El resto de las respuestas las arma Ariadna con las políticas de "Preguntas y respuestas".'
      >
        <div className='grid gap-4 md:grid-cols-2'>
          {TEXTS.map((f) => (
            <Field key={f.key} label={f.label} help={f.help}>
              <Textarea
                rows={4}
                value={cfg.texts[f.key] ?? ''}
                onChange={(e) => setX(f.key, e.target.value)}
                className={cn(fieldCls, 'text-sm')}
              />
            </Field>
          ))}
        </div>
      </Section>

      <div className='sticky bottom-4 flex justify-end'>
        <Button type='button' variant='verde' className='gap-2 shadow-lg' disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
