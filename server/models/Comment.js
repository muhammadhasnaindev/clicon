// backend/models/Comment.js

/*
[PRO] Purpose: Store public blog post comments with basic moderation status.
Context: Replaces ad-hoc arrays on Post with a proper, paginable collection.
Edge cases: Anonymous commenters supply name/email; status defaults to “approved” for now.
Notes: If you enable moderation, switch default to "pending" in routes instead of here.
*/
import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional if logged-in
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    comment: { type: String, required: true, trim: true },
    status: { type: String, enum: ["approved", "pending", "spam"], default: "approved", index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", CommentSchema);
