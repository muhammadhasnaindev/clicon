// backend/routes/admin/faqs.js
// FAQs CRUD for admins/managers and users with FAQ permissions.
import express from "express";
import mongoose from "mongoose";
import Faq from "../../models/Faq.js";
import { requireAuth, hydrateUser, requireVerified } from "../../middleware/auth.js";
import { hasAnyPermission } from "../../utils/permissionMatch.js";

const router = express.Router();
router.use(requireAuth, hydrateUser, requireVerified);

/* ---- Small helpers ---- */
const isValidId = (v) => mongoose.isValidObjectId(v);

function canRead(user) {
  // Why: Admins/managers or users with read/write on FAQs.
  return (
    user?.role === "admin" ||
    user?.role === "manager" ||
    hasAnyPermission(user, ["faqs:*", "faqs:read", "faqs:write"])
  );
}
function canWrite(user) {
  // Why: Admins/managers or users with write on FAQs.
  return (
    user?.role === "admin" ||
    user?.role === "manager" ||
    hasAnyPermission(user, ["faqs:*", "faqs:write"])
  );
}

/*
[PRO] Purpose: List FAQs for admin UI, ordered by 'order' then recency.
Context: Read-only view uses lean() to cut memory.
Notes: Returns everything; client can paginate/search if needed.
*/
router.get("/", async (req, res) => {
  if (!canRead(req.user)) return res.status(403).json({ message: "Forbidden" });
  const rows = await Faq.find({}).sort({ order: 1, createdAt: -1 }).lean();
  res.json({ ok: true, data: rows });
});

/*
[PRO] Purpose: Create a new FAQ entry.
Context: Minimal validation; trims fields; coerce order; published flag.
Notes: Returns created doc for immediate UI update.
*/
router.post("/", async (req, res) => {
  if (!canWrite(req.user)) return res.status(403).json({ message: "Forbidden" });

  const question = String(req.body?.question ?? "").trim();
  const answer = String(req.body?.answer ?? "").trim();
  const order = Number(req.body?.order ?? 0) || 0;
  const published = !!req.body?.published;

  if (!question || !answer) {
    return res.status(400).json({ message: "Question and answer are required" });
  }

  const doc = await Faq.create({ question, answer, order, published });
  res.status(201).json({ ok: true, data: doc });
});

/*
[PRO] Purpose: Patch FAQ by id (question/answer/order/published).
Context: Uses small patch map; trims strings; validates id.
Notes: Returns updated doc or 404.
*/
router.put("/:id", async (req, res) => {
  if (!canWrite(req.user)) return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  const patch = {};
  if (req.body.question !== undefined) patch.question = String(req.body.question).trim();
  if (req.body.answer !== undefined) patch.answer = String(req.body.answer).trim();
  if (req.body.order !== undefined) patch.order = Number(req.body.order) || 0;
  if (req.body.published !== undefined) patch.published = !!req.body.published;

  const doc = await Faq.findByIdAndUpdate(id, patch, { new: true });
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true, data: doc });
});

/*
[PRO] Purpose: Delete FAQ by id.
Context: Id guard only; idempotent for non-existent docs.
Notes: Returns ok=true on success.
*/
router.delete("/:id", async (req, res) => {
  if (!canWrite(req.user)) return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  await Faq.findByIdAndDelete(id);
  res.json({ ok: true });
});

export default router;
