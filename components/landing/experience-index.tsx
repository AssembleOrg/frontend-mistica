'use client';

// Índice editorial de experiencias: filas a ancho completo separadas por
// hairline (sin cards). La fila entera es el target táctil (stretched-link
// accesible). En desktop, el hover revela la fotografía.
//
// - Reservable online  → onReserve(exp)   (abre el bottom-sheet de reserva)
// - Coordinado         → onConsult(exp)   (abre el flujo de consulta/lead)

import { ArrowRight } from 'lucide-react';
import type { PublicExperience } from '@/services/reservations.public.service';

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

const FALLBACK_IMG = [
  '/landing/exp-1.webp',
  '/landing/exp-2.webp',
  '/landing/exp-3.webp',
  '/landing/exp-4.webp',
];

function ExperienceRow({
  exp,
  index,
  onSelect,
}: {
  exp: PublicExperience;
  index: number;
  onSelect: () => void;
}) {
  const img = exp.images?.[0] ?? FALLBACK_IMG[index % FALLBACK_IMG.length];
  const coordinated = exp.bookableOnline === false;

  return (
    <article className='group relative border-t border-linea last:border-b'>
      {/* Hitbox estirado sobre toda la fila (accesible). */}
      <button
        type='button'
        onClick={onSelect}
        aria-label={
          coordinated ? `Consultar por ${exp.name}` : `Reservar ${exp.name}`
        }
        className='stretched press'
      />

      <div className='grid grid-cols-[auto_1fr_auto] items-center gap-4 py-7 sm:gap-8 sm:py-9'>
        {/* Numeral en el gutter */}
        <span className='font-mono text-xs tabular-nums text-terracota/70 sm:text-sm'>
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Título + descripción */}
        <div className='min-w-0'>
          <h3 className='font-playfair text-2xl font-medium leading-tight text-ciruela-oscuro transition-colors group-hover:text-terracota sm:text-3xl lg:text-[34px]'>
            {exp.name}
          </h3>
          {exp.description && (
            <p className='mt-1.5 line-clamp-1 max-w-xl text-sm text-piedra transition-all duration-300 group-hover:line-clamp-2'>
              {exp.description}
            </p>
          )}
        </div>

        {/* Imagen revelada en hover (solo desktop) */}
        <div className='pointer-events-none hidden h-20 w-32 shrink-0 overflow-hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt='' className='h-full w-full object-cover' />
        </div>

        {/* Meta: duración · precio/seña · flecha */}
        <div className='flex shrink-0 items-center gap-4 sm:gap-6'>
          <div className='text-right'>
            <p className='font-mono text-xs tabular-nums text-ciruela-oscuro'>
              {exp.durationMinutes} min
            </p>
            <p className='mt-0.5 font-mono text-xs tabular-nums text-terracota'>
              {coordinated ? 'A coordinar' : fmtPrice(exp.basePrice)}
            </p>
          </div>
          <ArrowRight className='h-5 w-5 shrink-0 text-piedra transition-transform duration-300 group-hover:translate-x-1 group-hover:text-terracota' />
        </div>
      </div>

      {/* Banda de imagen en mobile (no hay hover): foto compacta arriba */}
      <div className='-mt-2 mb-6 h-40 w-full overflow-hidden lg:hidden'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={exp.name} className='h-full w-full object-cover' />
      </div>
    </article>
  );
}

export function ExperienceIndex({
  experiences,
  loading,
  onReserve,
  onConsult,
}: {
  experiences: PublicExperience[];
  loading: boolean;
  onReserve: (exp: PublicExperience) => void;
  onConsult: (exp: PublicExperience) => void;
}) {
  if (loading) {
    return (
      <div className='flex flex-col'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className='h-28 animate-pulse border-t border-linea last:border-b'
          />
        ))}
      </div>
    );
  }

  if (experiences.length === 0) {
    return (
      <p className='border-y border-linea py-10 text-piedra'>
        Pronto publicamos nuevas experiencias.
      </p>
    );
  }

  return (
    <div className='flex flex-col'>
      {experiences.map((exp, i) => (
        <ExperienceRow
          key={exp._id}
          exp={exp}
          index={i}
          onSelect={() =>
            exp.bookableOnline === false ? onConsult(exp) : onReserve(exp)
          }
        />
      ))}
    </div>
  );
}
