// server/routes/account.js
// Account endpoints: profile, addresses, browsing history.
// Summary: Minimal guards, normalized updates, non-sensitive storage.

import express from "express";
import mongoose from "mongoose";
import { requireAuth, hydrateUser } from "../middleware/auth.js";
import User from "../models/User.js";
import ViewLog from "../models/ViewLog.js";
import { saveBase64File } from "../utils/saveBase64.js";

const router = express.Router();

/*
[PRO] Purpose: Update profile + addresses in one call for smooth UX.
Context: Original logic good; added rationale and kept field allow-list.
Edge cases: Avatar can be base64 or URL; empty string clears avatar; email lowercased.
Notes: Only non-sensitive payment display fields are stored; full snapshot returned for UI.
*/
router.put("/me", requireAuth, hydrateUser, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "User not found" });

    const {
      profile = {},
      billing = {},
      shipping = {},
      billingAddress,
      shippingAddress,
      defaultPaymentMethod, // optional passthrough
      defaultCard,          // optional passthrough
    } = req.body || {};

    /*
    [PRO] Purpose: Controlled profile field updates with light normalization.
    Context: Prevents accidental extra fields; keeps predictable user doc shape.
    Edge cases: Missing name -> derive from fullName; email normalized to lowercase.
    Notes: Avatar supports data URL save or direct URL; empty string clears.
    */
    if (profile && typeof profile === "object") {
      const keys = [
        "displayName",
        "username",
        "fullName",
        "email",
        "secondaryEmail",
        "phone",
        "country",
        "state",
        "zip",
      ];
      for (const k of keys) {
        if (profile[k] !== undefined) req.user[k] = profile[k];
      }
      if (profile.fullName && !req.user.name) req.user.name = profile.fullName;
      if (profile.email) req.user.email = String(profile.email).toLowerCase();

      /*
      [PRO] Purpose: Avatar set/clear with safe base64 persist.
      Context: Accepts data URL or plain URL; clearing supported via empty string.
      Edge cases: Invalid base64 -> ignored; keeps previous avatar.
      Notes: saveBase64File returns a web path under /uploads.
      */
      if (profile.avatarUrl !== undefined) {
        const a = String(profile.avatarUrl || "").trim();
        if (a.startsWith("data:")) {
          const rel = saveBase64File(a, "avatars");
          if (rel) req.user.avatarUrl = rel;
        } else if (a) {
          // accept absolute URL or /uploads/... relative path
          req.user.avatarUrl = a;
        } else {
          // empty string clears avatar
          req.user.avatarUrl = "";
        }
      }
    }

    /*
    [PRO] Purpose: Normalize address objects (billing/shipping) to same shape.
    Context: UI can send either old "address" or new "line1"; both accepted.
    Edge cases: Fill missing email/phone from user profile to reduce friction.
    Notes: Keeps server-side validation simple; UI handles formatting.
    */
    const pick = (obj = {}) => ({
      firstName: obj.firstName || "",
      lastName: obj.lastName || "",
      company: obj.company || "",
      line1: obj.line1 || obj.address || "",
      country: obj.country || "",
      state: obj.state || "",
      city: obj.city || "",
      zip: obj.zip || "",
      email: obj.email || req.user.email || "",
      phone: obj.phone || req.user.phone || "",
    });

    if (billing || billingAddress)
      req.user.billingAddress = pick(billingAddress || billing || {});

    if (shipping || shippingAddress)
      req.user.shippingAddress = pick(shippingAddress || shipping || {});

    /*
    [PRO] Purpose: Store only non-sensitive payment display hints.
    Context: Avoids PCI risk; keeps enough data to show the chosen method.
    Edge cases: last4 coerced safely; missing card -> null.
    Notes: Do not store tokens or raw PAN here.
    */
    if (defaultPaymentMethod) req.user.defaultPaymentMethod = defaultPaymentMethod;
    if (defaultCard && typeof defaultCard === "object") {
      req.user.defaultCard = {
        name: defaultCard.name || "",
        last4: String(defaultCard.last4 || "").slice(-4),
        exp: defaultCard.exp || "",
      };
    }

    await req.user.save();

    /*
    [PRO] Purpose: Return fresh snapshot after mutation for instant UI sync.
    Context: Client expects normalized user document right away.
    Edge cases: None—read-only lean for perf.
    Notes: Only fields relevant to account UI included.
    */
    const u = await User.findById(req.user._id).lean();
    return res.json({
      ok: true,
      user: {
        _id: u._id,
        name: u.name,
        displayName: u.displayName,
        username: u.username,
        email: u.email,
        secondaryEmail: u.secondaryEmail,
        phone: u.phone,
        role: u.role,
        permissions: u.permissions || [],
        emailVerified: !!u.emailVerified,
        avatarUrl: u.avatarUrl || "",
        billingAddress: u.billingAddress || {},
        shippingAddress: u.shippingAddress || {},
        defaultPaymentMethod: u.defaultPaymentMethod || "",
        defaultCard: u.defaultCard || null,
        updatedAt: u.updatedAt,
      },
    });
  } catch (e) {
    /*
    [PRO] Purpose: Developer-facing log + user-safe message.
    Context: Prevents leaking internals in responses.
    Edge cases: Any thrown error falls back to status 500.
    Notes: Keep log string stable for grepping.
    */
    console.error("PUT /account/me error:", e);
    return res.status(500).json({ message: "Failed to save profile" });
  }
});

