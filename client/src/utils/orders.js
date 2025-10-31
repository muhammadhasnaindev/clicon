// src/utils/orders.js
// Same ID everywhere: code/number/orderNo/orderID/orderId/id/_id
export const displayOrderId = (o) =>
  String(o?.code || o?.number || o?.orderNo || o?.orderID || o?.orderId || o?.id || o?._id || "").trim();

// Money helper with Intl; graceful fallback
export const fmtMoney = (v, currency = "USD") => {
  const num = Number(v ?? 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
};

// Status/Stage options (use in Admin selects if needed)
export const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const STAGE_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "packaging", label: "Packaging" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

/* ===================== NEW LOGIC =====================
 * Robust progress index mapper used by tracking UI.
 * - Understands more aliases (road, packing, lastmile, verified, completed)
 * - Status can override stage when clearly terminal
 * ==================================================== */
export const stageToIndex = (stage = "", status = "") => {
  const s = String(stage).toLowerCase();
  const st = String(status).toLowerCase();

  if (st === "cancelled") return 0;           // show as not progressed
  if (st === "completed") return 3;

  if (s === "delivered" || s === "completed" || s === "lastmile") return 3;
  if (s === "road" || s === "ontheroad" || s === "shipped" || st === "in progress") return 2;
  if (s === "packaging" || s === "packing" || s === "created" || s === "verified" || st === "pending") return 1;

  return 0; // placed / default
};
