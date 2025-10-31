// server/models/EmailCode.js

/*
[PRO] Purpose: Short-lived email codes for verification and password reset flows.
Context: Moved away from storing codes on the User doc to avoid race conditions/overwrites.
Edge cases: TTL index auto-deletes at expiresAt; ensure server clocks are sane.
Notes: Composite index (email, purpose) speeds lookups; avoid storing PII beyond email.
*/
import mongoose from "mongoose";

const emailCodeSchema = new mongoose.Schema(
  {
    email: { type: String, index: true },
    code: String, // 6-digit
    purpose: { type: String, enum: ["verify", "reset"] },
    expiresAt: Date, // absolute expiry
  },
  { timestamps: true }
);

// TTL cleanup (expiresAt controls deletion time)
emailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailCodeSchema.index({ email: 1, purpose: 1 });

export default mongoose.model("EmailCode", emailCodeSchema);
