import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import FooterContent from '@/components/FooterContent';
import Script from 'next/script';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import HeaderNav from '@/components/HeaderNav';
import { ThemeProvider } from '@/components/ThemeProvider';

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
        <AuthProvider>
        <LanguageProvider>
        <div className="min-h-screen bg-white dark:bg-black text-foreground dark:text-zinc-100 flex flex-col w-full overflow-x-hidden">

          {/* ═══════════ GLOBALLY FIXED TOP NAV ═══════════ */}
          <HeaderNav />

          {/* Push content below fixed header */}
          <div className="pt-16 flex-1 flex flex-col">
            <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col">
              {children}
            </main>

            <FooterContent />
          </div>
        </div>
        </LanguageProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

