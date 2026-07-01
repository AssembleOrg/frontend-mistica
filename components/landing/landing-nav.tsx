'use client';

// Navbar fijo de la landing: transparente sobre el hero, gana fondo arena +
// blur + hairline al scrollear (patrón estándar). Solo presentación.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const LINKS: [string, string][] = [
  ['Experiencias', '#experiencias'],
  ['Eventos', '#eventos'],
  ['Cómo funciona', '#como-funciona'],
  ['Visitá', '#visita'],
];

export function LandingNav({ onReservar }: { onReservar: () => void }) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? 'border-b border-linea bg-arena/90 shadow-[0_1px_20px_rgba(78,66,71,0.06)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className='mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-6 sm:px-10 lg:px-16'>
        {/* Logo — chip claro para legibilidad sobre la foto del hero */}
        <Link
          href='/'
          aria-label='Mística Auténtica — inicio'
          className='press flex items-center'
        >
          <Image
            src='/Logo-mistica.png'
            alt='Mística Auténtica'
            width={180}
            height={94}
            priority
            className='h-11 w-auto sm:h-12'
          />
        </Link>

        <div className='flex items-center gap-6 sm:gap-9'>
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className={`hidden font-mono text-[11px] uppercase tracking-[0.12em] transition-colors sm:block ${
                solid
                  ? 'text-ciruela-oscuro/70 hover:text-ciruela-oscuro'
                  : 'text-arena/80 hover:text-white'
              }`}
            >
              {label}
            </a>
          ))}
          <button
            type='button'
            onClick={onReservar}
            className='press bg-terracota px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-arena'
          >
            Reservar
          </button>
          <Link
            href='/login'
            className={`hidden font-mono text-[11px] uppercase tracking-[0.12em] transition-colors sm:block ${
              solid ? 'text-ciruela-oscuro/50 hover:text-ciruela-oscuro' : 'text-arena/60 hover:text-white'
            }`}
          >
            Acceso
          </Link>
        </div>
      </nav>
    </header>
  );
}
