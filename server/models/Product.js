// server/models/Product.js

/*
[PRO] Purpose: Core product catalog entry with pricing, media, categorization & optional per-product coupons.
Context: Used by both public listing/detail APIs and admin product management UI.
Edge cases:
  - price.current must always be numeric; defaults prevent NaN.
  - coupon may be null; validation handled in coupon validator route.
  - images may be empty; UI should fall back to `image` or placeholder.
Notes:
  Keep slug unique for SEO + routing. Rating/numReviews are recomputed from Review model (not manually edited).
*/
import mongoose from "mongoose";

const PriceSchema = new mongoose.Schema(
  {
    current: { type: Number, default: 0 },
    old: { type: Number, default: null },
    base: { type: Number, default: null },
  },
  { _id: false }
);

/*
[PRO] Purpose: Simple per-product coupon override (for local sales or product-specific offers).
Context: Enables coupon validation in /api/coupons/validate w/out requiring a global coupon table.
Edge cases: `expiresAt` can be null (no expiry). `minSubtotal` defaults to 0 → always eligible.
*/
const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, index: true },
    type: { type: String, enum: ["percent", "fixed"], default: "percent" },
    amount: { type: Number, default: 0 },
    minSubtotal: { type: Number, default: 0 },
    active: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, index: true },
    brand: { type: String },
    category: { type: String, index: true },
    subcategory: { type: String },

    images: [{ type: String }],
    image: { type: String },

    price: { type: PriceSchema, default: () => ({ current: 0 }) },
    published: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },

    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    label: { type: String, default: "" },
    discountText: { type: String, default: "" },
    dealEndsAt: { type: Date, default: null },
    sku: { type: String, default: "" },
    tags: [{ type: String }],

    // per-product coupon (optional)
    coupon: { type: CouponSchema, default: null },

    description: { type: String, default: "" },
    features: [{ type: String }],
    shippingInfo: [{ label: String, note: String, cost: Number }],
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },
    attributes: [
      {
        key: String,
        label: String,
        kind: String,
        values: [mongoose.Schema.Types.Mixed],
        required: Boolean,
        uiOrder: Number,
      },
    ],
    adjustments: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
