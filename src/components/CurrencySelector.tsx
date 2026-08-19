"use client";

import { useRef, useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { CURRENCIES } from "@/lib/currency";

export default function CurrencySelector({ fullWidth = false }: { fullWidth?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    // fullWidth: wrapper is not positioned so the dropdown anchors to the
    // nearest positioned ancestor (the mobile menu panel) and centers on the page
    <div ref={ref} className={fullWidth ? "flex-1" : "relative"}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Select currency"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-sm font-bold text-foreground dark:text-white border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 ${
          fullWidth ? "w-full justify-center py-2.5" : ""
        }`}
      >
        <Coins size={15} className="text-gray-500 dark:text-zinc-400" />
        <span>{currency}</span>
      </button>

      {open && (
        <div
          className={`absolute mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl z-[100] ${
            fullWidth
              ? "left-1/2 -translate-x-1/2 w-56"
              : "left-1/2 -translate-x-1/2 top-full w-40"
          }`}
        >
          <div className="px-3.5 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 text-center">
            Currency
          </div>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setCurrency(c.code);
                setOpen(false);
              }}
              className={`relative w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800 ${
                fullWidth ? "justify-center" : ""
              } ${
                currency === c.code
                  ? "bg-accent/10 text-foreground dark:text-white font-bold"
                  : "text-gray-700 dark:text-zinc-400 font-medium"
              }`}
            >
              <img
                src={c.flagSrc}
                alt=""
                className={`w-6 h-6 rounded-full shrink-0 ${
                  fullWidth ? "absolute left-3.5 top-1/2 -translate-y-1/2" : ""
                }`}
                loading="lazy"
              />
              <span className="w-5 shrink-0 text-center text-gray-500 dark:text-zinc-500">
                {c.symbol}
              </span>
              <span>{c.code}</span>
              {currency === c.code && (
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-accent shrink-0 ${
                    fullWidth ? "absolute right-3.5 top-1/2 -translate-y-1/2" : "ml-auto"
                  }`}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
