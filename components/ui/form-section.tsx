import type { ReactNode } from 'react';

/**
 * Bloque de un formulario largo: tarjeta con título y, opcional, una línea que
 * explica para qué sirve. Agrupa campos que van juntos (ej. "Precio").
 */
export function FormSection({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children: ReactNode }>) {
  return (
    <section className='flex flex-col gap-3 rounded-xl border border-linea bg-white p-4'>
      <header className='flex flex-col gap-0.5'>
        <h3 className='text-sm font-semibold text-verde-profundo'>{title}</h3>
        {description && (
          <p className='text-xs leading-snug text-texto-suave'>{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

/**
 * Campo con su label arriba y la ayuda pegada debajo. Con `htmlFor` el label
 * queda asociado al input (clic y lector de pantalla); sin él es un título
 * para editores compuestos (chips, listas).
 */
export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: Readonly<{
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}>) {
  const labelCls = 'text-[13px] font-medium text-[#455a54]';
  return (
    <div className='flex flex-col gap-1.5'>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelCls}>
          {label}
        </label>
      ) : (
        <span className={labelCls}>{label}</span>
      )}
      {children}
      {hint && <p className='text-xs leading-snug text-texto-suave'>{hint}</p>}
    </div>
  );
}
