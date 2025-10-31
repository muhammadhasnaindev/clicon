// server/models/Coupon.js

/*
[PRO] Purpose: First-class coupon documents usable across products/categories/brands.
Context: Earlier implementation used per-product coupon fields; this model supports global codes.
Edge cases: Time windows (startsAt/endsAt) and scope via appliesTo; validate in route logic.
Notes: Store code in UPPERCASE; consider unique sparse index migrations carefully in prod.
*/
import mongoose from "mongoose";

const AppliesToSchema = new mongoose.Schema(
  {
    categories: [String],
    brands: [String],
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { _id: false }
);

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true }, // store as UPPERCASE
    type: { type: String, enum: ["percent", "amount"], required: true },
    value: { type: Number, required: true }, // percent or amount (base currency)

    minSubtotal: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },

    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    appliesTo: { type: AppliesToSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", CouponSchema);
