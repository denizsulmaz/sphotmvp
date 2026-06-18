"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

const CONSENT_KEY = "sphot_cookie_consent";
const GA_ID = "G-BX3S1J7C4J";

type ConsentStatus = "accepted" | "rejected" | null;

function getStoredConsent(): ConsentStatus {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "rejected") return stored;
  } catch {
    // localStorage unavailable
  }
  return null;
}

function setStoredConsent(status: "accepted" | "rejected") {
  try {
    localStorage.setItem(CONSENT_KEY, status);
  } catch {
    // localStorage unavailable
  }
}

/**
 * GDPR/KVKK-compliant cookie consent banner.
 * - Blocks Google Analytics until the user gives consent.
 * - Stores consent choice in localStorage.
 * - Shows Accept / Reject options.
 */
export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus | "loading">("loading");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored);
    if (!stored) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setStoredConsent("accepted");
    setConsent("accepted");
    setIsVisible(false);
  };

  const handleReject = () => {
    setStoredConsent("rejected");
    setConsent("rejected");
    setIsVisible(false);
  };

  return (
    <>
      {/* Google Analytics — only loaded after explicit consent */}
      {consent === "accepted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                anonymize_ip: true,
                cookie_flags: 'SameSite=None;Secure'
              });
            `}
          </Script>
        </>
      )}

      {/* Consent Banner */}
      {isVisible && consent !== "accepted" && consent !== "rejected" && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] p-4 md:p-6 animate-in slide-in-from-bottom">
          <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 md:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 space-y-1.5">
                <h3 className="text-sm font-black text-foreground dark:text-white">
                  🍪 Cookie Preferences
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  We use cookies for analytics to improve your experience. No personal data is shared with third parties.
                  Read our{" "}
                  <a
                    href="/privacy"
                    className="underline font-bold text-foreground dark:text-white hover:text-accent transition-colors"
                  >
                    Privacy Policy
                  </a>{" "}
                  for details.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleReject}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
