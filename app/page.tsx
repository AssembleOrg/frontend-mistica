'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, AtSign, Clock, ExternalLink, MapPin } from 'lucide-react';
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
        /* la landing igual se muestra sin datos */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className='min-h-svh bg-rosa-claro/40'>
      {/* ───────── Hero ───────── */}
      <section className='relative isolate overflow-hidden'>
        <div className='absolute inset-0 -z-10'>
          <Image
            src='/foto-mistica-login-1.webp'
            alt='Experiencias de cerámica en Mística'
            fill
            priority
            className='object-cover'
          />
          <div className='absolute inset-0 bg-gradient-to-b from-[#2a1a12cc] via-[#2a1a1255] to-[#2a1a12f2]' />
        </div>

        <nav className='mx-auto flex max-w-6xl items-center justify-between px-6 py-6'>
          <span className='font-tan-nimbus text-2xl tracking-[3px] text-white'>
            MÍSTICA
          </span>
          <div className='flex items-center gap-4'>
            <a
              href='#reservar'
              className='hidden rounded-lg bg-terracota px-5 py-2.5 font-mono text-xs tracking-wider text-white sm:inline-block'
            >
              RESERVAR
            </a>
            <Link
              href='/login'
              className='font-mono text-xs tracking-wider text-white/70 hover:text-white'
            >
              ACCESO
            </Link>
          </div>
        </nav>

        <div className='mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24'>
          <div className='flex items-center gap-3'>
            <span className='h-px w-9 bg-durazno' />
            <span className='font-mono text-xs tracking-[3px] text-durazno'>
              EXPERIENCIAS DE CERÁMICA · QUILMES
            </span>
          </div>
          <h1 className='mt-6 max-w-3xl font-tan-nimbus text-5xl leading-[0.98] text-white sm:text-7xl'>
            Creá con tus manos.
          </h1>
          <p className='mt-5 max-w-lg text-lg leading-relaxed text-white/90'>
            Talleres, eventos y cumpleaños donde el barro, el arte y el café se
            encuentran. Reservá tu lugar en una tarde para crear algo tuyo.
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <a
              href='#reservar'
              className='flex items-center gap-2 rounded-lg bg-naranja-medio px-7 py-4 font-mono text-sm tracking-wider text-ciruela-oscuro transition hover:bg-naranja-medio-hover'
            >
              RESERVAR EXPERIENCIA <ArrowRight className='h-4 w-4' />
            </a>
            <a
              href='#experiencias'
              className='rounded-lg border border-white/50 px-7 py-4 font-mono text-sm tracking-wider text-white hover:bg-white/10'
            >
              VER TALLERES
            </a>
          </div>
        </div>
      </section>

      {/* ───────── Experiencias ───────── */}
      <section id='experiencias' className='mx-auto max-w-6xl px-6 py-20'>
        <div className='flex items-center gap-3'>
          <span className='h-px w-9 bg-terracota' />
          <span className='font-mono text-xs tracking-[3px] text-terracota'>
            NUESTRAS EXPERIENCIAS
          </span>
        </div>
        <h2 className='mt-4 max-w-xl font-tan-nimbus text-4xl leading-tight text-ciruela-oscuro'>
          Elegí cómo querés pasar la tarde
        </h2>

        <div className='mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className='h-44 animate-pulse rounded-xl border border-[#e6dbcd] bg-white/60'
                />
              ))
            : experiences.map((e) => (
                <div
                  key={e._id}
                  className='flex flex-col gap-3 rounded-xl border border-[#e6dbcd] bg-white p-6'
                >
                  <h3 className='font-tan-nimbus text-xl text-ciruela-oscuro'>
                    {e.name}
                  </h3>
                  {e.description && (
                    <p className='text-sm leading-relaxed text-ciruela-oscuro/65'>
                      {e.description}
                    </p>
                  )}
                  <div className='mt-auto flex items-center gap-2 pt-2 font-mono text-xs text-terracota'>
                    <Clock className='h-4 w-4' />
                    {e.durationMinutes} min
                    <span className='text-[#e6dbcd]'>/</span>
                    desde {fmtPrice(e.basePrice)}
                  </div>
                </div>
              ))}
          {!loading && experiences.length === 0 && (
            <p className='text-ciruela-oscuro/60'>
              Pronto publicamos nuevas experiencias.
            </p>
          )}
        </div>
      </section>

      {/* ───────── Reservá ───────── */}
      <section id='reservar' className='bg-rosa-claro py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='flex items-center gap-3'>
            <span className='h-px w-9 bg-terracota' />
            <span className='font-mono text-xs tracking-[3px] text-terracota'>
              RESERVÁ ONLINE
            </span>
          </div>
          <h2 className='mb-10 mt-4 font-tan-nimbus text-4xl text-ciruela-oscuro'>
            Armá tu reserva en un minuto
          </h2>
          {loading ? (
            <div className='h-96 animate-pulse rounded-xl bg-white/50' />
          ) : (
            <ReservationForm experiences={experiences} sessions={sessions} />
          )}
        </div>
      </section>

      {/* ───────── Gestioná ───────── */}
      <section className='bg-terracota py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <ManageByCode />
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className='bg-verde-profundo px-6 py-14'>
        <div className='mx-auto flex max-w-6xl flex-col gap-10'>
          <div className='flex flex-wrap justify-between gap-8'>
            <div className='max-w-xs'>
              <p className='font-tan-nimbus text-3xl tracking-[3px] text-white'>
                MÍSTICA
              </p>
              <p className='mt-4 text-sm leading-relaxed text-white/70'>
                Talleres, eventos y cumpleaños con arte. Buffet libre, cerámica y
                tienda holística en el corazón de Quilmes.
              </p>
            </div>
            <div className='flex flex-col gap-3 text-sm text-white/85'>
              <a
                href={MAPS}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-2 hover:text-white'
              >
                <MapPin className='h-4 w-4 text-durazno' /> Videla 57, Quilmes
              </a>
              <span className='flex items-center gap-2'>
                <Clock className='h-4 w-4 text-durazno' /> Mar a Dom · 10 a 20 hs
              </span>
              <a
                href='https://www.instagram.com/mistica.autentica/'
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-2 hover:text-white'
              >
                <AtSign className='h-4 w-4 text-durazno' /> @mistica.autentica
              </a>
            </div>
          </div>
          <div className='h-px w-full bg-white/15' />
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <span className='font-mono text-xs tracking-wider text-white/50'>
              © 2025 MÍSTICA AUTÉNTICA
            </span>
            <a
              href={WA_PISTECH}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1.5 font-mono text-xs tracking-wider text-white/50 hover:text-white'
            >
              DESARROLLADO POR{' '}
              <span className='bg-gradient-to-b from-[#f2dd93] to-[#c99a3a] bg-clip-text font-bold text-transparent'>
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
