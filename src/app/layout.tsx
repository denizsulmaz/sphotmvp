import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import FooterContent from '@/components/FooterContent';
import Script from 'next/script';
import { LanguageProvider } from '@/context/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';

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
      <body className={`${inter.className} transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LanguageProvider>
        <div className="min-h-screen bg-white dark:bg-black text-foreground dark:text-zinc-100 flex flex-col w-full overflow-x-hidden">

          {/* ═══════════ GLOBALLY FIXED TOP NAV ═══════════ */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 shadow-sm dark:shadow-none">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
              <Link href="/" className="text-2xl font-black tracking-tighter text-foreground dark:text-white">
                SPHOT<span className="text-accent">.</span>
              </Link>
              {/* Right side: language selector + filter slot (filled by page via portal) */}
              <div className="flex items-center gap-4">
                <Link href="/blog" className="text-sm font-bold text-gray-600 dark:text-zinc-400 hover:text-foreground dark:hover:text-white transition-colors hidden md:block">
                  Blog
                </Link>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSelector />
                  <div id="nav-filter-slot" />
                </div>
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
        </ThemeProvider>
      </body>
    </html>
  );
}

