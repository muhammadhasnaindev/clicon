// server/routes/reviews.js
// Summary: Public read + authed create for product reviews; recompute product rating.
import express from "express";
import mongoose from "mongoose";
import { requireAuth /*, maybeAuth*/ } from "../middleware/auth.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js";

const router = express.Router();

/*
[PRO] Purpose: Normalize rating input into 1..5.
Context: Prevents out-of-range values from skewing averages.
Edge cases: Non-number defaults to 5; min/max clamps.
Notes: Keep behavior predictable for UI.
*/
const clampRating = (n) => Math.max(1, Math.min(5, Number(n || 5)));

/** GET /api/products/:idOrSlug/reviews (public) */
/*
[PRO] Purpose: List reviews for a product with lightweight user display.
Context: Public route; joins minimal author info.
Edge cases: Unknown product → 404; returns [] otherwise.
Notes: Sorted newest first.
*/
router.get("/products/:idOrSlug/reviews", async (req, res) => {
  const { idOrSlug } = req.params;
  const selector = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const prod = await Product.findOne(selector).lean();
  if (!prod) return res.status(404).json({ message: "Product not found" });

  const rows = await Review.aggregate([
    { $match: { productId: prod._id } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "u",
      },
    },
    { $addFields: { u: { $arrayElemAt: ["$u", 0] } } },
    {
      $project: {
        rating: 1,
        comment: 1,
        createdAt: 1,
        userName: { $ifNull: ["$u.displayName", { $ifNull: ["$u.fullName", "$u.email"] }] },
      },
    },
  ]);

  res.json({ ok: true, data: rows });
});

/** POST /api/products/:idOrSlug/reviews (auth) */
/*
[PRO] Purpose: Create or add a review for a product by the signed-in user.
Context: Original behavior kept (no duplicate prevention here).
Edge cases: Unknown product; rating clamp; empty comment allowed.
Notes: Recomputes cached rating & count after insert.
*/
router.post("/products/:idOrSlug/reviews", requireAuth, async (req, res) => {
  const { idOrSlug } = req.params;
  const { rating = 5, comment = "" } = req.body || {};
  const selector = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const prod = await Product.findOne(selector);
  if (!prod) return res.status(404).json({ message: "Product not found" });

  await Review.create({
    userId: req.user._id,
    productId: prod._id,
    rating: clampRating(rating),
    comment: String(comment || ""),
  });

  // recompute product rating + count
  const agg = await Review.aggregate([
    { $match: { productId: prod._id } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const a = agg[0] || { avg: 0, count: 0 };
  prod.rating = Number((a.avg || 0).toFixed(2));
  prod.numReviews = a.count || 0;
  await prod.save();

  res.json({ ok: true });
});

export default router;
