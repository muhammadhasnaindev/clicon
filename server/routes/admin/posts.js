// backend/routes/admin/posts.js
// Posts CRUD + media persistence + audit logs + newsletter notify.
// Summary: Small guards, constants for magic values, safer media handling, and lean reads.


import express from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Post from "../../models/Post.js";
import User from "../../models/User.js";
import AuditLog from "../../models/AuditLog.js";
import { requireAuth, requireVerified, hydrateUser } from "../../middleware/auth.js";
import { hasAnyPermission } from "../../utils/permissionMatch.js";

// ⬇️ Newsletter + mailer
import NewsletterSubscriber from "../../models/NewsletterSubscriber.js";
import { sendMail } from "../../utils/mailer.js";

const router = express.Router();

/* -------------------- Small constants (no magic values) -------------------- */
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "posts");
const UPLOAD_URL_BASE = "/uploads/posts";
const EMAIL_BATCH_SIZE = 50;
const PREVIEW_LEN = 220;

// Allow-list mapping for common media; unknowns fall back to .bin
const MIME_EXT = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

/*
[PRO] Purpose: Keep file ops predictable and safe.
Context: We ensure the destination exists once per write path.
Edge cases: Concurrent writes are fine; mkdir is recursive.
Notes: No behavioral change to how files are stored.
*/
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/*
[PRO] Purpose: Parse data URLs safely to a Buffer.
Context: Accepts only base64 data URLs; returns null on bad input.
Edge cases: Non-base64 strings → null; caller decides to skip.
Notes: Keeps route code simple.
*/
function dataUrlToBuffer(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/i.exec(dataUrl || "");
  if (!m) return null;
  return { mime: m[1].toLowerCase(), buf: Buffer.from(m[2], "base64") };
}

/*
[PRO] Purpose: Map MIME to a stable extension.
Context: Unknown MIME falls back to .bin to avoid wrong headers.
Notes: Mapping is minimal; extend as needed.
*/
function extFromMime(mime) {
  return MIME_EXT[mime] || ".bin";
}

/*
[PRO] Purpose: Persist an array of media objects (keep URLs, save new data).
Context: Each item: { type, url?, data? }. If url present and no data → keep.
Edge cases: Bad data URLs are skipped silently; index suffix avoids collisions.
Notes: Returns normalized array { type, url } for storage.
*/
async function persistMediaArray(arr = []) {
  ensureDirSync(UPLOAD_DIR);
  const out = [];
  let i = 0;

  for (const m of arr) {
    const type = String(m?.type || "").toLowerCase();

    if (m?.url && !m?.data) {
      out.push({ type, url: m.url });
      continue;
    }

    const parsed = dataUrlToBuffer(m?.data);
    if (!parsed) continue;

    const ext = extFromMime(parsed.mime);
    const filename = `post_${Date.now()}_${i++}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), parsed.buf);
    out.push({ type, url: `${UPLOAD_URL_BASE}/${filename}` });
  }

  return out;
}

/*
[PRO] Purpose: Persist a single image if provided, otherwise keep previous URL.
Context: Accepts { url?, data? }. If url and no data → keep.
Edge cases: Bad data URLs return empty string; caller can keep old value.
Notes: Only used for cover image.
*/
async function persistSingleImageOrKeep(obj) {
  if (!obj) return "";
  if (obj.url && !obj.data) return obj.url;

  const parsed = dataUrlToBuffer(obj.data);
  if (!parsed) return "";

  ensureDirSync(UPLOAD_DIR);
  const ext = extFromMime(parsed.mime);
  const name = `cover_${Date.now()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), parsed.buf);
  return `${UPLOAD_URL_BASE}/${name}`;
}

