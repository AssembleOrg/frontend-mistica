'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Printer, X } from 'lucide-react';
import { financeService, type FinanceSummary } from '@/services/finance.service';
import { MonthlyReportViewer } from '@/components/dashboard/finances/monthly-report-viewer';
import { useEgressBreakdown } from '@/hooks/useEgressBreakdown';
import { showToast } from '@/lib/toast';

function MonthlyReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportLabel, setReportLabel] = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const label = searchParams.get('label');

    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      showToast.error('Período inválido');
      router.back();
      return;
    }

    setReportLabel(label ?? `${from} – ${to}`);
    setRange({ from, to });

    const load = async () => {
      try {
        setIsLoading(true);
        const res = await financeService.summary({ from, to });
        setSummary(res.data);
      } catch (err) {
        console.error(err);
        showToast.error('Error al cargar el reporte');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [searchParams, router]);

  // El cierre incluye el detalle de egresos por categoría: un solo documento.
  const egresses = useEgressBreakdown({
    from: range?.from,
    to: range?.to,
    enabled: range !== null,
  });

  useEffect(() => {
    if (!summary || isLoading || egresses.loading) return;
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, [summary, isLoading, egresses.loading]);

  if (isLoading || egresses.loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: '#455a54', borderTopColor: 'transparent' }} />
          <p style={{ color: '#4e4247', fontSize: 14 }}>Generando reporte...</p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <>
      {/* A4 con márgenes: el @page global es 80mm (ticket térmico) y deformaba
          este reporte. Con el detalle de egresos ocupa más de una carilla, así
          que además evitamos cortar filas al medio. */}
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
          {reportLabel}
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

      {/* Espaciado para compensar la barra fija */}
      <div className="print:hidden" style={{ height: 52 }} />

      <MonthlyReportViewer summary={summary} monthLabel={reportLabel} egresses={egresses} />
    </>
  );
}

export default function MonthlyReportPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: '#455a54', borderTopColor: 'transparent' }} />
          <p style={{ color: '#4e4247', fontSize: 14 }}>Cargando...</p>
        </div>
      </div>
    }>
      <MonthlyReportContent />
    </Suspense>
  );
}
