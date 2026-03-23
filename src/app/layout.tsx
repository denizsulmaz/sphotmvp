import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import FooterContent from '@/components/FooterContent';
import Script from 'next/script';
import { LanguageProvider } from '@/context/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SPHOT - Find Your Perfect Photographer',
  description: 'Discover and book the finest photographers in Seoul.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-BX3S1J7C4J"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-BX3S1J7C4J');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <LanguageProvider>
        <div className="min-h-screen bg-white text-foreground flex flex-col w-full">

          {/* ═══════════ GLOBALLY FIXED TOP NAV ═══════════ */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
              <Link href="/" className="text-2xl font-black tracking-tighter text-foreground">
                SPHOT<span className="text-accent">.</span>
              </Link>
              {/* Right side: language selector + filter slot (filled by page via portal) */}
              <div className="flex items-center gap-2">
                <LanguageSelector />
                <div id="nav-filter-slot" />
              </div>
            </div>
          </header>

          {/* Push content below fixed header */}
          <div className="pt-16 flex-1 flex flex-col">
            <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col">
              {children}
            </main>

            <FooterContent />
          </div>
        </div>
        </LanguageProvider>
      </body>
    </html>
  );
}

