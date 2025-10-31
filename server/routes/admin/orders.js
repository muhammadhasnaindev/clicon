// server/routes/admin/orders.js
// Orders admin APIs: list, CSV export, status/stage updates.

import express from "express";
import mongoose from "mongoose";
import Order from "../../models/Order.js";
import {
  requireAuth,
  requireVerified,
  requireRole,
  requirePermission,
} from "../../middleware/auth.js";

const router = express.Router();

// Admin/Manager + verified
router.use(requireAuth, requireVerified, requireRole(["admin", "manager"]));

/* ---- Small helpers / constants ---- */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const ORDER_STATUSES = new Set(["pending", "in progress", "completed", "cancelled"]);
const ORDER_STAGES = new Set(["created", "packaging", "shipped", "delivered"]);
const isValidId = (v) => mongoose.isValidObjectId(v);
const safeInt = (v, def, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
};
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(+d) ? null : d;
};

/*
[PRO] Purpose: Permission gate for read list/export.
Context: Any of the listed permissions grants access.
Notes: Uses existing middleware factory; kept behavior.
*/
const canViewOrders = requirePermission(["billing:view", "orders:update", "analytics:view"]);

/*
[PRO] Purpose: Build Mongo filter from query with light guards.
Context: Supports text search (email or id), status, stage, date range.
Edge cases: Invalid dates ignored; ObjectId search only when valid.
Notes: Returned object is used as-is by Mongoose.
*/
function buildFilter(qs = {}) {
  const { q = "", status = "", stage = "", from = "", to = "" } = qs;
  const where = {};

  if (q) {
    const rx = new RegExp(String(q).trim(), "i");
    const or = [{ "customer.email": rx }];
    if (isValidId(q)) or.push({ _id: new mongoose.Types.ObjectId(q) });
    where.$or = or;
  }

  if (status) where.status = String(status);
  if (stage) where.stage = String(stage);

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate || toDate) {
    const createdAt = {};
    if (fromDate) createdAt.$gte = fromDate;
    if (toDate) createdAt.$lt = toDate;
    where.createdAt = createdAt;
  }

  return where;
}

