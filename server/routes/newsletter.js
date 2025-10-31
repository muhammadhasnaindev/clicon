// server/routes/newsletter.js
// Summary: Newsletter subscribe/unsubscribe + (admin) list subscribers.


import express from "express";
import NewsletterSubscriber from "../models/NewsletterSubscriber.js";
import { sendMail } from "../utils/mailer.js";
import { requireAuth, requireVerified, requireRole } from "../middleware/auth.js";

const router = express.Router();

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
[PRO] Purpose: Add/update a subscriber record and send a welcome message.
Context: Upsert ensures idempotent subscribe calls.
Edge cases: Invalid email; SMTP errors shouldn’t break API.
Notes: Trims and lowercases email.
*/
/* POST /api/newsletter/subscribe { email } */
router.post("/subscribe", async (req, res) => {
  const { email = "" } = req.body || {};
  const em = String(email).toLowerCase().trim();
  if (!EMAIL_RX.test(em)) {
    return res.status(400).json({ message: "Valid email required" });
  }

  const sub = await NewsletterSubscriber.findOneAndUpdate(
    { email: em },
    { $set: { email: em, subscribed: true } },
    { new: true, upsert: true }
  );

  // Best-effort welcome
  try {
    await sendMail(
      em,
      "Thanks for subscribing",
      "You're subscribed to Clicon updates. You'll receive an email when we publish new posts."
    );
  } catch (err) {
    // log only; don't fail subscription flow
    console.error("newsletter welcome send error:", err?.message || err);
  }

  res.json({ ok: true, message: "Subscribed successfully", data: { email: sub.email } });
});

/*
[PRO] Purpose: Mark a subscriber as unsubscribed.
Context: Idempotent; returns existed flag for UI hints.
Edge cases: Unknown email still returns ok:true with existed:false.
Notes: Email normalized same as subscribe.
*/
/* POST /api/newsletter/unsubscribe { email } */
router.post("/unsubscribe", async (req, res) => {
  const { email = "" } = req.body || {};
  const em = String(email).toLowerCase().trim();
  const sub = await NewsletterSubscriber.findOneAndUpdate(
    { email: em },
    { $set: { subscribed: false } },
    { new: true }
  );
  res.json({ ok: true, message: "Unsubscribed", data: { email: em, existed: !!sub } });
});

/*
[PRO] Purpose: Admin visibility into subscriber list.
Context: Restricted to admin/manager via shared middleware.
Edge cases: Empty list; no PII beyond stored fields.
Notes: Sorted by most recent first.
*/
/* (optional) GET /api/newsletter/subscribers  (admin only) */
router.get(
  "/subscribers",
  [requireAuth, requireVerified, requireRole(["admin", "manager"])],
  async (_req, res) => {
    const rows = await NewsletterSubscriber.find({}).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, data: rows });
  }
);

export default router;
