import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import { PwaProvider } from '@/components/pwa/pwa-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Display serif de la landing pública (coincide con el diseño en Pencil).
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

// Sans de cuerpo/UI de la landing boutique (reemplaza Geist en lo público).
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mistica Autentica',
  description: 'Administración',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Mística',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
    // iOS pinta de negro lo transparente: ícono con fondo sólido.
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#455a54',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es-AR'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${inter.variable} antialiased`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster />
        <PwaProvider />
      </body>
    </html>
  );
}
