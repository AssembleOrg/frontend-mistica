'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Download, Printer } from 'lucide-react';

/** Tarjetas por hoja A4: 2 columnas × 5 filas de 85 × 55 mm (tamaño tarjeta). */
const CARDS_PER_SHEET = 10;

/**
 * Hoja A4 lista para imprimir con las tarjetitas del Mensaje del Tarot: el
 * mismo QR que antes iba en el ticket (cada escaneo saca una carta al azar y
 * abajo ofrece reseña en Google, Instagram y reservar). Se imprime en
 * cartulina y se corta por las líneas punteadas.
 */
export default function TarjetasTarotPage() {
  const [qr, setQr] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    const target = `${window.location.origin}/arcano/random`;
    setUrl(target);
    // 1024 px + quiet zone 2: el mismo PNG sirve impreso y para bajarlo y usarlo en redes.
    QRCode.toDataURL(target, { width: 1024, margin: 2, color: { dark: '#2d2426', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, []);

  return (
    <div className='min-h-screen bg-[#f4efe9] py-6 print:bg-white print:py-0'>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .tarjetas-sheet { box-shadow: none !important; margin: 0 !important; }
        }
        .tarjetas-sheet * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      <div className='mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-2 print:hidden'>
        <div>
          <h1 className='font-tan-nimbus text-xl font-semibold text-[#455a54]'>
            Tarjetas del Mensaje del Tarot
          </h1>
          <p className='text-xs text-[#7a6e6f]'>
            Hoja A4 con {CARDS_PER_SHEET} tarjetas de 85 × 55 mm. En el diálogo de impresión elegí
            márgenes &quot;Ninguno&quot; y escala 100%. El QR lleva a {url || '…'}
          </p>
        </div>
        <div className='flex shrink-0 gap-2'>
          {qr && (
            <a
              href={qr}
              download='qr-mensaje-tarot.png'
              className='inline-flex items-center gap-2 rounded-lg border border-[#455a54]/30 px-4 py-2 text-sm font-semibold text-[#455a54] hover:bg-[#455a54]/5'
            >
              <Download className='h-4 w-4' />
              Descargar QR
            </a>
          )}
          <button
            type='button'
            onClick={() => window.print()}
            disabled={!qr}
            className='inline-flex items-center gap-2 rounded-lg bg-[#455a54] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3b4e49] disabled:opacity-50'
          >
            <Printer className='h-4 w-4' />
            Imprimir hoja
          </button>
        </div>
      </div>

      <div
        className='tarjetas-sheet hoja-imprimible mx-auto grid bg-white shadow-lg'
        style={{
          width: '210mm',
          height: '297mm',
          padding: '11mm 20mm',
          gridTemplateColumns: 'repeat(2, 85mm)',
          gridAutoRows: '55mm',
          boxSizing: 'border-box',
        }}
      >
        {Array.from({ length: CARDS_PER_SHEET }, (_, i) => (
          <div
            key={i}
            className='flex items-center gap-[4mm] overflow-hidden'
            style={{
              outline: '0.2mm dashed #c9bfb0',
              outlineOffset: '-0.1mm',
              padding: '4mm 5mm',
              boxSizing: 'border-box',
            }}
          >
            <div className='flex min-w-0 flex-1 flex-col justify-between self-stretch'>
              <Image src='/Logo-mistica.png' alt='Mística Auténtica' width={70} height={70} style={{ width: '17mm', height: 'auto' }} />
              <div>
                <p className='font-tan-nimbus leading-tight text-[#9d684e]' style={{ fontSize: '13pt' }}>
                  Tu mensaje
                  <br />
                  del Tarot
                </p>
                <p className='mt-[1.5mm] leading-snug text-[#4e4247]' style={{ fontSize: '7pt' }}>
                  Escaneá el código y descubrí la carta que el universo eligió para vos ✨
                </p>
              </div>
              <p className='text-[#7a6e6f]' style={{ fontSize: '6pt' }}>
                @mistica.autentica
              </p>
            </div>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt='QR al mensaje del Tarot' style={{ width: '36mm', height: '36mm', imageRendering: 'pixelated' }} />
            ) : (
              <div style={{ width: '36mm', height: '36mm' }} className='animate-pulse rounded bg-[#f1ede6]' />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