/*
[PRO] Purpose: List orders with simple pagination and projection.
Context: Keeps original fields; sorts newest first.
Notes: CSV export reuses buildFilter without pagination.
*/
router.get("/", canViewOrders, async (req, res) => {
  const page = safeInt(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = safeInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where = buildFilter(req.query);

  const projection =
    "createdAt updatedAt customer.firstName customer.lastName customer.email items totals payment status stage";

  const [items, total] = await Promise.all([
    Order.find(where).sort({ createdAt: -1 }).skip(skip).limit(limit).select(projection).lean(),
    Order.countDocuments(where),
  ]);

  const data = items.map((o) => ({
    id: String(o._id),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    customer: {
      name: [o?.customer?.firstName, o?.customer?.lastName].filter(Boolean).join(" ").trim(),
      email: o?.customer?.email || "",
    },
    itemsCount: Array.isArray(o.items) ? o.items.length : 0,
    itemsTitles: (o.items || []).map((i) => i?.title).filter(Boolean).join(" | "),
    totals:
      o.totals || { subtotalBase: 0, discountBase: 0, taxBase: 0, totalBase: 0, currency: "USD" },
    payment: {
      method: o?.payment?.method || "demo",
      status: o?.payment?.status || "paid",
      brand: o?.payment?.brand || "",
      last4: o?.payment?.last4 || "",
      txnId: o?.payment?.txnId || "",
    },
    status: o.status,
    stage: o.stage,
  }));

  res.json({ ok: true, data, meta: { total, page, limit } });
});

/*
[PRO] Purpose: Export orders CSV with same filters as list.
Context: ISO date formatting; RFC4180-ish escaping.
Notes: Filename uses ISO date prefix for predictability.
*/
router.get("/export.csv", canViewOrders, async (req, res) => {
  const where = buildFilter(req.query);

  const rows = await Order.find(where)
    .sort({ createdAt: -1 })
    .select(
      "createdAt updatedAt customer.firstName customer.lastName customer.email items totals payment.status payment.method payment.brand payment.last4 payment.txnId status stage"
    )
    .lean();

  const header = [
    "OrderID","CreatedAt","UpdatedAt","CustomerName","CustomerEmail","ItemsCount","ItemTitles",
    "SubtotalUSD","DiscountUSD","TaxUSD","TotalUSD","PaymentMethod","PaymentStatus","PaymentBrand",
    "PaymentLast4","TxnId","Status","Stage",
  ].join(",");

  const csvSafe = (v) => {
    const s = String(v ?? "");
    return /[\",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = rows.map((o) => {
    const name = [o?.customer?.firstName, o?.customer?.lastName].filter(Boolean).join(" ").trim();
    const titles = (o.items || []).map((i) => (i?.title || "").replace(/"/g, '""')).join(" | ");
    return [
      o._id,
      o.createdAt?.toISOString?.() || "",
      o.updatedAt?.toISOString?.() || "",
      csvSafe(name),
      csvSafe(o?.customer?.email || ""),
      (o.items || []).length,
      csvSafe(titles),
      o?.totals?.subtotalBase ?? 0,
      o?.totals?.discountBase ?? 0,
      o?.totals?.taxBase ?? 0,
      o?.totals?.totalBase ?? 0,
      csvSafe(o?.payment?.method || ""),
      csvSafe(o?.payment?.status || ""),
      csvSafe(o?.payment?.brand || ""),
      csvSafe(o?.payment?.last4 || ""),
      csvSafe(o?.payment?.txnId || ""),
      csvSafe(o?.status || ""),
      csvSafe(o?.stage || ""),
    ].join(",");
  });

  const csv = [header, ...lines].join("\n");
  const fname = `orders-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
  res.status(200).send(csv);
});

/*
[PRO] Purpose: Update order status with de-dupe and timeline append.
Context: No-op if same within 30s; sets delivered/cancelled timestamps.
Notes: Validates id + status set; returns updated order.
*/
router.put(
  "/:id/status",
  requirePermission("orders:update"),
  async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    let status = String(req.body?.status || "").toLowerCase();
    if (!ORDER_STATUSES.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: "Not found" });

    if (String(o.status).toLowerCase() === status) {
      return res.json({ ok: true, data: o }); // no-op
    }

    const now = Date.now();
    const last = o.statusTimeline?.[o.statusTimeline.length - 1];
    const lastIsSame =
      last && last.code === status && now - new Date(last.at || 0).getTime() < 30_000;

    o.status = status;
    if (status === "completed") o.deliveredAt = new Date();
    if (status === "cancelled") o.cancelledAt = new Date();

    if (!lastIsSame) {
      o.statusTimeline.push({ code: status, note: "Status updated by admin", at: new Date() });
    }

    await o.save();
    res.json({ ok: true, data: o });
  }
);

/*
[PRO] Purpose: Update order stage with alias + de-dupe and timeline append.
Context: "packing" is normalized to "packaging"; sets timestamps.
Notes: Validates id + stage set; returns updated order.
*/
router.put(
  "/:id/stage",
  requirePermission("orders:update"),
  async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    let stage = String(req.body?.stage || "").toLowerCase();
    if (stage === "packing") stage = "packaging";
    if (!ORDER_STAGES.has(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: "Not found" });

    if (String(o.stage).toLowerCase() === stage) {
      return res.json({ ok: true, data: o }); // no-op
    }

    const now = Date.now();
    const last = o.statusTimeline?.[o.statusTimeline.length - 1];
    const lastIsSame =
      last && last.code === stage && now - new Date(last.at || 0).getTime() < 30_000;

    o.stage = stage;
    if (stage === "shipped") o.shippedAt = new Date();
    if (stage === "delivered") {
      o.deliveredAt = new Date();
      o.status = "completed";
    }

    if (!lastIsSame) {
      o.statusTimeline.push({ code: stage, note: "Stage updated by admin", at: new Date() });
    }

    await o.save();
    res.json({ ok: true, data: o });
  }
);

export default router;
