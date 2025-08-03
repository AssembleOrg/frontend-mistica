'use client';

import Image from 'next/image';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <>
      {/* Elementos decorativos de fondo */}
      <div className='fixed inset-0 pointer-events-none overflow-hidden z-0'>
        <div
          className='absolute top-10 right-10 w-32 h-32 rounded-full'
          style={{
            opacity: 0.1,
            filter: 'blur(50px)',
          }}
        ></div>
        <div
          className='absolute bottom-10 left-10 w-40 h-40 rounded-full'
          style={{
            opacity: 0.15,
            filter: 'blur(60px)',
          }}
        ></div>
      </div>
      <div
        className='grid min-h-svh lg:grid-cols-2 relative overflow-hidden'
        style={{
          backgroundColor: '#efcbb9',
        }}
      >
        <div className='flex flex-col gap-4 p-6 md:p-10 relative z-10'>
          <div className='flex flex-1 items-center justify-center'>
            <div className='w-full max-w-xs'>
              <LoginForm />
            </div>
          </div>
        </div>
        <div className='relative hidden lg:block overflow-hidden'>
          {/* Imagen de fondo nítida con efecto prisma */}
          <div className='absolute inset-0'>
            <Image
              src='/mistica-4k.jpeg'
              fill
              alt='Fondo MÍSTICA'
              className='object-cover'
              style={{
                filter: 'contrast(1.1)',
              }}
            />
          </div>

          {/* Elementos decorativos simples */}
          <div
            className='absolute top-10 right-10 w-12 h-12 rounded-full'
            style={{ backgroundColor: '#efcbb9', opacity: 0.3 }}
          ></div>
          <div
            className='absolute bottom-20 left-10 w-16 h-16 rounded-full'
            style={{ backgroundColor: '#e0a38d', opacity: 0.2 }}
          ></div>
          <div
            className='absolute top-1/2 left-1/4 w-8 h-8 rounded-full'
            style={{ backgroundColor: '#455a54', opacity: 0.25 }}
          ></div>

          {/* Logo con fondo difuminado */}
          <div className='absolute inset-0 flex items-center justify-center'>
            <div
              className='rounded-3xl p-8 shadow-2xl'
              style={{
                backdropFilter: 'blur(10px) brightness(1.1)',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Image
                src='/Logo-2-mistica.png'
                width={200}
                height={200}
                alt='MÍSTICA Logo'
                className='object-contain drop-shadow-lg'
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
