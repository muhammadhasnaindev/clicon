// server/models/PaymentMethod.js

/*
[PRO] Purpose: Store user-saved payment method display metadata (no sensitive PAN data).
Context: UI chips/cards need brand/last4/name/expiry; actual payments handled by gateways.
Edge cases: Keep last4 sliced on insert; editing limited to non-sensitive fields.
Notes: Index by userId for fast list; never store full card numbers or CVC.
*/
import mongoose from "mongoose";

const PaymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    brand: String,      // e.g., "visa"
    last4: String,      // last four digits
    name: String,       // cardholder
    expMonth: Number,
    expYear: Number,
  },
  { timestamps: true }
);

export default mongoose.model("PaymentMethod", PaymentMethodSchema);
