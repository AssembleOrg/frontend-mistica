'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Clock3,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { ReservationForm } from '@/components/landing/reservation-form';
import { ManageByCode } from '@/components/landing/manage-by-code';
import { ExperienceIndex } from '@/components/landing/experience-index';
import { BookingSheet } from '@/components/landing/booking-sheet';
import { LandingNav } from '@/components/landing/landing-nav';
import { Reveal } from '@/components/landing/reveal';
import {
  reservationsPublic,
  type PublicExperience,
  type PublicSession,
} from '@/services/reservations.public.service';

const WA_MISTICA =
  'https://api.whatsapp.com/send/?phone=5491138207230&text=Hola+M%C3%ADstica%2C+quiero+coordinar+un+evento.&type=phone_number&app_absent=0';
const WA_PISTECH =
  'https://api.whatsapp.com/send/?phone=5491138207230&text=Hola+Pistech%2C+me+comunico+a+trav%C3%A9s+de+mistica+web.+Me+gustar%C3%ADa+saber+m%C3%A1s+sobre+sus+servicios+digitales.&type=phone_number&app_absent=0';
const MAPS = 'https://www.google.com/maps/search/?api=1&query=Videla+57+Quilmes';
const IG = 'https://www.instagram.com/mistica.autentica/';

const STEPS: [string, string, string][] = [
  ['01', 'Elegí tu experiencia', 'Mirá los talleres, fechas y horarios disponibles y sumá la cantidad de personas.'],
  ['02', 'Confirmá y señá', 'Cargás tus datos y reservás tu lugar al instante, sin llamadas ni esperas.'],
  ['03', 'Guardá tu código', 'Recibís un código de 6 caracteres para modificar o cancelar cuando quieras.'],
];

const STATS: [string, string][] = [
  ['12.7K', 'Personas en la comunidad'],
  ['+200', 'Talleres realizados'],
  ['Buffet libre', 'Creá mientras disfrutás'],
];

const FAQS: [string, string][] = [
  ['¿Qué incluye una experiencia?', 'Los materiales, la guía de nuestros artistas y el café. Solo traé ganas de ensuciarte las manos.'],
  ['¿Cómo funciona la seña?', 'Al reservar abonás una seña con MercadoPago. El saldo lo completás en el local el día de la experiencia.'],
  ['¿Puedo cancelar o modificar?', 'Sí. Con el código de 6 caracteres que recibís podés gestionar tu reserva sin cuentas ni contraseñas.'],
  ['¿Organizan cumpleaños y eventos privados?', 'Sí, los coordinamos a medida. Escribinos y armamos la experiencia para tu grupo.'],
];

