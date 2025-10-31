// server/models/ViewLog.js

/*
[PRO] Purpose: Track user browsing history (recent items etc).
Context: Updated via /api/track/view to show “Recently Viewed” UI.
Edge cases: Either productId or slug – allow both patterns for robustness.
Notes: Unique index ensures only the latest timestamp is updated.
*/
import mongoose from "mongoose";

const ViewLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true },
    slug: { type: String, index: true },
    title: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, default: null },
    currency: { type: String, default: "" },
  },
  { timestamps: true }
);

ViewLogSchema.index({ userId: 1, productId: 1 }, { unique: true, sparse: true });
ViewLogSchema.index({ userId: 1, slug: 1 }, { unique: true, sparse: true });

export default mongoose.model("ViewLog", ViewLogSchema);
