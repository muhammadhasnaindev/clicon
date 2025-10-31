// src/utils/money.js
export const DEFAULT_BASE_CURRENCY = "USD";

/* ===================== NEW LOGIC =====================
 * - Safe guard FX rates (positive finite numbers)
 * - All helpers are base-currency → target-currency
 * - Backward-compatible formatCurrency fallback to USD
 * ==================================================== */
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
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const nf = new Intl.NumberFormat(locale || undefined, { style: "currency", currency });
  return nf.format(value);
}

export function convertAndFormat(baseAmount, rates, currency, base = DEFAULT_BASE_CURRENCY, locale) {
  return formatMoney(convert(baseAmount, rates, currency, base), currency, locale);
}

/** Preferred UI helper (safe fallback keeps legacy usages working) */
export function formatCurrency(n, rates, currency, base = DEFAULT_BASE_CURRENCY, locale) {
  if (rates && typeof rates === "object" && typeof currency === "string" && currency) {
    return formatMoney(convert(Number(n || 0), rates, currency, base), currency, locale);
  }
  return new Intl.NumberFormat(locale || undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}