/* -------------------- ACL helpers -------------------- */
const isAdminOrManager = (user) => ["admin", "manager"].includes(user?.role);
function canWriteAny(user) {
  return isAdminOrManager(user) || hasAnyPermission(user, ["posts:*", "posts:write"]);
}
function canWriteOwn(user) {
  return hasAnyPermission(user, ["posts:write:own"]);
}
function canReadAny(user) {
  return isAdminOrManager(user) || hasAnyPermission(user, ["posts:*", "posts:read"]);
}
function canReadOwn(user) {
  return hasAnyPermission(user, ["posts:read:own", "posts:write:own"]);
}

/*
[PRO] Purpose: Attach minimal author info for admin listings.
Context: One round trip for authors; map by _id for O(1) lookup.
Edge cases: Missing authors show empty names/emails.
Notes: Keeps response small and UI-ready.
*/
async function decorateAuthor(rows = []) {
  const ids = [...new Set(rows.map((r) => String(r.authorId)).filter(Boolean))];
  if (!ids.length) return rows;

  const users = await User.find({ _id: { $in: ids } }, "email name").lean();
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));

  return rows.map((r) => {
    const u = byId[String(r.authorId)];
    return { ...r, authorEmail: u?.email, authorName: u?.name };
  });
}

/* -------------------- Newsletter notify -------------------- */
function stripHtml(html = "") {
  return String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/*
[PRO] Purpose: Notify subscribers for newly published posts.
Context: Runs after create/publish; batches emails to avoid large fan-outs.
Edge cases: No subscribers or not published → no-op.
Notes: Uses plain-text mail for broad compatibility.
*/
async function notifySubscribersAboutPost(post) {
  if (!post?.published) return;

  const subs = await NewsletterSubscriber.find({ subscribed: true }).lean();
  if (!subs.length) return;

  const base = process.env.FRONTEND_ORIGIN || process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const url = `${base}/blog/${post._id}`;

  const title = post.title || "New post";
  const previewRaw = stripHtml(post.content);
  const preview = previewRaw.slice(0, PREVIEW_LEN);

  const text = `${title}

${preview}${preview.length === PREVIEW_LEN ? "…" : ""}

Read more: ${url}
`;

  for (let i = 0; i < subs.length; i += EMAIL_BATCH_SIZE) {
    const chunk = subs.slice(i, i + EMAIL_BATCH_SIZE);
    await Promise.allSettled(chunk.map((s) => sendMail(s.email, `New post: ${title}`, text)));
  }
}

// hydrate BEFORE verify
router.use(requireAuth, hydrateUser, requireVerified);

/* -------------------- Routes -------------------- */
/*
[PRO] Purpose: List posts for admin UI.
Context: Admins/managers see all; others see own posts only.
Notes: Lean read for lighter memory.
*/
router.get("/", async (req, res) => {
  const q = {};
  if (canReadAny(req.user)) {
    // all posts
  } else if (canReadOwn(req.user)) {
    q.authorId = req.userId;
  } else {
    return res.status(403).json({ message: "Forbidden (posts read)" });
  }

  const data = await Post.find(q).sort({ createdAt: -1 }).lean();
  const out = await decorateAuthor(data);
  res.json({ ok: true, data: out });
});

/*
[PRO] Purpose: Create a post with optional media + cover, and audit trail.
Context: Writer roles only; authorId can be overridden by admins.
Edge cases: Tags normalized/filtered; authorId override must be a valid ObjectId.
Notes: Sends newsletter if created as published.
*/
router.post("/", async (req, res) => {
  const body = req.body || {};
  const writeAny = canWriteAny(req.user);
  const writeOwn = canWriteOwn(req.user);
  if (!writeAny && !writeOwn) {
    return res.status(403).json({ message: "Forbidden (posts write)" });
  }

  const media = await persistMediaArray(body.media || []);
  const coverUrl = await persistSingleImageOrKeep(body.cover);

  const title = typeof body.title === "string" ? body.title.trim() : body.title;
  const content = typeof body.content === "string" ? body.content : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const tags = Array.isArray(body.tags)
    ? [...new Set(body.tags.map((t) => String(t).trim()).filter(Boolean))]
    : [];

  let authorId = req.userId;
  if (writeAny && body.authorId && mongoose.isValidObjectId(body.authorId)) {
    authorId = body.authorId;
  }

  const payload = {
    title,
    content,
    published: !!body.published,
    media,
    coverUrl,
    category,
    tags,
    authorId,
  };

  const doc = await Post.create(payload);

  await AuditLog.create({
    userId: req.userId,
    userEmail: req.user?.email,
    action: "create",
    entity: "post",
    entityId: doc._id,
    summary: `Created "${payload.title}"`,
    changes: payload,
  });

  await notifySubscribersAboutPost(doc);

  res.status(201).json({ ok: true, data: doc });
});

/*
[PRO] Purpose: Update a post with media/cover changes and audit trail.
Context: Admins can edit any; writers only their own.
Edge cases: Draft→Published triggers newsletter; keeps existing cover if new invalid.
Notes: Partial updates only; changes object mirrors mutated fields.
*/
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const existing = await Post.findById(id);
  if (!existing) return res.status(404).json({ message: "Not found" });

  const writeAny = canWriteAny(req.user);
  const writeOwn = canWriteOwn(req.user);
  if (!writeAny) {
    if (!writeOwn || String(existing.authorId) !== String(req.userId)) {
      return res.status(403).json({ message: "Forbidden (not your post)" });
    }
  }

  const wasPublished = !!existing.published;
  const body = req.body || {};
  const changes = {};

  if (Array.isArray(body.media)) {
    existing.media = await persistMediaArray(body.media);
    changes.media = existing.media;
  }

  if (body.cover !== undefined) {
    const url = await persistSingleImageOrKeep(body.cover);
    if (url) {
      existing.coverUrl = url;
      changes.coverUrl = url;
    }
  }

  if (typeof body.title === "string") {
    existing.title = body.title.trim();
    changes.title = existing.title;
  }

  if (typeof body.content === "string") {
    existing.content = body.content;
    changes.content = existing.content;
  }

  if (typeof body.published === "boolean") {
    existing.published = body.published;
    changes.published = body.published;
  }

  if (typeof body.category === "string") {
    existing.category = body.category.trim();
    changes.category = existing.category;
  }

  if (Array.isArray(body.tags)) {
    existing.tags = [...new Set(body.tags.map((t) => String(t).trim()).filter(Boolean))];
    changes.tags = existing.tags;
  }

  if (writeAny && body.authorId && mongoose.isValidObjectId(body.authorId)) {
    existing.authorId = body.authorId;
    changes.authorId = body.authorId;
  }

  const saved = await existing.save();

  await AuditLog.create({
    userId: req.userId,
    userEmail: req.user?.email,
    action: "update",
    entity: "post",
    entityId: existing._id,
    summary: `Updated "${existing.title}"`,
    changes,
  });

  if (!wasPublished && saved.published) {
    await notifySubscribersAboutPost(saved);
  }

  res.json({ ok: true, data: saved });
});

/*
[PRO] Purpose: Delete a post with audit trail.
Context: Admins can delete any; writers only their own.
Edge cases: Nonexistent id → 404; invalid id → 400.
Notes: Idempotent client UX; returns ok=true on success.
*/
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const existing = await Post.findById(id);
  if (!existing) return res.status(404).json({ message: "Not found" });

  const writeAny = canWriteAny(req.user);
  const writeOwn = canWriteOwn(req.user);
  if (!writeAny) {
    if (!writeOwn || String(existing.authorId) !== String(req.userId)) {
      return res.status(403).json({ message: "Forbidden (not your post)" });
    }
  }

  await existing.deleteOne();

  await AuditLog.create({
    userId: req.userId,
    userEmail: req.user?.email,
    action: "delete",
    entity: "post",
    entityId: existing._id,
    summary: `Deleted "${existing.title}"`,
    changes: { id: existing._id, title: existing.title },
  });

  res.json({ ok: true });
});

export default router;
