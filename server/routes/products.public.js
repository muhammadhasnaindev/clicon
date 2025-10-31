// server/routes/products.public.js
// Summary: Public product listing, detail by id/slug, view tracking shim, and category list.

import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
// (Auth imports unused here; keeping public-only as original behavior)
// import { requireAuth, hydrateUser } from "../middleware/auth.js";

const router = express.Router();

/*
[PRO] Purpose: Small helpers for input normalization.
Context: Prevent accidental regex injection and trim noisy inputs.
Edge cases: Empty search; non-numeric pagination.
Notes: Keep minimal to avoid behavior changes.
*/
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));
const toSafeRegex = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

/**
 * GET /api/products
 * Public: only published products.
 * Supports q, category, brand, page, limit.
 */
/*
[PRO] Purpose: Paginated product list with lightweight search.
Context: Original logic kept; added safe regex + clamps.
Edge cases: Missing filters; empty results; large limits.
Notes: Sort newest first to match existing UI.
*/
router.get("/", async (req, res) => {
  const page = clamp(req.query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = clamp(req.query.limit, 1, 100);
  const skip = (page - 1) * limit;

  const q = { published: true };

  const rawSearch = String(req.query.q || "").trim();
  if (rawSearch) {
    const rx = toSafeRegex(rawSearch);
    q.$or = [
      { title: rx },
      { brand: rx },
      { category: rx },
      { slug: rx },
    ];
  }

  if (req.query.category) q.category = String(req.query.category);
  if (req.query.brand) q.brand = String(req.query.brand);

  const [data, total] = await Promise.all([
    Product.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(q),
  ]);

  res.json({ ok: true, data, meta: { total, page, limit } });
});

/**
 * GET /api/products/:idOrSlug
 * Public: only published products
 */
/*
[PRO] Purpose: Fetch a single product by Mongo id or slug.
Context: Keep public visibility; no auth needed.
Edge cases: Unknown id/slug → 404; invalid ObjectId falls back to slug.
Notes: Lean read for speed.
*/
router.get("/:idOrSlug", async (req, res) => {
  const { idOrSlug } = req.params;
  const selector = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };
  const doc = await Product.findOne({ ...selector, published: true }).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true, data: doc });
});

/**
 * POST /api/products/:idOrSlug/track-view
 * Public: increments viewCount for analytics. No auth needed.
 */
/*
[PRO] Purpose: Increment product view counter.
Context: Used by UI to track popularity.
Edge cases: Nonexistent product → 404; id/slug supported equally.
Notes: Returns only the new viewCount.
*/
router.post("/:idOrSlug/track-view", async (req, res) => {
  const { idOrSlug } = req.params;
  const selector = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  const doc = await Product.findOneAndUpdate(
    { ...selector, published: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).lean();

  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true, data: { viewCount: doc.viewCount } });
});

/**
 * GET /api/products/categories/list/all
 * Example category list for filters
 */
/*
[PRO] Purpose: Lightweight category counts for building filter UIs.
Context: Only counts published items.
Edge cases: Null/empty categories are included as-is (as before).
Notes: Alphabetical sort for a stable UX.
*/
router.get("/categories/list/all", async (_req, res) => {
  const cats = await Product.aggregate([
    { $match: { published: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $project: { _id: 0, category: "$_id", count: 1 } },
    { $sort: { category: 1 } },
  ]);
  res.json({ ok: true, data: cats });
});

export default router;
