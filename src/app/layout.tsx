import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/features/theme-provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nldlogistics.co.id'),
  title: 'PT Nusantara Logistik Distribusi — Sistem Manajemen Gudang Enterprise (WMS)',
  description:
    'Sistem Manajemen Pergudangan & Rantai Pasok Multi-Fasilitas (DC Pulogadung Jakarta & DC MM2100 Bekasi) dengan alokasi otomatis FEFO, denah spasial 2D, audit blind-count 4-eyes principle, pelacakan batch kedaluwarsa, dan RBAC enterprise.',
  keywords: [
    'WMS',
    'Warehouse Management System',
    'PT Nusantara Logistik Distribusi',
    'Logistik Indonesia',
    'FEFO Engine',
    'Supply Chain Management',
    'Next.js 16',
    'PostgreSQL 16',
  ],
  authors: [{ name: 'Jhoiwada Simanjuntak' }],
  icons: {
    icon: '/brand-icon.svg',
    shortcut: '/brand-icon.svg',
    apple: '/brand-icon.svg',
  },
  openGraph: {
    title: 'PT Nusantara Logistik Distribusi — Sistem Manajemen Gudang Enterprise (WMS)',
    description:
      'Sistem Manajemen Pergudangan Multi-Fasilitas dengan alokasi otomatis FEFO, denah spasial 2D, audit blind-count 4-eyes, dan integritas transaksi ACID.',
    siteName: 'PT Nusantara Logistik Distribusi',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'PT Nusantara Logistik Distribusi — WMS Enterprise',
    description:
      'Sistem Manajemen Pergudangan Multi-Fasilitas dengan alokasi FEFO dan integritas transaksi ACID.',
  },
};

const themeScript = `
  try {
    var stored = localStorage.getItem('wms-theme');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-[#fbfbfa] text-zinc-900 transition-colors duration-150 dark:bg-[#111113] dark:text-zinc-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
