// server/routes/payments.js
// Summary: CRUD for a user's saved payment methods (display-only metadata).

/*
[PRO] Purpose: Express router for a user's payment methods.
Context: Frontend expects `id` field; actual storage uses Mongo `_id`.
Edge cases: Missing userId in req; invalid month/year; noisy inputs.
Notes: Methods hold display-only metadata; no PAN/secret info stored.
*/

import express from "express";
import PaymentMethod from "../models/PaymentMethod.js";
import { requireAuth, hydrateUser } from "../middleware/auth.js";

const router = express.Router();

/** Normalize minimal, user-safe fields */
function normCreatePayload(body = {}) {
  const now = new Date();
  const THIS_YEAR = now.getUTCFullYear();
  const MIN_YEAR = THIS_YEAR - 1; // allow previous year for just-expired cards in UI
  const MAX_YEAR = THIS_YEAR + 15;

  const brand = String(body.brand ?? "visa").toLowerCase().trim() || "visa";
  const name = String(body.name ?? "").trim();
  const last4 = String(body.last4 ?? "0000").replace(/\D+/g, "").slice(-4) || "0000";

  let expMonth = Number(body.expMonth ?? 1);
  if (!Number.isFinite(expMonth) || expMonth < 1 || expMonth > 12) expMonth = 1;

  let expYear = Number(body.expYear ?? THIS_YEAR + 5);
  if (!Number.isFinite(expYear) || expYear < MIN_YEAR) expYear = THIS_YEAR;
  if (expYear > MAX_YEAR) expYear = MAX_YEAR;

  return { brand, name, last4, expMonth, expYear };
}

/*
[PRO] Purpose: List methods for current user; alias `_id` → `id`.
Context: Some UIs are typed to `id`; we preserve both.
Edge cases: No methods; unknown userId; lean to reduce payload size.
Notes: Sorted by newest first for better UX.
*/
router.get("/methods", requireAuth, hydrateUser, async (req, res) => {
  try {
    const userId = req.user?._id ?? req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const rows = await PaymentMethod.find({ userId }).sort({ createdAt: -1 }).lean();
    const data = rows.map((r) => ({ ...r, id: r._id })); // alias
    return res.json({ data });
  } catch (err) {
    console.error("GET /payments/methods error:", err);
    return res.status(500).json({ message: "Failed to load payment methods" });
  }
});

/*
[PRO] Purpose: Create a new display-only payment method entry.
Context: Only minimal non-sensitive fields are stored.
Edge cases: Missing userId; odd inputs for month/year/last4 are normalized.
Notes: Returns created row with `id` alias.
*/
router.post("/methods", requireAuth, hydrateUser, async (req, res) => {
  try {
    const userId = req.user?._id ?? req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { brand, last4, name, expMonth, expYear } = normCreatePayload(req.body);
    const row = await PaymentMethod.create({
      userId,
      brand,
      last4,
      name,
      expMonth,
      expYear,
    });

    const data = { ...(row.toObject ? row.toObject() : row), id: row._id };
    return res.status(201).json(data);
  } catch (err) {
    console.error("POST /payments/methods error:", err);
    return res.status(500).json({ message: "Failed to save payment method" });
  }
});

/*
[PRO] Purpose: Edit non-sensitive fields (label/expiry).
Context: UI chip edit path; ownership is enforced in query.
Edge cases: No match → 404; partial updates only.
Notes: Returns lean doc with `id` alias.
*/
router.put("/methods/:id", requireAuth, hydrateUser, async (req, res) => {
  try {
    const userId = req.user?._id ?? req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const updates = {};
    const { name, expMonth, expYear } = normCreatePayload(req.body);

    if (req.body.name !== undefined) updates.name = name;
    if (req.body.expMonth !== undefined) updates.expMonth = expMonth;
    if (req.body.expYear !== undefined) updates.expYear = expYear;

    const row = await PaymentMethod.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!row) return res.status(404).json({ message: "Not found" });
    return res.json({ ...row, id: row._id });
  } catch (err) {
    console.error("PUT /payments/methods/:id error:", err);
    return res.status(500).json({ message: "Failed to update payment method" });
  }
});

/*
[PRO] Purpose: Delete a payment method owned by the user.
Context: Idempotent: deleting a non-existent id returns deleted=0.
Edge cases: Missing userId; invalid id; multi-tenant safety via userId.
Notes: Responds with count for easy UI reconciliation.
*/
router.delete("/methods/:id", requireAuth, hydrateUser, async (req, res) => {
  try {
    const userId = req.user?._id ?? req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const result = await PaymentMethod.deleteOne({ _id: id, userId });
    return res.json({ ok: true, deleted: result?.deletedCount || 0 });
  } catch (err) {
    console.error("DELETE /payments/methods/:id error:", err);
    return res.status(500).json({ message: "Failed to delete payment method" });
  }
});

export default router;
