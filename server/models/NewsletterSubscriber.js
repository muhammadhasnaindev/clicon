// server/models/NewsletterSubscriber.js

/*
[PRO] Purpose: Track newsletter subscriptions and opt-out state.
Context: Used by /api/newsletter to subscribe/unsubscribe and by posts admin to notify.
Edge cases: Email normalization in pre-save; verifyToken/verifiedAt reserved for double opt-in.
Notes: Unique email index ensures idempotent subscribe; keep messages minimal to avoid spam flags.
*/
import mongoose from "mongoose";

const NewsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    subscribed: { type: Boolean, default: true },
    // optional: for double-opt-in later
    verifyToken: String,
    verifiedAt: Date,
  },
  { timestamps: true }
);

NewsletterSubscriberSchema.pre("save", function () {
  if (this.isModified("email")) this.email = String(this.email).toLowerCase().trim();
});

export default mongoose.model("NewsletterSubscriber", NewsletterSubscriberSchema);
