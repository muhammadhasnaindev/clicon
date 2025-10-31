// server/models/Post.js

/*
[PRO] Purpose: Blog post content store with media gallery, cover, taxonomy, and author.
Context: Admin routes create/update, public routes read only published posts.
Edge cases: tags/category may be empty; coverUrl optional; media list persists absolute/relative URLs.
Notes: Audit logs track changes elsewhere; ensure content sanitized on render if using HTML.
*/
import mongoose from "mongoose";

const MediaSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, default: "" },
    published: { type: Boolean, default: true },
    media: { type: [MediaSchema], default: [] },

    // NEW:
    coverUrl: { type: String, default: "" },
    category: { type: String, default: "" },
    tags: { type: [String], default: [] },

    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Post", PostSchema);
