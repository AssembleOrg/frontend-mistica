'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Printer, X } from 'lucide-react';
import {
  cashboxService,
  type CashSession,
  type SessionTransaction,
} from '@/services/cashbox.service';
import { SessionReportViewer } from '@/components/dashboard/finances/session-report-viewer';
import { defaultSessionLabel } from '@/lib/session-label';
import { showToast } from '@/lib/toast';

function SessionReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [session, setSession] = useState<CashSession | null>(null);
  const [transactions, setTransactions] = useState<SessionTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = searchParams.get('id');

    if (!id) {
      showToast.error('Sesión inválida');
      router.back();
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const [sessRes, txRes] = await Promise.all([
          cashboxService.findOne(id),
          cashboxService.getSessionTransactions(id),
        ]);
        if (!sessRes.data) {
          showToast.error('Sesión no encontrada');
          router.back();
          return;
        }
        setSession(sessRes.data);
        setTransactions(txRes.data?.transactions ?? []);
      } catch (err) {
        console.error(err);
        showToast.error('Error al cargar el balance');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [searchParams, router]);

  useEffect(() => {
    if (!session || isLoading) return;
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, [session, isLoading]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: '#455a54', borderTopColor: 'transparent' }} />
          <p style={{ color: '#4e4247', fontSize: 14 }}>Generando balance...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const reportLabel = session.label?.trim() || defaultSessionLabel(session.openedAt);

  return (
    <>
      {/* Reglas de impresión: A4 con márgenes, colores fieles, sin cortes de fila. */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #ffffff; }
          .receipt-a4 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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

      <SessionReportViewer session={session} transactions={transactions} />
    </>
  );
}

export default function SessionReportPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: '#455a54', borderTopColor: 'transparent' }} />
          <p style={{ color: '#4e4247', fontSize: 14 }}>Cargando...</p>
        </div>
      </div>
    }>
      <SessionReportContent />
    </Suspense>
  );
}
