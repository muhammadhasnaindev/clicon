// server/routes/admin/stats.js
// Sales/analytics endpoints (admin/manager with analytics:view).
// Summary: Yearly sales by month, top products, category/item views.

import express from "express";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import { requireAuth, requireVerified, requirePermission } from "../../middleware/auth.js";

const router = express.Router();

const TOP_LIMIT_DEFAULT = 10;
const TOP_LIMIT_MAX = 100;

// Auth + verified for all stats endpoints
router.use(requireAuth, requireVerified);

/*
[PRO] Purpose: Yearly sales summary (orders + revenue) grouped by month.
Context: Revenue from totals.totalBase (USD base).
Notes: Fills missing months with zeros.
*/
router.get("/sales", requirePermission("analytics:view"), async (req, res) => {
  const nowYear = new Date().getFullYear();
  const year = Number(req.query.year) || nowYear;
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { m: { $month: "$createdAt" } },
        orders: { $sum: 1 },
        revenue: { $sum: "$totals.totalBase" },
      },
    },
    { $project: { _id: 0, month: "$_id.m", orders: 1, revenue: 1 } },
    { $sort: { month: 1 } },
  ]);

  const map = new Map(rows.map((r) => [r.month, r]));
  const out = [];
  for (let m = 1; m <= 12; m++) out.push(map.get(m) || { month: m, orders: 0, revenue: 0 });
  res.json({ data: out });
});

/*
[PRO] Purpose: Top products by qty and revenue.
Context: Uses items.qty and items.subtotalBase per order item.
Notes: Limit clamped to 1..100.
*/
router.get("/top-products", requirePermission("analytics:view"), async (req, res) => {
  const limit = Math.min(TOP_LIMIT_MAX, Math.max(1, Number(req.query.limit) || TOP_LIMIT_DEFAULT));
  const rows = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        title: { $first: "$items.title" },
        qty: { $sum: "$items.qty" },
        revenue: { $sum: "$items.subtotalBase" },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: limit },
    { $project: { _id: 0, productId: "$_id", title: 1, qty: 1, revenue: 1 } },
  ]);

  res.json({ data: rows });
});

/*
[PRO] Purpose: Category view totals for dashboard.
Context: Aggregates by product.category and viewCount.
Notes: Returns views + item counts per category.
*/
router.get("/category-views", requirePermission("analytics:view"), async (_req, res) => {
  const rows = await Product.aggregate([
    { $group: { _id: "$category", views: { $sum: "$viewCount" }, items: { $sum: 1 } } },
    { $project: { _id: 0, category: "$_id", views: 1, items: 1 } },
    { $sort: { views: -1 } },
  ]);
  res.json({ data: rows });
});

/*
[PRO] Purpose: Top N items by viewCount.
Context: Simple read with projection; lean() for lighter memory.
Notes: Limit clamped to 1..100.
*/
router.get("/item-views", requirePermission("analytics:view"), async (req, res) => {
  const limit = Math.min(TOP_LIMIT_MAX, Math.max(1, Number(req.query.limit) || TOP_LIMIT_DEFAULT));
  const rows = await Product.find({}, "title category viewCount slug")
    .sort({ viewCount: -1 })
    .limit(limit)
    .lean();
  res.json({ data: rows });
});

export default router;
