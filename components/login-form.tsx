import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  return (
    <form
      className={cn('flex flex-col gap-6 relative', className)}
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
      <div className='grid gap-6'>
        <div className='grid gap-3'>
          <Label
            htmlFor='email'
            className='text-[var(--color-negro)] font-winter-solid'
          >
            Correo electrónico
          </Label>
          <Input
            id='email'
            type='email'
            required
          />
        </div>
        <div className='grid gap-3'>
          <div className='flex items-center'>
            <Label
              htmlFor='password'
              className='text-[var(--color-negro)] font-winter-solid'
            >
              Contraseña
            </Label>
          </div>
          <Input
            id='password'
            type='password'
            required
          />
        </div>
        <Button
          type='submit'
          className='w-full bg-[var(--color-verde-profundo)] hover:bg-[var(--color-verde-profundo-hover)]/90 text-white font-winter-solid shadow-lg hover:shadow-xl transition-all duration-300'
        >
          Iniciar Sesión
        </Button>
      </div>

      {/* sutiles */}
      <div className='absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[var(--color-durazno)]/20 blur-sm float-gentle opacity-60'></div>
      <div className='absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-[var(--color-rosa-claro)]/20 blur-sm float-gentle-delayed opacity-40'></div>
    </form>
  );
}
