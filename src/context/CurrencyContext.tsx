"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Currency,
  CURRENCY_CODES,
  RatesPerKrw,
  fallbackRatesPerKrw,
  formatKrwAmount,
  formatKrwString,
} from "@/lib/currency";

const STORAGE_KEY = "sphot_currency";
const RATES_CACHE_KEY = "sphot_fx_rates_v1";
const RATES_TTL_MS = 12 * 60 * 60 * 1000; // 12h

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Format a numeric KRW amount in the active currency. */
  formatKrw: (krw: number) => string;
  /** Convert a pre-formatted KRW string (e.g. "₩150,000") to the active currency. */
  formatPriceString: (display: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "KRW",
  setCurrency: () => {},
  formatKrw: (krw) => `₩${Math.round(krw).toLocaleString()}`,
  formatPriceString: (display) => display,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("KRW");
  const [rates, setRates] = useState<RatesPerKrw>(fallbackRatesPerKrw());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (stored && CURRENCY_CODES.includes(stored)) {
      setCurrencyState(stored);
    }

    // Live rates with localStorage cache; silently keeps fallback rates on failure.
    try {
      const cached = localStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const { ts, rates: r } = JSON.parse(cached);
        if (r && Date.now() - ts < RATES_TTL_MS) {
          setRates(r);
          return;
        }
      }
    } catch {
      /* ignore corrupt cache */
    }

    fetch("https://open.er-api.com/v6/latest/KRW")
      .then((res) => res.json())
      .then((data) => {
        if (data?.result !== "success" || !data.rates) return;
        const next: RatesPerKrw = {};
        for (const code of CURRENCY_CODES) {
          if (typeof data.rates[code] === "number") next[code] = data.rates[code];
        }
        setRates((prev) => ({ ...prev, ...next }));
        localStorage.setItem(
          RATES_CACHE_KEY,
          JSON.stringify({ ts: Date.now(), rates: next })
        );
      })
      .catch(() => {
        /* offline / blocked — fallback rates stay in place */
      });
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  };

  const formatKrw = (krw: number) => formatKrwAmount(krw, currency, rates);
  const formatPriceString = (display: string) =>
    formatKrwString(display, currency, rates);

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, formatKrw, formatPriceString }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
