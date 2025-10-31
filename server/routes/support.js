// server/routes/support.public.js
// Summary: Public support intake (optionally attaches userId) + “mine” list for signed-in users.

import express from "express";
import mongoose from "mongoose";
import SupportTicket from "../models/SupportTicket.js";
import { maybeAuth } from "../middleware/auth.js";
import { sendSupportThanks } from "../utils/mailer.js";

const router = express.Router();

/*
[PRO] Purpose: Accept support messages from guests or users.
Context: If logged in, persist userId for future correspondence.
Edge cases: Basic email format check; empty subject; optional message.
Notes: Sends an acknowledgement email (best-effort).
*/
router.post("/", maybeAuth, async (req, res) => {
  try {
    const { email = "", subject = "", message = "" } = req.body || {};
    const em = String(email).trim().toLowerCase();
    const sub = String(subject).trim();
    const msg = String(message).trim();

    if (!/^\S+@\S+\.\S+$/.test(em)) return res.status(400).json({ message: "Valid email required" });
    if (!sub) return res.status(400).json({ message: "Subject required" });

    const t = await SupportTicket.create({
      email: em,
      subject: sub,
      message: msg,
      userId: req.userId ? new mongoose.Types.ObjectId(req.userId) : undefined,
      status: "open",
      replies: msg ? [{ from: "user", userId: req.userId || undefined, message: msg }] : [],
      lastReplyAt: msg ? new Date() : null,
    });

    // auto-ack (best-effort)
    await sendSupportThanks(em, sub);

    res.status(201).json({ ok: true, data: { id: t._id } });
  } catch (e) {
    console.error("POST /api/support error:", e);
    res.status(500).json({ message: "Failed to submit support message" });
  }
});

/*
[PRO] Purpose: Quick list of current user’s support tickets.
Context: Helps create a simple “My tickets” view.
Edge cases: Guest users → [], not an error.
Notes: Minimal projection for a concise UI card.
*/
router.get("/mine", maybeAuth, async (req, res) => {
  if (!req.userId) return res.json({ ok: true, data: [] });
  const rows = await SupportTicket.find({ userId: req.userId })
    .sort({ updatedAt: -1 })
    .select("subject status updatedAt createdAt")
    .lean();
  res.json({ ok: true, data: rows });
});

export default router;
