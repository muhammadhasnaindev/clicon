// server/models/Order.js

/*
[PRO] Purpose: Canonical order record for checkout, tracking, and admin operations.
Context: Aligns with routes that read/write status, stage, and totals (USD base).
Edge cases: Guest orders may lack userId; ensure timelines append not overwrite; numbers default to 0.
Notes: Aggregations read totals.totalBase; indexes speed up by user and by customer email lookups.
*/
import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    line1: String,
    line2: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  { _id: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    slug: String,
    category: String,

    title: { type: String, required: true },
    image: String,

    qty: { type: Number, default: 1 },
    unitPriceBase: { type: Number, default: 0 }, // unit price at purchase time (USD base)
    subtotalBase: { type: Number, default: 0 }, // qty * unitPriceBase
  },
  { _id: false }
);

const PaymentSchema = new mongoose.Schema(
  {
    method: { type: String, default: "demo" }, // demo|card|cod|paypal|...
    status: { type: String, default: "paid" }, // paid|pending|failed|refunded
    brand: String, // visa/mastercard/...
    last4: String,
    txnId: String, // DEMO-xxxxx
  },
  { _id: false }
);

const TimelineSchema = new mongoose.Schema(
  {
    code: String, // created|paid|processing|shipped|delivered|cancelled
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TotalsSchema = new mongoose.Schema(
  {
    subtotalBase: { type: Number, default: 0 },
    discountBase: { type: Number, default: 0 },
    shippingBase: { type: Number, default: 0 },
    taxBase: { type: Number, default: 0 },
    totalBase: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    items: { type: [OrderItemSchema], default: [] },

    customer: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      company: String,
    },

    billingAddress: AddressSchema,
    shippingAddress: AddressSchema,
    shippingSameAsBilling: { type: Boolean, default: true },

    payment: PaymentSchema,

    totals: TotalsSchema,

    // coarse status + fulfillment stage (compatible with your admin routes)
    status: { type: String, default: "in progress" }, // pending|in progress|completed|cancelled
    stage: { type: String, default: "created" }, // created|packing|shipped|delivered

    statusTimeline: { type: [TimelineSchema], default: [] },

    notes: String,
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ "customer.email": 1, createdAt: -1 });

export default mongoose.model("Order", OrderSchema);
