import type { Metadata } from 'next';
// ── BRAND FONT ── To swap the font, change this import + the `brandFont` line
// below (and FONT.name in src/lib/brand.ts). Everything inherits via --font-brand.
import { Inter } from 'next/font/google';
import './globals.css';
import { BRAND } from '@/lib/brand';
import FooterContent from '@/components/FooterContent';
import { LanguageProvider } from '@/context/LanguageContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { AuthProvider } from '@/context/AuthContext';
import HeaderNav from '@/components/HeaderNav';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import GlobalErrorReporter from '@/components/GlobalErrorReporter';
import SupportBubble from '@/components/SupportBubble';
import CookieConsent from '@/components/CookieConsent';

// Exposes the font as the `--font-brand` CSS variable consumed by Tailwind's
// font-sans (see tailwind.config.ts) and applied on <body>.
const brandFont = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-brand' });

const siteUrl = BRAND.url;

const siteTitle = `${BRAND.name} — ${BRAND.tagline}`;
const siteDesc =
  "Browse, chat with, and book vetted photographers in Seoul directly. Free connection directory and secure chat — Hanbok, couple, family, wedding, editorial and more.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s · ${BRAND.name}`,
  },
  description: siteDesc,
  applicationName: BRAND.name,
  keywords: ['Seoul photographer', 'Hanbok photoshoot', 'book photographer Korea', 'couple photoshoot Seoul', BRAND.name],
  icons: { icon: '/favicon.ico' },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: siteTitle,
    description: 'Browse, chat with, and book vetted photographers in Seoul.',
    url: siteUrl,
    images: [{ url: '/media/banner-bg.jpg', width: 1200, height: 630, alt: BRAND.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: 'Browse, chat with, and book vetted photographers in Seoul.',
    images: ['/media/banner-bg.jpg'],
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND.colors.lightBg },
    { media: '(prefers-color-scheme: dark)', color: BRAND.colors.darkBg },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${brandFont.variable} font-sans transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
        <LanguageProvider>
        <CurrencyProvider>
        <ToastProvider>
        <GlobalErrorReporter />
        <SupportBubble />
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
        </CurrencyProvider>
        </LanguageProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
