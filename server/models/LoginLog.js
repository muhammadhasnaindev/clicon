// server/models/LoginLog.js

/*
[PRO] Purpose: Keep a lightweight audit of user sign-ins (device/browser/OS/geo).
Context: Populated on /auth/signin to help security reviews and user account activity pages.
Edge cases: Headers may lack geo info (leave blank); do not block login if insert fails.
Notes: TTL not used (retain history); index on (userId, createdAt) for fast recent queries.
*/
import mongoose from "mongoose";

const LoginLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    ip: { type: String, default: "" },
    ua: { type: String, default: "" },

    // quick parse (no external lib): device/browser/OS (best-effort)
    device: {
      type: String, // "mobile" | "tablet" | "desktop" | "other"
      default: "other",
      index: true,
    },
    browser: { type: String, default: "" },
    os: { type: String, default: "" },

    // best-effort geo from headers (CDN/proxy), may be empty if not available
    location: {
      country: { type: String, default: "" },
      region:  { type: String, default: "" },
      city:    { type: String, default: "" },
      lat:     { type: Number, default: null },
      lon:     { type: Number, default: null },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LoginLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("LoginLog", LoginLogSchema);
