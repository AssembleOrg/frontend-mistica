'use client';

/**
 * Tilde "Gasto extraordinario": inversiones (un horno, una máquina…) que se
 * registran pero no suman a los egresos del mes ni al balance del cierre.
 * Mismo look que el tilde de "Gasto externo" de los diálogos de egreso.
 */
export function ExtraordinaryToggle({
  checked,
  onChange,
  disabled,
}: Readonly<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}>) {
  return (
    <button
      type='button'
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
        checked
          ? 'border-[#9d684e] bg-[#efcbb9]/30'
          : 'border-[#9d684e]/20 bg-white hover:bg-[#efcbb9]/10'
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
          checked
            ? 'border-[#9d684e] bg-[#9d684e] text-white'
            : 'border-[#9d684e]/40 bg-white'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      <span className='text-[13px] leading-snug text-[#455a54]'>
        Gasto extraordinario: no afecta el cierre de mes
        <span className='block text-[11px] text-[#455a54]/60'>
          Una inversión (un horno, una máquina…). Queda registrado y se ve
          aparte, pero no suma a los egresos del mes ni baja el balance.
        </span>
      </span>
    </button>
  );
}
