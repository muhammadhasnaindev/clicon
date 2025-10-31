// money utils file me (jahan yeh functions hain)

// already theek:
export const DEFAULT_BASE_CURRENCY = "USD";

/* ===================== NEW LOGIC =====================
 * Small guard to ensure a valid ISO code reaches Intl.
 * Falls back to DEFAULT_BASE_CURRENCY if something odd slips in.
 * ==================================================== */
const safeCurrency = (c) =>
  typeof c === "string" && c.trim().length >= 3 ? c.trim().toUpperCase() : DEFAULT_BASE_CURRENCY;

function safeRate(rates, code) {
  if (!rates || typeof rates !== "object") return 1;
  const r = rates[code];
  return typeof r === "number" && isFinite(r) && r > 0 ? r : 1;
}

export function convert(amount, rates, target, base = DEFAULT_BASE_CURRENCY) {
  const amt = Number(amount) || 0;
  const rTo = safeRate(rates, target);
  const rFrom = safeRate(rates, base);
  return amt * (rTo / rFrom);
}

export function formatMoney(amount, currency = DEFAULT_BASE_CURRENCY, locale) {
  const value = Number.isFinite(amount) ? Number(amount) : 0;
  /* ===================== NEW LOGIC =====================
   * Defend against invalid currency codes for Intl.NumberFormat.
   * ==================================================== */
  const cur = safeCurrency(currency);
  const nf = new Intl.NumberFormat(locale || undefined, { style: "currency", currency: cur });
  return nf.format(value);
}

export function convertAndFormat(baseAmount, rates, currency, base = DEFAULT_BASE_CURRENCY, locale) {
  return formatMoney(convert(baseAmount, rates, currency, base), currency, locale);
}

/* 🔧 REPLACE this function (remove USD hardcode)
   Backward compatible:
   - Agar sirf 1 arg diya ho (purana use): USD me format karega (previous behavior)
   - Agar rates + currency diye hon: selected currency me format karega
*/
export function formatCurrency(n, rates, currency, base = DEFAULT_BASE_CURRENCY, locale) {
  // ===================== NEW LOGIC =====================
  // Preferred path: convert from base to selected currency using provided rates.
  if (rates && typeof rates === "object" && typeof currency === "string" && currency) {
    return formatMoney(convert(Number(n || 0), rates, currency, base), currency, locale);
  }
  // Old fallback (so purani jagah crash na ho) — keep legacy USD formatting.
  const val = Number(n) || 0;
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(val);
  } catch {
    // Final guard if Intl throws for some reason.
    return `$${val.toFixed(2)}`;
  }
}
