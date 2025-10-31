// server/models/SupportTicket.js

/*
[PRO] Purpose: Tickets submitted from contact/support form, optionally by logged-in users.
Context: Admin panel replies add to `replies` array; user sees full thread.
Edge cases: Anonymous users -> no userId; status transitions controlled in admin routes.
Notes: lastReplyAt updated on reply for sorting tickets by recent activity.
*/
import mongoose from "mongoose";

const ReplySchema = new mongoose.Schema(
  {
    from: { type: String, enum: ["user", "admin"], required: true },
    userId: { type: mongoose.Types.ObjectId, ref: "User" },
    message: { type: String, required: true },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const SupportTicketSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    subject: { type: String, required: true, index: true },
    message: { type: String, default: "" },

    userId: { type: mongoose.Types.ObjectId, ref: "User" },

    status: { type: String, enum: ["open", "answered", "closed"], default: "open", index: true },
    replies: { type: [ReplySchema], default: [] },
    lastReplyAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", SupportTicketSchema);
