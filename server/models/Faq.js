// server/models/Faq.js

/*
[PRO] Purpose: Store FAQ entries with ordering and publish toggle for public /api/faqs.
Context: Replaces hardcoded Q&A with a CMS-like collection editable in admin.
Edge cases: Empty strings rejected by required validators; order defaults to 0 so unsorted items still render.
Notes: Keep answers short-ish (HTML allowed if sanitized at render); sort by { order: 1, createdAt: -1 } in routes.
*/
import mongoose from "mongoose";

const FaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Faq", FaqSchema);
