// server/routes/track.js
// Summary: View tracking endpoint to power “Recently Viewed” and analytics.

import express from "express";
import mongoose from "mongoose";
import { maybeAuth } from "../middleware/auth.js";
import ViewLog from "../models/ViewLog.js";

const router = express.Router();

/*
[PRO] Purpose: Track product views for signed-in users.
Context: Upserts by (userId + productId) OR (userId + slug).
Edge cases: No user → 204; no productId/slug → 400.
Notes: Only stores display-safe data for history UI.
*/
router.post("/view", maybeAuth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(204).end();

    const { productId, slug, title, image, price, currency } = req.body || {};
    if (!productId && !slug) {
      return res.status(400).json({ message: "productId or slug required" });
    }

    const match = { userId: new mongoose.Types.ObjectId(userId) };
    if (productId && mongoose.isValidObjectId(productId)) {
      match.productId = new mongoose.Types.ObjectId(productId);
    } else if (slug) {
      match.slug = String(slug).toLowerCase();
    }

    const update = {
      $setOnInsert: {
        userId: new mongoose.Types.ObjectId(userId),
        ...(match.productId ? { productId: match.productId } : {}),
        createdAt: new Date(),
      },
      $set: {
        ...(slug ? { slug: String(slug).toLowerCase() } : {}),
        ...(title ? { title } : {}),
        ...(image ? { image } : {}),
        ...(price != null ? { price: Number(price) } : {}),
        ...(currency ? { currency: String(currency) } : {}),
      },
      $currentDate: { updatedAt: true },
    };

    await ViewLog.findOneAndUpdate(match, update, { upsert: true, new: true });
    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /track/view error:", e);
    return res.status(500).json({ message: "Failed to log view" });
  }
});

export default router;
