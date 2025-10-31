// server/routes/faqs.public.js
// Summary: Public FAQs list (published only), sorted for stable UI.

import express from "express";
import Faq from "../models/Faq.js";

const router = express.Router();

/*
[PRO] Purpose: Public-facing FAQs feed.
Context: Only published entries; stable sort by order then recency.
Edge cases: No rows → empty array; DB error → 500 with user-safe message.
Notes: lean() for throughput.
*/
/** GET /api/faqs  -> public list of published FAQs (sorted by order then recent) */
router.get("/", async (_req, res) => {
  try {
    const rows = await Faq.find({ published: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("GET /faqs error:", e);
    res.status(500).json({ message: "Failed to load FAQs" });
  }
});

export default router;
