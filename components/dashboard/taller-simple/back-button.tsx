'use client';

/** "Volver" grande de las pantallas internas, con el título al lado. */
export function BackButton({ onClick, title }: { onClick: () => void; title: React.ReactNode }) {
  return (
    <div className='mb-4 flex items-center gap-3'>
      <button
        type='button'
        onClick={onClick}
        className='h-14 shrink-0 rounded-2xl border-2 border-[#455a54]/25 bg-white px-5 text-lg font-bold text-[#455a54] shadow-sm active:scale-95'
      >
        Volver
      </button>
      <div className='min-w-0 text-2xl font-black text-[#4e4247]'>{title}</div>
    </div>
  );
}
