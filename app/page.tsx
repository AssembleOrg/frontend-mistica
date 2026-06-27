'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  AtSign,
  Asterisk,
  Clock3,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { ReservationForm } from '@/components/landing/reservation-form';
import { ManageByCode } from '@/components/landing/manage-by-code';
import {
  reservationsPublic,
  type PublicExperience,
  type PublicSession,
} from '@/services/reservations.public.service';

const WA_PISTECH =
  'https://api.whatsapp.com/send/?phone=5491138207230&text=Hola+Pistech%2C+me+comunico+a+trav%C3%A9s+de+mistica+web.+Me+gustar%C3%ADa+saber+m%C3%A1s+sobre+sus+servicios+digitales.&type=phone_number&app_absent=0';
const MAPS = 'https://www.google.com/maps/search/?api=1&query=Videla+57+Quilmes';

const MARQUEE = [
  'TALLERES DE CERÁMICA',
  'CUMPLEAÑOS CON ARTE',
  'EVENTOS PRIVADOS',
  'BUFFET LIBRE + ARTE',
  'TORNO Y MODELADO',
  'REGALERÍA HOLÍSTICA',
];

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function LandingPage() {
  const [experiences, setExperiences] = useState<PublicExperience[]>([]);
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className='w-full overflow-x-hidden bg-[#F6EEE6] text-[#3D3338]'>
      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className='relative isolate flex min-h-[640px] flex-col justify-between overflow-hidden px-6 py-8 sm:min-h-[760px] sm:px-10 lg:h-[920px] lg:px-16 lg:py-10'>
        <div className='absolute inset-0 -z-10'>
          <Image
            src='/foto-mistica-login-1.webp'
            alt='Experiencias de cerámica en Mística'
            fill
            priority
            className='object-cover'
          />
          <div className='absolute inset-0 [background-image:linear-gradient(0deg,_#2A1A12CC_0%,_#2A1A1233_45%,_#2A1A12E6_100%)]' />
        </div>

        {/* Nav */}
        <nav className='flex items-center justify-between'>
          <span className='font-playfair text-2xl font-semibold tracking-[4px] text-[#F6EEE6]'>
            MÍSTICA
          </span>
          <div className='flex items-center gap-6 sm:gap-10'>
            {['Experiencias', 'Nosotros', 'Visitá'].map((l) => (
              <a
                key={l}
                href='#experiencias'
                className='hidden font-mono text-xs tracking-[1.5px] text-[#F6EEE6CC] hover:text-white sm:block'
              >
                {l.toUpperCase()}
              </a>
            ))}
            <a
              href='#reservar'
              className='rounded-[4px] bg-[#9D684E] px-5 py-2.5 font-mono text-xs tracking-[1.5px] text-[#F6EEE6]'
            >
              RESERVAR
            </a>
            <Link
              href='/login'
              className='font-mono text-xs tracking-[1.5px] text-[#F6EEE6]/60 hover:text-white'
            >
              ACCESO
            </Link>
          </div>
        </nav>

        {/* Centro */}
        <div className='flex max-w-[980px] flex-col items-start gap-6 py-10'>
          <div className='flex items-center gap-3'>
            <span className='h-px w-[34px] bg-[#E0A38D]' />
            <span className='font-mono text-xs tracking-[3px] text-[#E0A38D]'>
              EXPERIENCIAS DE CERÁMICA · QUILMES
            </span>
          </div>
          <h1 className='font-playfair text-5xl font-medium leading-[0.96] text-[#F6EEE6] sm:text-7xl lg:text-[96px] lg:leading-[94px]'>
            Creá con tus manos.
          </h1>
          <p className='max-w-[560px] font-sans text-base leading-relaxed text-[#F6EEE6]/90 sm:text-[19px] sm:leading-[29px]'>
            Talleres, eventos y cumpleaños donde el barro, el arte y el café se
            encuentran. Reservá tu lugar en una tarde para crear algo tuyo.
          </p>
          <div className='flex flex-wrap items-center gap-3.5'>
            <a
              href='#reservar'
              className='flex items-center gap-2.5 rounded-[4px] bg-[#CC844A] px-7 py-4 font-mono text-[13px] tracking-[1.5px] text-[#3D3338] transition hover:brightness-95'
            >
              RESERVAR EXPERIENCIA <ArrowRight className='h-[18px] w-[18px]' />
            </a>
            <a
              href='#experiencias'
              className='rounded-[4px] border border-[#F6EEE6]/50 px-7 py-4 font-mono text-[13px] tracking-[1.5px] text-[#F6EEE6] hover:bg-white/10'
            >
              VER TALLERES
            </a>
          </div>
        </div>

        {/* Labels inferiores */}
        <div className='hidden items-end justify-between sm:flex'>
          {[
            ['BUFFET LIBRE + ARTE', 'Creá mientras disfrutás'],
            ['@HECHOENMISTICA', 'Regalería & tienda holística'],
            ['VIDELA 57', 'Quilmes, Bs. As.'],
          ].map(([t, s]) => (
            <div key={t} className='flex flex-col gap-1.5'>
              <span className='font-mono text-xs tracking-[1.5px] text-[#F6EEE6]'>
                {t}
              </span>
              <span className='font-sans text-[13px] text-[#F6EEE6]/70'>{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────── MARQUEE ─────────────────────────── */}
      <section className='flex h-[60px] items-center overflow-hidden bg-[#455A54]'>
        <div className='animate-marquee flex shrink-0 items-center gap-7 whitespace-nowrap pr-7'>
          {[...MARQUEE, ...MARQUEE].map((w, i) => (
            <span key={i} className='flex items-center gap-7'>
              <span className='font-mono text-xs tracking-[2px] text-[#F6EEE6]'>
                {w}
              </span>
              <Asterisk className='h-3.5 w-3.5 text-[#E0A38D]' />
            </span>
          ))}
        </div>
      </section>

      {/* ─────────────────────────── EXPERIENCIAS ─────────────────────────── */}
      <section
        id='experiencias'
        className='mx-auto flex w-full max-w-[1440px] flex-col gap-14 bg-[#F6EEE6] px-6 pb-[90px] pt-20 sm:px-10 lg:px-16 lg:pt-[120px]'
      >
        <div className='flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end'>
          <div className='flex max-w-[680px] flex-col gap-[18px]'>
            <div className='flex items-center gap-3'>
              <span className='h-px w-[34px] bg-[#9D684E]' />
              <span className='font-mono text-xs tracking-[3px] text-[#9D684E]'>
                NUESTRAS EXPERIENCIAS
              </span>
            </div>
            <h2 className='font-playfair text-4xl font-medium leading-[1.05] text-[#3D3338] sm:text-5xl lg:text-[52px] lg:leading-[55px]'>
              Elegí cómo querés pasar la tarde
            </h2>
          </div>
          <p className='max-w-[380px] font-sans text-base leading-[26px] text-[#7A6E6F]'>
            Cada experiencia incluye los materiales, la guía de nuestros artistas
            y, claro, el café. Solo traé ganas de ensuciarte las manos.
          </p>
        </div>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className='h-80 animate-pulse rounded-[4px] border border-[#E6DBCD] bg-[#FBF5EF]'
                />
              ))
            : experiences.map((e) => (
                <div
                  key={e._id}
                  className='flex flex-col overflow-hidden rounded-[4px] border border-[#E6DBCD] bg-[#FBF5EF]'
                >
                  <div className='h-[200px] w-full bg-[#E0A38D]'>
                    {e.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.images[0]}
                        alt={e.name}
                        className='h-full w-full object-cover'
                      />
                    )}
                  </div>
                  <div className='flex flex-col gap-3 p-[22px] pb-6'>
                    <h3 className='font-playfair text-2xl font-medium leading-[26px] text-[#3D3338]'>
                      {e.name}
                    </h3>
                    {e.description && (
                      <p className='font-sans text-sm leading-[21px] text-[#7A6E6F]'>
                        {e.description}
                      </p>
                    )}
                    <div className='flex items-center gap-2 pt-2.5'>
                      <Clock3 className='h-[15px] w-[15px] text-[#9D684E]' />
                      <span className='font-mono text-xs tracking-[0.5px] text-[#3D3338]'>
                        {e.durationMinutes} min
                      </span>
                      <span className='font-mono text-xs text-[#E6DBCD]'>/</span>
                      <span className='font-mono text-xs tracking-[0.5px] text-[#9D684E]'>
                        {fmtPrice(e.basePrice)}
                      </span>
                    </div>
                    <a
                      href='#reservar'
                      className='flex items-center gap-2 pt-2 font-mono text-xs tracking-[1.5px] text-[#3D3338]'
                    >
                      RESERVAR <ArrowRight className='h-[15px] w-[15px]' />
                    </a>
                  </div>
                </div>
              ))}
          {!loading && experiences.length === 0 && (
            <p className='text-[#7A6E6F]'>Pronto publicamos nuevas experiencias.</p>
          )}
        </div>
      </section>

      {/* ─────────────────────────── RESERVÁ ─────────────────────────── */}
      <section id='reservar' className='bg-[#EFCBB9] py-20 lg:py-[110px]'>
        <div className='mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16'>
          <div className='mb-10 flex flex-col gap-3.5'>
            <div className='flex items-center gap-3'>
              <span className='h-px w-[34px] bg-[#9D684E]' />
              <span className='font-mono text-xs tracking-[3px] text-[#9D684E]'>
                RESERVÁ ONLINE
              </span>
            </div>
            <h2 className='font-playfair text-4xl font-medium leading-[1.05] text-[#3D3338] lg:text-[44px]'>
              Armá tu reserva en un minuto
            </h2>
          </div>
          {loading ? (
            <div className='h-96 animate-pulse rounded-[4px] bg-[#F6EEE6]/60' />
          ) : (
            <ReservationForm experiences={experiences} sessions={sessions} />
          )}
        </div>
      </section>

      {/* ─────────────────────────── GESTIONÁ ─────────────────────────── */}
      <section className='bg-[#9D684E] py-20'>
        <div className='mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16'>
          <ManageByCode />
        </div>
      </section>

      {/* ─────────────────────────── FOOTER ─────────────────────────── */}
      <footer className='bg-[#455A54] px-6 py-14 sm:px-10 lg:px-16'>
        <div className='mx-auto flex w-full max-w-[1440px] flex-col gap-12'>
          <div className='flex flex-wrap justify-between gap-10'>
            <div className='max-w-[340px]'>
              <p className='font-playfair text-3xl font-semibold tracking-[3px] text-[#F6EEE6]'>
                MÍSTICA
              </p>
              <p className='mt-4 font-sans text-sm leading-relaxed text-[#F6EEE6]/70'>
                Talleres, eventos y cumpleaños con arte. Buffet libre, cerámica y
                tienda holística en el corazón de Quilmes.
              </p>
            </div>
            <div className='flex flex-col gap-3.5 font-sans text-sm text-[#F6EEE6]/85'>
              <span className='font-mono text-[11px] tracking-[2px] text-[#F6EEE6]/50'>
                VISITÁ
              </span>
              <a
                href={MAPS}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-2 hover:text-white'
              >
                <MapPin className='h-4 w-4 text-[#E0A38D]' /> Videla 57, Quilmes
              </a>
              <span className='flex items-center gap-2'>
                <Clock3 className='h-4 w-4 text-[#E0A38D]' /> Mar a Dom · 10 a 20 hs
              </span>
              <a
                href='https://www.instagram.com/mistica.autentica/'
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-2 hover:text-white'
              >
                <AtSign className='h-4 w-4 text-[#E0A38D]' /> @mistica.autentica
              </a>
            </div>
          </div>
          <div className='h-px w-full bg-[#F6EEE6]/15' />
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <span className='font-mono text-xs tracking-wider text-[#F6EEE6]/50'>
              © 2025 MÍSTICA AUTÉNTICA
            </span>
            <a
              href={WA_PISTECH}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1.5 font-mono text-xs tracking-wider text-[#F6EEE6]/50 hover:text-white'
            >
              DESARROLLADO POR{' '}
              <span className='bg-gradient-to-b from-[#F2DD93] to-[#C99A3A] bg-clip-text font-bold text-transparent'>
                PISTECH
              </span>
              <ExternalLink className='h-3 w-3' />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
