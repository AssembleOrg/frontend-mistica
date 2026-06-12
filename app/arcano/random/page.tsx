'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ArcanoRandom() {
  const router = useRouter();

  useEffect(() => {
    const n = Math.floor(Math.random() * 22);
    router.replace(`/arcano?numero=${n}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900">
      <div className="flex flex-col items-center gap-4 text-purple-200">
        <div className="text-4xl animate-pulse">🔮</div>
        <p className="text-sm tracking-widest uppercase opacity-60">Consultando el tarot…</p>
      </div>
    </div>
  );
}
