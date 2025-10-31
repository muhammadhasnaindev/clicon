// server/routes/admin/support.js
// Support tickets: list/detail, reply, status updates, delete.
// Summary: Auth+hydrate+verified; guards for ids, pagination; lean reads.

import express from "express";
import mongoose from "mongoose";
import SupportTicket from "../../models/SupportTicket.js";
import { requireAuth, hydrateUser, requireVerified } from "../../middleware/auth.js";
import { hasAnyPermission } from "../../utils/permissionMatch.js";
import { sendSupportReply } from "../../utils/mailer.js";

const router = express.Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const isValidId = (v) => mongoose.isValidObjectId(v);
const safeInt = (v, d, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return d;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

// auth + hydrate + verified
router.use(requireAuth, hydrateUser, requireVerified);

function canRead(user) {
  // Why: Admins/managers or users with read/reply on support.
  return (
    user?.role === "admin" ||
    user?.role === "manager" ||
    hasAnyPermission(user, ["support:*", "support:read", "support:reply"])
  );
}
function canReply(user) {
  // Why: Admins/managers or users with reply on support.
  return (
    user?.role === "admin" ||
    user?.role === "manager" ||
    hasAnyPermission(user, ["support:*", "support:reply"])
  );
}

/*
[PRO] Purpose: Ticket list with filtering and pagination.
Context: Filters by status or fuzzy q across email/subject/message.
Notes: Sorted by latest update; lean() for lighter memory.
*/
router.get("/", async (req, res) => {
  if (!canRead(req.user)) return res.status(403).json({ message: "Forbidden" });

  const status = String(req.query?.status || "");
  const q = String(req.query?.q || "").trim();
  const pg = safeInt(req.query?.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const lim = safeInt(req.query?.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

  const where = {};
  if (status && ["open", "answered", "closed"].includes(status)) where.status = status;
  if (q) {
    const rx = new RegExp(q, "i");
    where.$or = [{ email: rx }, { subject: rx }, { message: rx }];
  }

  const [rows, total] = await Promise.all([
    SupportTicket.find(where)
      .sort({ updatedAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim)
      .select("email subject status message createdAt updatedAt lastReplyAt")
      .lean(),
    SupportTicket.countDocuments(where),
  ]);

  res.json({ ok: true, data: rows, meta: { total, page: pg, limit: lim } });
});

/*
[PRO] Purpose: Single ticket detail.
Context: Id guard; lean read.
Notes: 404 for missing.
*/
router.get("/:id", async (req, res) => {
  if (!canRead(req.user)) return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  const t = await SupportTicket.findById(id).lean();
  if (!t) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true, data: t });
});

/*
[PRO] Purpose: Reply to a ticket (optionally close it).
Context: Trims message, appends to replies, updates status + lastReplyAt.
Notes: Sends email to ticket owner; requires reply capability.
*/
router.post("/:id/reply", async (req, res) => {
  if (!canReply(req.user)) return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  const msg = String(req.body?.message || "").trim();
  const close = !!req.body?.close;
  if (!msg) return res.status(400).json({ message: "Message required" });

  const t = await SupportTicket.findById(id);
  if (!t) return res.status(404).json({ message: "Not found" });

  t.replies.push({ from: "admin", userId: req.userId, message: msg });
  t.lastReplyAt = new Date();
  t.status = close ? "closed" : "answered";
  await t.save();

  await sendSupportReply(t.email, t.subject, msg);
  res.json({ ok: true });
});

/*
[PRO] Purpose: Update ticket status only.
Context: Allows open/answered/closed; returns minimal projection.
Notes: Id + status validation; 404 for missing ticket.
*/
router.put("/:id/status", async (req, res) => {
  if (!canReply(req.user)) return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const status = String(req.body?.status || "");
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });
  if (!["open", "answered", "closed"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const t = await SupportTicket.findByIdAndUpdate(
    id,
    { status },
    { new: true, projection: "email subject status updatedAt" }
  );
  if (!t) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true, data: t });
});

/*
[PRO] Purpose: Delete a ticket.
Context: Id guard; idempotent delete semantics for client UX.
Notes: ok=true on success.
*/
router.delete("/:id", async (req, res) => {
  if (!canReply(req.user)) return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  await SupportTicket.findByIdAndDelete(id);
  res.json({ ok: true });
});

export default router;
