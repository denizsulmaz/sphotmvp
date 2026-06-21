/**
 * Lemon Squeezy refund helper (server-only).
 *
 * Lemon Squeezy always settles the customer's card in USD, but the *order* is
 * recorded in the store's display currency (KRW for us). The refund API refunds
 * "in the order currency", so we never need to convert here — we issue a FULL
 * refund (omit `amount`) and trust LS to return the same amount/currency it
 * originally charged.
 *
 * In mock payments mode there is no real LS order, so this returns a synthetic
 * success that mirrors the shape the live API would return.
 */

export interface RefundResult {
  ok: boolean;
  /** LS refund/order id (or a mock id). */
  refundId: string;
  /** Refunded amount in the order currency's minor units (e.g. KRW won, USD cents). */
  amount: number;
  currency: string;
  /** True when the refund came from a real Lemon Squeezy call. */
  live: boolean;
  error?: string;
}

const LS_API = "https://api.lemonsqueezy.com/v1";

function paymentsMode(): "live" | "mock" {
  const explicit = process.env.NEXT_PUBLIC_PAYMENTS_MODE;
  if (explicit === "live" || explicit === "mock") return explicit;
  // Infer: if a product id is configured, assume live.
  return process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRODUCT_ID ? "live" : "mock";
}

/**
 * Issue a full refund for a paid booking.
 *
 * @param orderId  The Lemon Squeezy order id stored on the booking (`checkout_id`).
 * @param fallbackAmount  Amount to record in mock mode (the booking's stored fee).
 * @param fallbackCurrency  Currency to record in mock mode (defaults to KRW).
 */
export async function issueRefund(
  orderId: string | null | undefined,
  fallbackAmount: number,
  fallbackCurrency = "KRW"
): Promise<RefundResult> {
  const mode = paymentsMode();

  // ── Mock mode: no real order to refund — simulate the LS response shape. ──
  if (mode === "mock") {
    return {
      ok: true,
      refundId: `mock_refund_${orderId || "unknown"}`,
      amount: fallbackAmount,
      currency: fallbackCurrency,
      live: false,
    };
  }

  // ── Live mode: call the Lemon Squeezy refund endpoint. ──
  const apiKey = process.env.LEMONSQUEEZY_API_KEY || "";
  if (!apiKey) {
    return {
      ok: false,
      refundId: "",
      amount: 0,
      currency: fallbackCurrency,
      live: true,
      error: "LEMONSQUEEZY_API_KEY is not configured.",
    };
  }
  if (!orderId) {
    return {
      ok: false,
      refundId: "",
      amount: 0,
      currency: fallbackCurrency,
      live: true,
      error: "No Lemon Squeezy order id on this booking; cannot refund.",
    };
  }

  try {
    const res = await fetch(`${LS_API}/orders/${orderId}/refund`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      // Omit `amount` → full refund in the order's own currency.
      body: JSON.stringify({
        data: { type: "orders", id: String(orderId), attributes: {} },
      }),
    });

    const json: any = await res.json().catch(() => null);

    if (!res.ok) {
      const detail =
        json?.errors?.[0]?.detail || json?.message || `HTTP ${res.status}`;
      return {
        ok: false,
        refundId: "",
        amount: 0,
        currency: fallbackCurrency,
        live: true,
        error: `Lemon Squeezy refund failed: ${detail}`,
      };
    }

    const attrs = json?.data?.attributes || {};
    return {
      ok: true,
      refundId: String(json?.data?.id || orderId),
      // LS stores totals in the order currency's minor unit; refunded_amount is
      // the cumulative refunded value. Fall back to the booking fee if absent.
      amount:
        typeof attrs.refunded_amount === "number"
          ? attrs.refunded_amount
          : fallbackAmount,
      currency: attrs.currency || fallbackCurrency,
      live: true,
    };
  } catch (e: any) {
    return {
      ok: false,
      refundId: "",
      amount: 0,
      currency: fallbackCurrency,
      live: true,
      error: e?.message || "Network error calling Lemon Squeezy.",
    };
  }
}
