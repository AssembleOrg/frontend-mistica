'use client';

// Navbar fijo de la landing: transparente sobre el hero, gana fondo arena +
// blur + hairline al scrollear. En mobile abre un overlay full-screen (burger).
// Solo presentación.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const LINKS: [string, string][] = [
  ['Experiencias', '#experiencias'],
  ['Eventos', '#eventos'],
  ['Cómo funciona', '#como-funciona'],
  ['Visitá', '#visita'],
];

export function LandingNav({ onReservar }: { onReservar: () => void }) {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Bloquear el scroll de la página mientras el overlay está abierto
  // (clase en <html>, más fiable que overflow inline en body).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('menu-lock', menuOpen);
    return () => root.classList.remove('menu-lock');
  }, [menuOpen]);

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? 'border-b border-linea bg-arena/90 shadow-[0_1px_20px_rgba(78,66,71,0.06)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className='mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-6 sm:px-10 lg:px-16'>
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

        {/* Links desktop */}
        <div className='hidden items-center gap-6 sm:flex sm:gap-9'>
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className={`font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
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
            className={`font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
              solid ? 'text-ciruela-oscuro/50 hover:text-ciruela-oscuro' : 'text-arena/60 hover:text-white'
            }`}
          >
            Acceso
          </Link>
        </div>

        {/* Acciones mobile: Reservar + burger */}
        <div className='flex items-center gap-3 sm:hidden'>
          <button
            type='button'
            onClick={onReservar}
            className='press bg-terracota px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-arena'
          >
            Reservar
          </button>
          <button
            type='button'
            onClick={() => setMenuOpen(true)}
            aria-label='Abrir menú'
            className={`press flex h-10 w-10 items-center justify-center ${
              solid ? 'text-ciruela-oscuro' : 'text-arena'
            }`}
          >
            <Menu className='h-6 w-6' />
          </button>
        </div>
      </nav>
    </header>

      {/* Overlay full-screen (mobile) — hermano del header, fuera de su
          stacking context, con fondo opaco y z encima del header. */}
      {menuOpen && (
        <div className='menu-overlay fixed inset-0 z-[100] flex flex-col bg-arena sm:hidden'>
          <div className='flex h-[68px] items-center justify-between px-6'>
            <Image
              src='/Logo-mistica.png'
              alt='Mística Auténtica'
              width={180}
              height={94}
              className='h-11 w-auto'
            />
            <button
              type='button'
              onClick={() => setMenuOpen(false)}
              aria-label='Cerrar menú'
              className='press flex h-10 w-10 items-center justify-center text-ciruela-oscuro'
            >
              <X className='h-6 w-6' />
            </button>
          </div>

          <nav className='flex flex-1 flex-col justify-center gap-2 px-6'>
            {LINKS.map(([label, href], i) => (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className='menu-item border-b border-linea py-4 font-playfair text-4xl font-medium text-ciruela-oscuro'
                style={{ animationDelay: `${0.05 + i * 0.06}s` }}
              >
                {label}
              </a>
            ))}
            <Link
              href='/login'
              onClick={() => setMenuOpen(false)}
              className='menu-item py-4 font-mono text-xs uppercase tracking-[0.18em] text-piedra'
              style={{ animationDelay: `${0.05 + LINKS.length * 0.06}s` }}
            >
              Acceso
            </Link>
          </nav>

          <div className='safe-b px-6 pb-6'>
            <button
              type='button'
              onClick={() => {
                setMenuOpen(false);
                onReservar();
              }}
              className='press flex w-full items-center justify-center gap-2.5 bg-terracota py-5 font-mono text-xs uppercase tracking-[0.16em] text-arena'
            >
              Reservar experiencia <ArrowUpRight className='h-4 w-4' />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
