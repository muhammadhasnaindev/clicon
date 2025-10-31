// backend/models/AuditLog.js

/*
[PRO] Purpose: Append-only audit trail for create/update/delete of admin-managed entities.
Context: Needed for moderation, accountability, and “history” views in admin UI.
Edge cases: `changes` is Mixed; avoid storing huge payloads (strip large binaries in routes).
Notes: Indexes rely on default _id + timestamps; query by (entity, entityId) in routes.
*/
import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: "User" },
    userEmail: String,
    action: { type: String, enum: ["create", "update", "delete"], required: true },
    entity: { type: String, required: true }, // e.g., "post"
    entityId: { type: mongoose.Types.ObjectId, required: true },
    summary: String,
    changes: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", AuditLogSchema);
