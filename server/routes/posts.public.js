// backend/routes/posts.public.js
// Summary: Public blog listing, single post fetch, and public comments.


/*
[PRO] Purpose: Read-only public routes for posts and comments.
Context: Serves published content only; comments are auto-approved here.
Edge cases: Invalid ids; empty pages; search with basic regex.
Notes: If moderation is needed, switch comment `status` to "pending".
*/

import express from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";

const router = express.Router();

/*
[PRO] Purpose: Paginated published posts with optional fulltext-ish search.
Context: Simple regex search on title/content; newest first.
Edge cases: Clamp page/limit; empty results ok.
Notes: Returns meta with total & totalPages for UI.
*/
router.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 8)));
  const skip = (page - 1) * limit;

  const q = { published: true };
  const search = String(req.query.q || "").trim();
  if (search) {
    q.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    Post.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Post.countDocuments(q),
  ]);

  res.json({
    ok: true,
    data,
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

/*
[PRO] Purpose: Fetch a single published post by id.
Context: Public visibility only; no drafts exposed.
Edge cases: Invalid id → 400; not found → 404.
Notes: Lean read for speed.
*/
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid id" });

  const doc = await Post.findOne({ _id: id, published: true }).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });

  res.json({ ok: true, data: doc });
});

/* ===================== COMMENTS: PUBLIC ===================== */

/*
[PRO] Purpose: List approved comments for a post (paginated).
Context: Only `approved` comments are returned.
Edge cases: Invalid id; empty sets.
Notes: Meta mirrors post list for consistency.
*/
router.get("/:id/comments", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid id" });

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const q = { postId: id, status: "approved" };
  const [data, total] = await Promise.all([
    Comment.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Comment.countDocuments(q),
  ]);

  res.json({
    ok: true,
    data,
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

/*
[PRO] Purpose: Public comment creation (auto-approve by default).
Context: Requires the post to exist and be published.
Edge cases: Missing fields → 400; invalid id → 400; not found → 404.
Notes: Flip `status` to "pending" if moderation is later required.
*/
router.post("/:id/comments", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid id" });

  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();
  const comment = String(req.body?.comment || "").trim();
  if (!name || !email || !comment)
    return res.status(400).json({ message: "Missing fields" });

  const post = await Post.findOne({ _id: id, published: true }).lean();
  if (!post) return res.status(404).json({ message: "Post not found" });

  const doc = await Comment.create({
    postId: id,
    name,
    email,
    comment,
    status: "approved", // switch to "pending" to enable moderation
  });

  res.status(201).json({ ok: true, data: doc });
});

export default router;
