// Display-only currency conversion. All prices are stored and settled in KRW;
// other currencies are approximate conversions for visitor convenience.
export type Currency =
  | 'KRW'
  | 'USD'
  | 'CNY'
  | 'JPY'
  | 'TWD'
  | 'HKD'
  | 'EUR'
  | 'THB'
  | 'TRY'
  | 'RUB';

export const CURRENCIES: { code: Currency; symbol: string; label: string; flagSrc: string }[] = [
  { code: 'KRW', symbol: '₩', label: '한국 원 (KRW)', flagSrc: '/flags/kr.svg' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)', flagSrc: '/flags/us.svg' },
  { code: 'CNY', symbol: '¥', label: '人民币 (CNY)', flagSrc: '/flags/cn.svg' },
  { code: 'JPY', symbol: '¥', label: '日本円 (JPY)', flagSrc: '/flags/jp.svg' },
  { code: 'TWD', symbol: 'NT$', label: '新台幣 (TWD)', flagSrc: '/flags/tw.svg' },
  { code: 'HKD', symbol: 'HK$', label: 'Hong Kong Dollar (HKD)', flagSrc: '/flags/hk.svg' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)', flagSrc: '/flags/eu.svg' },
  { code: 'THB', symbol: '฿', label: 'บาทไทย (THB)', flagSrc: '/flags/th.svg' },
  { code: 'TRY', symbol: '₺', label: 'Türk Lirası (TRY)', flagSrc: '/flags/tr.svg' },
  { code: 'RUB', symbol: '₽', label: 'Рубль (RUB)', flagSrc: '/flags/ru.svg' },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as Currency[];

/** Approximate KRW per 1 unit of each currency — offline fallback only.
 *  Live rates are fetched (and cached) by CurrencyContext. */
export const FALLBACK_KRW_PER_UNIT: Record<Currency, number> = {
  KRW: 1,
  USD: 1380,
  CNY: 190,
  JPY: 9.2,
  TWD: 43,
  HKD: 177,
  EUR: 1500,
  THB: 39,
  TRY: 34,
  RUB: 15,
};

/** Rates map: units of `currency` per 1 KRW (as returned by the rates API). */
export type RatesPerKrw = Partial<Record<Currency, number>>;

export function fallbackRatesPerKrw(): RatesPerKrw {
  const rates: RatesPerKrw = {};
  for (const c of CURRENCY_CODES) rates[c] = 1 / FALLBACK_KRW_PER_UNIT[c];
  return rates;
}

/** Zero-decimal currencies: amounts are shown as whole units. */
const NO_DECIMALS: Currency[] = ['KRW', 'JPY', 'TWD', 'RUB'];

/**
 * Format a KRW amount in the target currency.
 * Non-KRW results are prefixed with "≈" since they're approximate conversions.
 */
export function formatKrwAmount(
  krw: number,
  currency: Currency,
  rates: RatesPerKrw
): string {
  const meta = CURRENCIES.find((c) => c.code === currency)!;
  if (currency === 'KRW') return `₩${Math.round(krw).toLocaleString()}`;
  const rate = rates[currency] ?? 1 / FALLBACK_KRW_PER_UNIT[currency];
  const amount = krw * rate;
  const digits = NO_DECIMALS.includes(currency) ? 0 : amount < 100 ? 2 : 0;
  return `≈ ${meta.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/**
 * Convert a pre-formatted KRW display string (e.g. "₩150,000") to the target
 * currency. Returns the input unchanged if it can't be parsed or is KRW.
 */
export function formatKrwString(
  display: string,
  currency: Currency,
  rates: RatesPerKrw
): string {
  if (currency === 'KRW') return display;
  const numeric = Number(display.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return display;
  return formatKrwAmount(numeric, currency, rates);
}
