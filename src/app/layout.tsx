import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import FooterContent from '@/components/FooterContent';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import HeaderNav from '@/components/HeaderNav';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import CookieConsent from '@/components/CookieConsent';

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
      <body className={`${inter.className} transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
        <LanguageProvider>
        <ToastProvider>
        <ErrorBoundary>
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
        </ErrorBoundary>
        <CookieConsent />
        </ToastProvider>
        </LanguageProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
