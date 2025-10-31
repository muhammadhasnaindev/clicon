// server/models/Review.js

/*
[PRO] Purpose: Store product rating + comments, optionally tied to an order.
Context: Used for order-scoped reviews + public product review display.
Edge cases: (user, order, product) must be unique to avoid duplicate spam.
Notes: Product rating is recomputed in routes — not directly here.
*/
import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    orderId:  { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    productId:{ type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true },
    rating:   { type: Number, min: 1, max: 5, required: true },
    comment:  { type: String, default: "" },
  },
  { timestamps: true }
);

// ensure only one review per user per order per product
ReviewSchema.index({ userId: 1, orderId: 1, productId: 1 }, { unique: true });

export default mongoose.model("Review", ReviewSchema);
