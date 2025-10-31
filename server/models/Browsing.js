// server/models/Browsing.js

/*
[PRO] Purpose: Legacy lightweight record of what a user viewed (superseded by ViewLog in new routes).
Context: Some older parts of the app still read Browsing; keep schema minimal for compatibility.
Edge cases: Not all views have productId (slug fallback); ensure queries tolerate nulls.
Notes: Prefer using ViewLog going forward; keep this model read-only if possible.
*/
import mongoose from "mongoose";

const BrowsingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    slug: String,
    title: String,
  },
  { timestamps: true }
);

export default mongoose.model("Browsing", BrowsingSchema);