/*
[PRO] Purpose: Return stored addresses without full user payload.
Context: Lightweight call used by checkout/address book screens.
Edge cases: Unauthed returns 401; empty objects are fine.
Notes: No writes; read from hydrated user.
*/
router.get("/addresses", requireAuth, hydrateUser, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "User not found" });

  res.json({
    data: {
      billing: req.user.billingAddress || {},
      shipping: req.user.shippingAddress || {},
    },
  });
});

/*
[PRO] Purpose: Update a single address type (billing|shipping).
Context: Keeps same normalization as /me to ensure shape parity.
Edge cases: Invalid type → 400; missing fields auto-default.
Notes: No schema changes; minimal write and ok=true response.
*/
router.put("/addresses/:type", requireAuth, hydrateUser, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "User not found" });

  const { type } = req.params;
  const key = ({ billing: "billingAddress", shipping: "shippingAddress" })[type];
  if (!key) return res.status(400).json({ message: "Invalid address type" });

  const b = req.body || {};
  req.user[key] = {
    firstName: b.firstName || "",
    lastName: b.lastName || "",
    company: b.company || "",
    line1: b.line1 || b.address || "",
    country: b.country || "",
    state: b.state || "",
    city: b.city || "",
    zip: b.zip || "",
    email: b.email || req.user.email || "",
    phone: b.phone || req.user.phone || "",
  };
  await req.user.save();
  res.json({ ok: true });
});

/*
[PRO] Purpose: Return user browsing history enriched with product info.
Context: Admin-free, user-authenticated view for “recently viewed”.
Edge cases: Product may be resolved by productId or legacy slug.
Notes: Pagination clamped; uses aggregation with lookup + projection only.
*/
router.get("/browsing-history", requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(60, Math.max(1, Number(req.query.limit || 12)));
    const skip = (page - 1) * limit;

    const match = { userId: new mongoose.Types.ObjectId(req.userId) };

    const rows = await ViewLog.aggregate([
      { $match: match },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          let: { pid: "$productId", pslug: "$slug" },
          pipeline: [
            { $match: { $expr: { $or: [{ $eq: ["$_id", "$$pid"] }, { $eq: ["$slug", "$$pslug"] }] } } },
            {
              $project: {
                _id: 1,
                title: 1,
                slug: 1,
                category: 1,
                image: { $arrayElemAt: ["$images", 0] },
                price: "$price.current",
                rating: 1,
                reviews: "$numReviews",
              },
            },
          ],
          as: "prod",
        },
      },
      { $addFields: { prod: { $arrayElemAt: ["$prod", 0] } } },
      {
        $project: {
          _id: 1,
          viewedAt: "$updatedAt",
          title: { $ifNull: ["$prod.title", "$title"] },
          slug: { $ifNull: ["$prod.slug", "$slug"] },
          productId: { $ifNull: ["$prod._id", "$productId"] },
          image: "$prod.image",
          price: "$prod.price",
          rating: "$prod.rating",
          reviews: "$prod.reviews",
          currency: { $literal: "USD" },
        },
      },
    ]);

    const total = await ViewLog.countDocuments(match);
    res.json({ ok: true, data: rows, meta: { total, page, limit } });
  } catch (err) {
    /*
    [PRO] Purpose: Developer log + safe error for the client.
    Context: Aggregation can fail if userId malformed (shouldn’t with requireAuth).
    Edge cases: Any unknown error → 500 with generic message.
    Notes: Keep the log searchable.
    */
    console.error("GET /account/browsing-history error:", err);
    res.status(500).json({ message: "Failed to load browsing history" });
  }
});

export default router;
