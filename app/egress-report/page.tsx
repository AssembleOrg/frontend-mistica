'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Printer, X } from 'lucide-react';
import { EgressReportViewer } from '@/components/dashboard/finances/egress-report-viewer';
import { useEgressBreakdown } from '@/hooks/useEgressBreakdown';
import { showToast } from '@/lib/toast';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function Loader({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="text-center">
        <div
          className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4"
          style={{ borderColor: '#455a54', borderTopColor: 'transparent' }}
        />
        <p style={{ color: '#4e4247', fontSize: 14 }}>{text}</p>
      </div>
    </div>
  );
}

function EgressReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [reportLabel, setReportLabel] = useState('');

  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const label = searchParams.get('label');

    if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
      showToast.error('Período inválido');
      router.back();
      return;
    }

    setReportLabel(label ?? `${from} – ${to}`);
    setRange({ from, to });
  }, [searchParams, router]);

  const egresses = useEgressBreakdown({
    from: range?.from,
    to: range?.to,
    enabled: range !== null,
  });

  // Auto-print sólo con los datos cargados y sin error: imprimir un reporte
  // en blanco o con un mensaje de fallo no le sirve a nadie.
  useEffect(() => {
    if (!range || egresses.loading || egresses.error) return;
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, [range, egresses.loading, egresses.error]);

  if (!range || egresses.loading) {
    return <Loader text="Generando reporte de egresos..." />;
  }

  return (
    <>
      {/* A4 con márgenes: el @page global es 80mm (ticket térmico) y deformaría
          este reporte. El detalle puede ocupar más de una carilla, así que
          además evitamos cortar filas al medio. */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #ffffff; }
          .receipt-a4 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            min-height: 0 !important;
          }
          tr { break-inside: avoid; }
        }
      `}</style>

      {/* Barra de controles — oculta en impresión */}
      <div
        className="print:hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: '#455a54',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
        }}
      >
        <span style={{ color: '#efcbb9', fontSize: 13, fontWeight: 600 }}>
          Egresos · {reportLabel}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#9d684e', color: 'white',
              border: 'none', borderRadius: 6,
              padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Printer size={14} />
            Imprimir / Guardar PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,0.12)', color: '#efcbb9',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
              padding: '6px 12px', fontSize: 13, cursor: 'pointer',
            }}
          >
            <X size={14} />
            Cerrar
          </button>
        </div>
      </div>

      <div className="print:hidden" style={{ height: 52 }} />

      <EgressReportViewer egresses={egresses} periodLabel={reportLabel} />
    </>
  );
}

export default function EgressReportPage() {
  return (
    <Suspense fallback={<Loader text="Cargando..." />}>
      <EgressReportContent />
    </Suspense>
  );
}
