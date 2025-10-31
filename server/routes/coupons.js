// server/routes/coupons.js
// Summary: Validate coupon codes against eligible products and cart lines.

import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// Small enums for reasons (kept string values stable for UI)
const REASONS = {
  EMPTY: "EMPTY",
  NOT_FOUND: "NOT_FOUND",
  NO_ELIGIBLE_LINES: "NO_ELIGIBLE_LINES",
  MIN_NOT_MET: "MIN_NOT_MET",
};

/*
[PRO] Purpose: Validate a coupon code across cart lines limited to products that define that code.
Context: Original logic kept; tightened number coercion and early exits.
Edge cases: Empty/expired/inactive coupons; mixed carts where only subset is eligible.
Notes: Returns { ok:false, reason } with 200 to keep UX simple; discount floors at 0.
*/
/**
 * POST /api/coupons/validate
 * body: { code, lines: [{ productId, qty, priceBase }] }
 * Returns: { ok, discountBase, coupon?, reason? }
 */
router.post("/validate", async (req, res) => {
  const { code, lines = [] } = req.body || {};
  const c = String(code || "").trim().toUpperCase();
  if (!c) return res.json({ ok: false, reason: REASONS.EMPTY, discountBase: 0 });

  const now = new Date();
  const prods = await Product.find({
    published: true,
    "coupon.code": c,
    "coupon.active": true,
    $or: [{ "coupon.expiresAt": null }, { "coupon.expiresAt": { $gt: now } }],
  }).select({ _id: 1, coupon: 1 });

  if (!prods.length) return res.json({ ok: false, reason: REASONS.NOT_FOUND, discountBase: 0 });

  const eligibleIds = new Set(prods.map((p) => String(p._id)));
  const eligibleSubtotal = (Array.isArray(lines) ? lines : []).reduce((sum, ln) => {
    const pid = String(ln?.productId || "");
    const price = Number(ln?.priceBase ?? 0);
    const qty = Math.max(1, Number(ln?.qty ?? 1));
    if (!Number.isFinite(price) || !Number.isFinite(qty)) return sum;
    return eligibleIds.has(pid) ? sum + price * qty : sum;
  }, 0);

  if (eligibleSubtotal <= 0) {
    return res.json({ ok: false, reason: REASONS.NO_ELIGIBLE_LINES, discountBase: 0 });
  }

  // Use the first (all with this code should share coupon config)
  const { type = "percent", amount = 0, minSubtotal = 0 } = prods[0].coupon || {};
  const min = Number(minSubtotal || 0);
  if (eligibleSubtotal < min) {
    return res.json({ ok: false, reason: REASONS.MIN_NOT_MET, discountBase: 0 });
  }

  const amt = Number(amount || 0);
  let discount = 0;
  if (type === "fixed") discount = Math.min(Math.max(0, amt), eligibleSubtotal);
  else discount = Math.floor((eligibleSubtotal * Math.max(0, amt)) / 100);

  return res.json({
    ok: true,
    discountBase: Math.max(0, discount),
    coupon: { code: c, type, amount: amt, scope: "per-product", eligibleSubtotal },
  });
});

export default router;
