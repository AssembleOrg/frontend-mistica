// components/ui/login-form.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const [email, setEmail] = useState('admin@mistica.com');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const { login, status, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (_err) {
      console.error('Fallo el intento de login');
    }
  };

  const isLoading = status === 'loading';

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className='flex flex-col items-center gap-2 text-center'>
        <Image
          src='/Logo-mistica.png'
          width={400}
          height={120}
          alt='MÍSTICA Logo'
          className='object-contain mb-2'
        />
        <h1 className='text-3xl font-tan-nimbus text-[var(--color-verde-profundo)] font-bold'>
          Bienvenido a MÍSTICA
        </h1>
        <p className='text-[var(--color-ciruela-oscuro)]/70 text-sm text-balance font-winter-solid'>
          Ingresa tus credenciales para acceder
        </p>
      </div>

      <div className='grid gap-4'>
        <div className='grid gap-2'>
          <Label
            htmlFor='email'
            className='text-[var(--color-negro)] font-winter-solid'
          >
            Correo electrónico
          </Label>
          <Input
            id='email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className='grid gap-2'>
          <Label
            htmlFor='password'
            className='text-[var(--color-negro)] font-winter-solid'
          >
            Contraseña
          </Label>
          <Input
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        {status === 'error' && (
          <p className='text-sm text-center text-red-600 font-semibold'>
            {error}
          </p>
        )}

        <Button
          type='submit'
          className='w-full bg-[var(--color-verde-profundo)] hover:bg-[var(--color-verde-profundo-hover)]/90 text-white font-winter-solid disabled:opacity-70'
          disabled={isLoading}
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Button>
      </div>
    </form>
  );
}