export default function LandingPage() {
  const [experiences, setExperiences] = useState<PublicExperience[]>([]);
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingExp, setBookingExp] = useState<PublicExperience | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [exps, sess] = await Promise.all([
          reservationsPublic.listExperiences(),
          reservationsPublic.listSessions(),
        ]);
        if (!alive) return;
        setExperiences(exps);
        setSessions(sess);
      } catch {
        /* la landing se muestra igual sin datos */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const scrollToReservar = () =>
    document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className='w-full overflow-x-hidden bg-arena font-inter text-ciruela-oscuro'>
      <LandingNav onReservar={scrollToReservar} />

      {/* ─────────── HERO (editorial split + reveal) ─────────── */}
      <section className='grain relative isolate flex min-h-[100dvh] flex-col overflow-hidden'>
        {/* Fondo: foto a sangre con máscara/gradiente cuidado */}
        <div className='absolute inset-0 -z-10'>
          <Image
            src='/landing/hero.webp'
            alt='Manos trabajando el barro en Mística'
            fill
            priority
            className='object-cover'
          />
          <div className='absolute inset-0 [background-image:linear-gradient(105deg,_#2A1A12F2_0%,_#2A1A1299_46%,_#2A1A1233_100%)]' />
          <div className='absolute inset-0 [background-image:linear-gradient(0deg,_#2A1A12E6_0%,_transparent_38%)]' />
        </div>

        {/* Contenido: bloque tipográfico dominante, abajo-izquierda */}
        <div className='mt-auto flex flex-col gap-7 px-6 pb-16 pt-32 sm:px-10 sm:pb-20 lg:px-16 lg:pb-24'>
          <h1 className='max-w-[15ch] font-playfair text-6xl font-medium leading-[0.92] tracking-tight text-arena sm:text-8xl lg:text-[128px] lg:leading-[0.88]'>
            <span
              className='enter block'
              style={{ animationDelay: '0.15s' }}
            >
              Creá con
            </span>
            <span
              className='enter block italic text-durazno'
              style={{ animationDelay: '0.3s' }}
            >
              tus manos.
            </span>
          </h1>

          <p
            className='enter max-w-[520px] text-base leading-relaxed text-arena/85 sm:text-[19px]'
            style={{ animationDelay: '0.5s' }}
          >
            Talleres, eventos y cumpleaños donde el barro, el arte y el café se
            encuentran. Reservá una tarde para crear algo tuyo.
          </p>

          <div
            className='enter flex flex-wrap items-center gap-3.5'
            style={{ animationDelay: '0.65s' }}
          >
            <button
              type='button'
              onClick={scrollToReservar}
              className='press flex items-center gap-2.5 bg-arena px-8 py-4 font-mono text-xs uppercase tracking-[0.14em] text-ciruela-oscuro transition hover:bg-white'
            >
              Reservar experiencia <ArrowRight className='h-[18px] w-[18px]' />
            </button>
            <a
              href='#experiencias'
              className='press border border-arena px-8 py-4 font-mono text-xs uppercase tracking-[0.14em] text-arena transition hover:bg-arena hover:text-ciruela-oscuro'
            >
              Ver talleres
            </a>
          </div>
        </div>

        {/* Pie del hero: metadatos editoriales */}
        <div
          className='enter hidden items-end justify-between border-t border-arena/15 px-6 py-6 sm:flex sm:px-10 lg:px-16'
          style={{ animationDelay: '0.8s' }}
        >
          {[
            ['Buffet libre + arte', 'Creá mientras disfrutás'],
            ['@hechoenmistica', 'Regalería & tienda holística'],
            ['Videla 57', 'Quilmes, Bs. As.'],
          ].map(([t, s]) => (
            <div key={t} className='flex flex-col gap-1'>
              <span className='font-mono text-[11px] uppercase tracking-[0.12em] text-arena'>
                {t}
              </span>
              <span className='text-[13px] text-arena/65'>{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── MANIFIESTO (ancla "Experiencias" del nav) ─────────── */}
      <section
        id='experiencias'
        className='mx-auto w-full max-w-[900px] px-6 py-24 text-center sm:px-10 lg:py-[130px]'
      >
        <Reveal>
          <p className='font-playfair text-2xl font-medium leading-[1.4] text-ciruela-oscuro sm:text-[32px] sm:leading-[1.4]'>
            Un espacio donde el arte se vive con las manos. Combinamos
            cerámica, <em className='text-terracota'>buffet libre</em> y una tienda
            holística para que cada visita sea una pausa con sentido.
          </p>
        </Reveal>
      </section>

      {/* ─────────── EXPERIENCIAS (índice editorial) ─────────── */}
      <section
        className='mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-6 pb-[90px] sm:px-10 lg:px-16'
      >
        <Reveal className='flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end'>
          <h2 className='max-w-[680px] font-playfair text-4xl font-medium leading-[1.05] tracking-tight text-ciruela-oscuro sm:text-5xl lg:text-[56px]'>
            Elegí cómo pasar la tarde
          </h2>
          <p className='max-w-[380px] text-base leading-relaxed text-piedra'>
            Cada experiencia incluye los materiales, la guía de nuestros artistas
            y el café. Tocá una para reservar tu lugar.
          </p>
        </Reveal>

        <ExperienceIndex
          experiences={experiences}
          loading={loading}
          onReserve={(exp) => setBookingExp(exp)}
          onConsult={() => window.open(WA_MISTICA, '_blank')}
        />
      </section>

      {/* ─────────── EVENTOS PRIVADOS ─────────── */}
      <section id='eventos' className='grain relative isolate overflow-hidden bg-verde-profundo'>
        {/* Marca de agua: logo grande, sutil, a la derecha */}
        <Image
          src='/Logo-mistica.png'
          alt=''
          aria-hidden
          width={640}
          height={334}
          className='pointer-events-none absolute right-4 top-1/2 hidden w-[460px] max-w-[44%] -translate-y-1/2 opacity-[0.30] md:right-8 md:block'
        />
        <div className='relative mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 py-24 sm:px-10 lg:px-16'>
          <Reveal className='flex flex-col gap-6'>
            <h2 className='max-w-[720px] font-playfair text-4xl font-medium leading-[1.06] tracking-tight text-arena lg:text-[48px]'>
              Celebrá con arcilla, arte y buffet
            </h2>
            <p className='max-w-[560px] text-base leading-relaxed text-arena/80'>
              Cumpleaños, despedidas o encuentros de equipo. Coordinamos una
              experiencia a medida para tu grupo, con todo listo para crear.
            </p>
            <a
              href={WA_MISTICA}
              target='_blank'
              rel='noopener noreferrer'
              className='press mt-2 flex w-fit items-center gap-2.5 bg-arena px-7 py-4 font-mono text-xs uppercase tracking-[0.14em] text-verde-profundo'
            >
              Coordinar un evento <ArrowUpRight className='h-[17px] w-[17px]' />
            </a>
          </Reveal>
        </div>
      </section>

      {/* ─────────── CÓMO FUNCIONA ─────────── */}
      <section id='como-funciona' className='flex flex-col items-center gap-10 bg-arena-2 px-6 py-16 sm:px-10 sm:py-24 lg:gap-[54px] lg:px-16'>
        <Reveal>
          <h2 className='max-w-[760px] text-center font-playfair text-3xl font-medium leading-[1.08] tracking-tight text-ciruela-oscuro sm:text-4xl lg:text-[46px]'>
            Tu lugar reservado en tres pasos
          </h2>
        </Reveal>
        <div className='grid w-full max-w-[1200px] md:grid-cols-3 md:gap-0'>
          {STEPS.map(([n, t, d], i) => (
            <Reveal
              key={n}
              delay={i * 120}
              className='flex items-start gap-4 border-b border-linea py-5 last:border-b-0 md:flex-col md:gap-4 md:border-b-0 md:py-0 md:pr-10'
            >
              {/* Mobile: numeral chico en columna angosta. Desktop: numeral grande + línea. */}
              <span className='w-8 shrink-0 font-playfair text-2xl font-medium leading-none text-durazno md:hidden'>
                {n}
              </span>
              <div className='hidden items-center gap-3.5 md:flex'>
                <span className='font-playfair text-[60px] font-medium leading-none text-durazno'>
                  {n}
                </span>
                <span className='h-px flex-1 bg-linea' />
              </div>
              <div className='flex flex-col gap-1 md:gap-4'>
                <h3 className='font-playfair text-lg font-medium leading-tight text-ciruela-oscuro md:text-2xl'>
                  {t}
                </h3>
                <p className='text-sm leading-relaxed text-piedra md:text-[15px]'>
                  {d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────── BANNER CTA (lleva al form) ─────────── */}
      <button
        type='button'
        onClick={scrollToReservar}
        aria-label='Ir a reservar tu experiencia'
        className='shine press group relative isolate flex w-full items-center justify-center gap-4 overflow-hidden bg-terracota px-6 py-8 text-arena sm:gap-6 sm:py-10'
      >
        <span className='font-mono text-[11px] uppercase tracking-[0.2em] text-arena/70'>
          Reservá tu lugar
        </span>
        <span className='h-4 w-px bg-arena/30' />
        <span className='font-playfair text-2xl font-medium leading-none sm:text-3xl'>
          Tu tarde Mistica te espera
        </span>
        <ArrowRight className='h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5' />
      </button>

      {/* ─────────── FAQ (antes de reservar) ─────────── */}
      <section className='bg-arena py-24'>
        <div className='mx-auto grid w-full max-w-[1080px] gap-12 px-6 sm:px-10 lg:grid-cols-[340px_1fr] lg:px-16'>
          <Reveal>
            <h2 className='font-playfair text-4xl font-medium leading-tight tracking-tight text-ciruela-oscuro'>
              Antes de reservar
            </h2>
          </Reveal>
          <Reveal className='flex flex-col'>
            {FAQS.map(([q, a]) => (
              <details
                key={q}
                className='group border-t border-linea py-5 last:border-b'
              >
                <summary className='press flex cursor-pointer items-center justify-between gap-4 font-playfair text-lg font-medium text-ciruela-oscuro marker:content-none'>
                  {q}
                  <span className='font-mono text-xl text-terracota transition-transform group-open:rotate-45'>
                    +
                  </span>
                </summary>
                <p className='mt-3 max-w-2xl text-[15px] leading-relaxed text-piedra'>
                  {a}
                </p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ─────────── RESERVÁ ─────────── */}
      <section id='reservar' className='bg-rosa-claro py-20 lg:py-[110px]'>
        <div className='mx-auto w-full max-w-[1280px] px-6 sm:px-10 lg:px-16'>
          <Reveal>
            <h2 className='mb-10 font-playfair text-4xl font-medium leading-[1.05] tracking-tight text-ciruela-oscuro lg:text-[44px]'>
              Armá tu reserva en un minuto
            </h2>
          </Reveal>
          {loading ? (
            <div className='h-96 animate-pulse bg-arena/60' />
          ) : (
            <ReservationForm experiences={experiences} sessions={sessions} />
          )}
        </div>
      </section>

      {/* ─────────── GESTIONÁ ─────────── */}
      <section className='bg-terracota py-20'>
        <div className='mx-auto w-full max-w-[1280px] px-6 sm:px-10 lg:px-16'>
          <ManageByCode />
        </div>
      </section>

      {/* ─────────── TIENDA ─────────── */}
      <section className='flex flex-col bg-arena lg:h-[520px] lg:flex-row'>
        <div className='relative h-[280px] w-full lg:h-full lg:flex-1'>
          <Image
            src='/landing/tienda.webp'
            alt='Regalería y tienda holística'
            fill
            className='object-cover'
          />
        </div>
        <Reveal className='flex flex-1 flex-col justify-center gap-5 px-6 py-14 sm:px-10 lg:p-20'>
          <h2 className='font-playfair text-4xl font-medium leading-tight tracking-tight text-ciruela-oscuro lg:text-[42px]'>
            Regalería & tienda holística
          </h2>
          <p className='max-w-[460px] text-base leading-relaxed text-piedra'>
            Piezas hechas a mano, sahumerios, cristales y objetos con intención.
            Llevate un pedacito de Mística o regalá algo único.
          </p>
          <a
            href={IG}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-2.5 pt-1.5 font-mono text-xs uppercase tracking-[0.14em] text-terracota'
          >
            Ver la tienda <ArrowUpRight className='h-[17px] w-[17px]' />
          </a>
        </Reveal>
      </section>

      {/* ─────────── EL ESPACIO (full-bleed inmersiva) ─────────── */}
      <section className='grain relative isolate flex min-h-[620px] flex-col justify-end overflow-hidden lg:min-h-[720px]'>
        <div className='absolute inset-0 -z-10'>
          <Image
            src='/landing/nosotros.webp'
            alt='El espacio de Mística: madera, cerámica y verde'
            fill
            className='object-cover'
          />
          {/* Overlay para contraste AA del texto claro */}
          <div className='absolute inset-0 [background-image:linear-gradient(0deg,_#1F140Ef2_0%,_#1F140E80_46%,_#1F140E4D_100%)]' />
        </div>

        <Reveal className='flex flex-col gap-6 px-6 pb-16 sm:px-10 lg:px-16 lg:pb-20'>
          <h2 className='max-w-[16ch] font-playfair text-4xl font-medium leading-[1.05] tracking-tight text-arena sm:text-5xl lg:text-[58px]'>
            Un lugar para crear, comer y respirar
          </h2>
          <p className='max-w-[540px] text-base leading-relaxed text-arena/80 sm:text-lg'>
            Entre madera, plantas y cerámica al fuego, Mística es una pausa con
            sentido. Se crea con las manos, se comparte en la mesa y se respira
            distinto. En el corazón de Quilmes.
          </p>
          <div className='mt-2 flex flex-wrap items-stretch'>
            {STATS.map(([n, l], i) => (
              <div
                key={l}
                className={`flex flex-col gap-1.5 py-1 pr-10 ${
                  i > 0 ? 'border-l border-arena/20 pl-10' : ''
                }`}
              >
                <span className='font-playfair text-[34px] font-medium text-durazno'>
                  {n}
                </span>
                <span className='max-w-[150px] text-[13px] leading-snug text-arena/70'>
                  {l}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ─────────── UBICACIÓN ─────────── */}
      <section id='visita' className='flex flex-col bg-arena-2 lg:h-[460px] lg:flex-row'>
        <div className='relative h-[220px] w-full overflow-hidden lg:h-full lg:flex-1'>
          <iframe
            title='Mapa Mística Auténtica — Videla 57, Quilmes'
            src='https://maps.google.com/maps?q=Videla%2057%2C%20Quilmes%2C%20Buenos%20Aires&z=16&output=embed'
            className='h-full w-full border-0 grayscale-[0.15]'
            loading='lazy'
            referrerPolicy='no-referrer-when-downgrade'
            allowFullScreen
          />
        </div>
        <Reveal className='flex flex-col justify-center gap-6 px-6 py-14 sm:px-10 lg:w-[520px] lg:shrink-0 lg:p-16'>
          <h2 className='font-playfair text-3xl font-medium leading-tight tracking-tight text-ciruela-oscuro lg:text-[38px]'>
            Te esperamos
          </h2>
          <div className='flex flex-col gap-3.5'>
            <a
              href={MAPS}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-3 text-ciruela-oscuro hover:text-terracota'
            >
              <MapPin className='h-[18px] w-[18px] text-terracota' />
              <span className='text-base'>Videla 57, Quilmes, Buenos Aires</span>
            </a>
            <span className='flex items-center gap-3'>
              <Clock3 className='h-[18px] w-[18px] text-terracota' />
              <span className='text-base text-ciruela-oscuro'>
                Mar a Dom · 10:00 a 20:00 hs
              </span>
            </span>
            <a
              href={IG}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-3 text-ciruela-oscuro hover:text-terracota'
            >
              <AtSign className='h-[18px] w-[18px] text-terracota' />
              <span className='text-base'>@mistica.autentica</span>
            </a>
          </div>
          <a
            href={MAPS}
            target='_blank'
            rel='noopener noreferrer'
            className='press flex w-fit items-center gap-2.5 bg-verde-profundo px-[26px] py-[15px] font-mono text-xs uppercase tracking-[0.14em] text-arena'
          >
            Abrir en Maps <ArrowUpRight className='h-[17px] w-[17px]' />
          </a>
        </Reveal>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className='bg-verde-profundo px-6 py-14 sm:px-10 lg:px-16'>
        <div className='mx-auto flex w-full max-w-[1280px] flex-col gap-12'>
          <div className='grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]'>
            {/* Marca */}
            <div className='max-w-[360px]'>
              <Image
                src='/Logo-mistica.png'
                alt='Mística Auténtica'
                width={170}
                height={89}
                className='h-11 w-auto'
              />
              <p className='mt-5 text-sm leading-relaxed text-arena/70'>
                Talleres, eventos y cumpleaños con arte. Buffet libre, cerámica y
                tienda holística en el corazón de Quilmes.
              </p>
            </div>

            {/* Explorar */}
            <div className='flex flex-col gap-4'>
              <span className='font-mono text-[11px] uppercase tracking-[0.18em] text-arena/50'>
                Explorar
              </span>
              <nav className='flex flex-col gap-2.5 text-sm text-arena/70'>
                <a href='#experiencias' className='w-fit hover:text-white'>
                  Experiencias
                </a>
                <a href='#eventos' className='w-fit hover:text-white'>
                  Eventos privados
                </a>
                <a href='#como-funciona' className='w-fit hover:text-white'>
                  Cómo funciona
                </a>
                <a href='#reservar' className='w-fit hover:text-white'>
                  Reservar
                </a>
              </nav>
            </div>

            {/* Visitá */}
            <div className='flex flex-col gap-4'>
              <span className='font-mono text-[11px] uppercase tracking-[0.18em] text-arena/50'>
                Visitá
              </span>
              <div className='flex flex-col gap-2.5 text-sm text-arena/70'>
                <a
                  href={MAPS}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex w-fit items-center gap-2 hover:text-white'
                >
                  <MapPin className='h-4 w-4 text-durazno' /> Videla 57, Quilmes
                </a>
                <span className='flex items-center gap-2'>
                  <Clock3 className='h-4 w-4 text-durazno' /> Mar a Dom · 10 a 20 hs
                </span>
                <a
                  href={IG}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex w-fit items-center gap-2 hover:text-white'
                >
                  <AtSign className='h-4 w-4 text-durazno' /> @mistica.autentica
                </a>
              </div>
            </div>
          </div>
          <div className='h-px w-full bg-arena/15' />
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <span className='font-mono text-xs uppercase tracking-[0.1em] text-arena/50'>
              © 2025 Mística Auténtica
            </span>
            <a
              href={WA_PISTECH}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.1em] text-arena/50 hover:text-white'
            >
              Desarrollado por{' '}
              <span className='bg-gradient-to-b from-[#F2DD93] to-[#C99A3A] bg-clip-text font-bold text-transparent'>
                PISTECH
              </span>
              <ExternalLink className='h-3 w-3' />
            </a>
          </div>
        </div>
      </footer>

      {/* Bottom-sheet de reserva (se abre al tocar una experiencia) */}
      <BookingSheet
        experience={bookingExp}
        experiences={experiences}
        sessions={sessions}
        onClose={() => setBookingExp(null)}
      />
    </main>
  );
}
