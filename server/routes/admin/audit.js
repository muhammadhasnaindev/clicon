// backend/routes/admin/audit.js
// Audit logs for entities (currently: post). Verified users only.

import express from "express";
import mongoose from "mongoose";
import AuditLog from "../../models/AuditLog.js";
import Post from "../../models/Post.js";
import { requireAuth, hydrateUser, requireVerified } from "../../middleware/auth.js";
import { hasAnyPermission } from "../../utils/permissionMatch.js";

const router = express.Router();

// Auth order matters: token → user doc → verified.
router.use(requireAuth, hydrateUser, requireVerified);

/* ---- Small helpers / constants ---- */
const ALLOWED_ENTITY = new Set(["post"]);
const isValidId = (v) => mongoose.isValidObjectId(v);

const isAdminOrManager = (u) => u?.role === "admin" || u?.role === "manager";
function canReadAnyAudit(user) {
  // Why: Admins/managers and users with broad post read can see any audit.
  return isAdminOrManager(user) || hasAnyPermission(user, ["posts:*", "posts:read"]);
}
function canReadOwn(user) {
  // Why: Authors with own read/write can see audits for their own posts.
  return isAdminOrManager(user) || hasAnyPermission(user, ["posts:read:own", "posts:write:own"]);
}

/*
[PRO] Purpose: Fetch audit logs for a given entity instance.
Context: Only "post" supported today; others return 400.
Edge cases: Nonexistent post when requesting "own" → 404.
Notes: Returns newest first; user-safe errors only.
*/
router.get("/", async (req, res) => {
  const { entity = "post", entityId } = req.query || {};
  if (!isValidId(entityId)) return res.status(400).json({ message: "Invalid entityId" });
  if (!ALLOWED_ENTITY.has(String(entity))) {
    return res.status(400).json({ message: "Unsupported entity" });
  }

  // Broad readers: return logs directly
  if (canReadAnyAudit(req.user)) {
    const logs = await AuditLog.find({ entity, entityId }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: logs });
  }

  // Own readers: verify ownership first
  if (canReadOwn(req.user)) {
    const post = await Post.findById(entityId).lean();
    if (!post) return res.status(404).json({ message: "Not found" });
    if (String(post.authorId) !== String(req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const logs = await AuditLog.find({ entity, entityId }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: logs });
  }

  return res.status(403).json({ message: "Forbidden" });
});

export default router;
