// server/routes/admin.js
// Admin routes: products, posts, users/ACL, about page, analytics.
// Summary: Small guards, no magic numbers (constants), lean() on GETs, user-safe messages.

import express from "express";
import mongoose from "mongoose";

import Product from "../models/Product.js";
import Post from "../models/Post.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import AboutPage from "../models/AboutPage.js";

import { requireAuth, requireVerified, requireRole } from "../middleware/auth.js";
import { rolePermissions } from "../utils/permissionMatch.js";
import { saveBase64AsFile } from "../utils/saveBase64.js";

const router = express.Router();

// Guards
const adminGuard = [requireAuth, requireVerified, requireRole(["admin", "manager"])];
const superAdminGuard = [requireAuth, requireVerified, requireRole("admin")];

/* -------------------- Small constants & helpers -------------------- */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const ALLOWED_ROLES = ["user", "manager", "admin"];
const isValidId = (v) => mongoose.isValidObjectId(v);
const safeInt = (v, d, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return d;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

/* ------------------------------------------------------------------ */
/* PRODUCTS CRUD                                                       */
/* ------------------------------------------------------------------ */
/*
[PRO] Purpose: List products with fuzzy search + pagination.
Context: Search across title/slug/brand/category; newest first.
Notes: lean() for lighter memory on read.
*/
router.get("/products", adminGuard, async (req, res) => {
  const pg = safeInt(req.query?.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const lim = safeInt(req.query?.limit, DEFAULT_LIMIT, 0, MAX_LIMIT);
  const q = String(req.query?.q || "").trim();

  const where = {};
  if (q) {
    const rx = new RegExp(q, "i");
    where.$or = [{ title: rx }, { slug: rx }, { brand: rx }, { category: rx }];
  }

  const [items, total] = await Promise.all([
    Product.find(where).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
    Product.countDocuments(where),
  ]);

  res.json({ data: items, meta: { total, page: pg, limit: lim } });
});

/*
[PRO] Purpose: Create product; persist base64 images if present.
Context: Keeps existing schema fields; minimal defaults.
Notes: 201 on success.
*/
router.post("/products", adminGuard, async (req, res) => {
  const body = req.body || {};
  let images = Array.isArray(body.images) ? body.images : [];
  images = await Promise.all(
    images.map(async (img) =>
      typeof img === "string" && img.startsWith("data:") ? saveBase64AsFile(img) : img
    )
  );

  const p = await Product.create({
    title: body.title,
    slug: body.slug,
    brand: body.brand,
    category: body.category,
    subcategory: body.subcategory,
    price: { current: Number(body?.price?.current || body.price || 0) },
    images,
  });

  res.status(201).json(p);
});

/*
[PRO] Purpose: Patch product by id; only update provided fields.
Context: Normalizes images; id guard before DB work.
Notes: Price uses partial object merge pattern.
*/
router.put("/products/:id", adminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  const body = req.body || {};
  const p = await Product.findById(id);
  if (!p) return res.status(404).json({ message: "Not found" });

  if (Array.isArray(body.images)) {
    p.images = await Promise.all(
      body.images.map(async (img) =>
        typeof img === "string" && img.startsWith("data:") ? saveBase64AsFile(img) : img
      )
    );
  }

  if (body.title !== undefined) p.title = body.title;
  if (body.slug !== undefined) p.slug = body.slug;
  if (body.brand !== undefined) p.brand = body.brand;
  if (body.category !== undefined) p.category = body.category;
  if (body.subcategory !== undefined) p.subcategory = body.subcategory;

  if (body.price?.current !== undefined) {
    p.price = { current: Number(body?.price?.current ?? p?.price?.current ?? 0) };
  }

  await p.save();
  res.json(p);
});

/*
[PRO] Purpose: Delete product by id.
Context: Id guard; idempotent ok=true response.
Notes: Matches rest of admin delete semantics.
*/
router.delete("/products/:id", adminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });
  await Product.findByIdAndDelete(id);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* POSTS CRUD                                                          */
/* ------------------------------------------------------------------ */
/*
[PRO] Purpose: List posts for admin panel.
Context: Newest first; read-only lean().
Notes: No ACL beyond adminGuard here (panel context).
*/
router.get("/posts", adminGuard, async (_req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).lean();
  res.json({ data: posts });
});

/*
[PRO] Purpose: Create post; persist media if base64.
Context: Minimal publish flag; author set from authed user.
Notes: 201 on success.
*/
router.post("/posts", adminGuard, async (req, res) => {
  const { title, content = "", published = true, media = [] } = req.body || {};
  const savedMedia = [];

  for (const m of media) {
    if (m?.data && m?.type) {
      const url = await saveBase64AsFile(m.data);
      savedMedia.push({ type: m.type, url });
    } else if (m?.url && m?.type) {
      savedMedia.push({ type: m.type, url: m.url });
    }
  }

  const p = await Post.create({
    title,
    content,
    published: !!published,
    media: savedMedia,
    authorId: req.user?._id,
  });

  res.status(201).json(p);
});

/*
[PRO] Purpose: Update post fields + media.
Context: Id guard; partial updates; keeps media array shape.
Notes: 404 if not found.
*/
router.put("/posts/:id", adminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ message: "Not found" });

  const { title, content, published, media = [] } = req.body || {};
  if (typeof title === "string") post.title = title;
  if (typeof content === "string") post.content = content;
  if (typeof published === "boolean") post.published = published;

  const savedMedia = [];
  for (const m of media) {
    if (m?.data && m?.type) {
      const url = await saveBase64AsFile(m.data);
      savedMedia.push({ type: m.type, url });
    } else if (m?.url && m?.type) {
      savedMedia.push({ type: m.type, url: m.url });
    }
  }
  post.media = savedMedia;

  await post.save();
  res.json(post);
});

/*
[PRO] Purpose: Delete post by id.
Context: Id guard; idempotent ok=true.
Notes: Simple admin panel semantics.
*/
router.delete("/posts/:id", adminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });
  await Post.findByIdAndDelete(id);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* USERS / ACL (keeps /acl/* paths your frontend uses)                 */
/* ------------------------------------------------------------------ */

/*
[PRO] Purpose: List users for ACL editor.
Context: Read-only fields; newest first; lean() to avoid heavy docs.
Notes: Path kept as /acl/users for UI compatibility.
*/
router.get("/acl/users", adminGuard, async (_req, res) => {
  const users = await User.find(
    {},
    "name fullName displayName email role permissions emailVerified avatarUrl team createdAt"
  )
    .sort({ createdAt: -1 })
    .lean();

  res.json({ ok: true, data: users });
});

/*
[PRO] Purpose: Create user (admin only) with optional About/team fields.
Context: Validates role/email/password; applies default permissions optionally.
Edge cases: Protected avatar handling via base64 or URL.
Notes: 201 on success.
*/
router.post("/acl/users", superAdminGuard, async (req, res) => {
  let {
    name = "",
    email = "",
    password = "",
    role = "user",
    emailVerified = true,
    applyRoleDefaults = true,

    // optional About fields on create
    showOnAbout = false,
    title = "",
    order = 0,
    avatarImage,
    avatarUrl,
  } = req.body || {};

  name = String(name || "").trim();
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");

  if (!email) return res.status(400).json({ message: "Email required" });
  if (!password || password.length < 8)
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  if (!ALLOWED_ROLES.includes(role))
    return res.status(400).json({ message: "Invalid role" });

  const exists = await User.findOne({ email }).lean();
  if (exists) return res.status(400).json({ message: "Email already exists" });

  const u = new User({
    name,
    email,
    role,
    emailVerified: !!emailVerified,
    permissions: rolePermissions(role, !!applyRoleDefaults, []),
    team: { showOnAbout: !!showOnAbout, title: String(title || ""), order: Number(order || 0) },
  });

  await u.setPassword(password);

  if (avatarImage && typeof avatarImage === "string" && avatarImage.startsWith("data:")) {
    u.avatarUrl = await saveBase64AsFile(avatarImage);
  } else if (avatarUrl && typeof avatarUrl === "string") {
    u.avatarUrl = avatarUrl;
  }

  await u.save();

  res.status(201).json({
    ok: true,
    data: {
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      emailVerified: u.emailVerified,
      permissions: u.permissions || [],
      avatarUrl: u.avatarUrl || "",
      team: u.team || {},
      createdAt: u.createdAt,
    },
  });
});

/*
[PRO] Purpose: Change role (admin only) with optional default permissions merge.
Context: Validates id/role; protects configured admin email.
Notes: 404 when user missing.
*/
router.put("/acl/users/:id/role", superAdminGuard, async (req, res) => {
  const { id } = req.params;
  const { role, applyDefaults = false } = req.body || {};

  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });
  if (!ALLOWED_ROLES.includes(role))
    return res.status(400).json({ message: "Invalid role" });

  const u = await User.findById(id);
  if (!u) return res.status(404).json({ message: "Not found" });

  const protectedEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  if ((u.email || "").toLowerCase() === protectedEmail)
    return res.status(400).json({ message: "Protected admin cannot change role" });

  u.role = role;
  if (applyDefaults) u.permissions = rolePermissions(role, true, u.permissions);
  await u.save();

  res.json({
    ok: true,
    data: { _id: u._id, name: u.name, email: u.email, role: u.role, permissions: u.permissions || [] },
  });
});

/*
[PRO] Purpose: Replace a user's explicit permissions.
Context: Normalizes array to unique trimmed strings.
Notes: 404 when user missing.
*/
router.put("/acl/users/:id/permissions", adminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  let { permissions } = req.body || {};
  if (!Array.isArray(permissions)) permissions = [];
  permissions = [...new Set(permissions.map(String).map((s) => s.trim()).filter(Boolean))];

  const u = await User.findByIdAndUpdate(
    id,
    { permissions },
    { new: true, select: "name email role permissions" }
  ).lean();
  if (!u) return res.status(404).json({ message: "Not found" });

  res.json({ ok: true, data: u });
});

/*
[PRO] Purpose: Delete user (admin only) with protections.
Context: Blocks self-delete, protected email, and admin role deletions.
Notes: Invalid id treated idempotently for UX.
*/
router.delete("/acl/users/:id", superAdminGuard, async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id))
    return res.json({ ok: true, note: "invalid id (treated idempotently)" });
  if (String(req.user?._id) === String(id))
    return res.status(400).json({ message: "You cannot delete yourself" });

  const u = await User.findById(id).lean();
  if (!u) return res.json({ ok: true, note: "already deleted" });

  const protectedEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  if ((u.email || "").toLowerCase() === protectedEmail)
    return res.status(400).json({ message: "Protected admin cannot be deleted" });
  if ((u.role || "").toLowerCase() === "admin")
    return res.status(400).json({ message: "Admin accounts cannot be deleted" });

  await User.deleteOne({ _id: id });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* PERMISSIONS CATALOG                                                 */
/* ------------------------------------------------------------------ */
/*
[PRO] Purpose: Static permissions + dynamic product categories for UI.
Context: Keeps client options current with catalog.
Notes: Shape unchanged.
*/
router.get("/acl/permissions", adminGuard, async (_req, res) => {
  const staticPerms = [
    "products:read","products:write","products:*",
    "posts:read","posts:write","posts:*","posts:read:own","posts:write:own",
    "analytics:view","orders:update","users:read","users:role:set","users:permission:set",
    "billing:view","settings:write",
    "support:read","support:reply","support:*",
    "faqs:read","faqs:write","faqs:*",
  ];
  const categories = (await Product.distinct("category")).filter(Boolean).sort();
  res.json({ ok: true, data: { static: staticPerms, categories } });
});

/* ------------------------------------------------------------------ */
/* ABOUT PAGE (content + team per-user)                                */
/* ------------------------------------------------------------------ */
/*
[PRO] Purpose: Get or initialize About page content.
Context: Returns a single doc; creates if missing.
Notes: Raw doc response preserved for UI.
*/
router.get("/pages/about", adminGuard, async (_req, res) => {
  let page = await AboutPage.findOne({ key: "about" });
  if (!page) page = await AboutPage.create({});
  res.json(page);
});

/*
[PRO] Purpose: Update About page content + hero image.
Context: Accepts base64 or URL for hero image; trims lists.
Notes: Caps bullets to 10 items.
*/
router.put("/pages/about", adminGuard, async (req, res) => {
  const { badge, title, subtitle, bullets, heroImage } = req.body || {};
  let page = await AboutPage.findOne({ key: "about" });
  if (!page) page = await AboutPage.create({});

  if (typeof badge === "string") page.badge = badge;
  if (typeof title === "string") page.title = title;
  if (typeof subtitle === "string") page.subtitle = subtitle;
  if (Array.isArray(bullets)) page.bullets = bullets.filter(Boolean).slice(0, 10);

  if (heroImage) {
    if (typeof heroImage === "string" && heroImage.startsWith("data:")) {
      page.heroImageUrl = await saveBase64AsFile(heroImage);
    } else if (typeof heroImage === "string") {
      page.heroImageUrl = heroImage;
    }
  }

  await page.save();
  res.json(page);
});

/*
[PRO] Purpose: Update per-user team card fields for About page.
Context: Partial updates with $set; supports avatar from base64 or URL.
Notes: Returns minimal fields for UI.
*/
router.put("/users/:id/about", adminGuard, async (req, res) => {
  const { id } = req.params;
  const { showOnAbout, title, order, avatarImage, avatarUrl } = req.body || {};
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid user id" });

  const $set = {};
  if (typeof showOnAbout === "boolean") $set["team.showOnAbout"] = showOnAbout;
  if (typeof title === "string") $set["team.title"] = title;
  if (order !== undefined && order !== null && !Number.isNaN(Number(order)))
    $set["team.order"] = Number(order);

  if (avatarImage && typeof avatarImage === "string" && avatarImage.startsWith("data:")) {
    $set.avatarUrl = await saveBase64AsFile(avatarImage);
  } else if (typeof avatarUrl === "string" && avatarUrl) {
    $set.avatarUrl = avatarUrl;
  }

  const updated = await User.findByIdAndUpdate(
    id,
    { $set },
    { new: true, select: "name email avatarUrl team" }
  ).lean();

  if (!updated) return res.status(404).json({ message: "User not found" });
  res.json({ ok: true, data: updated });
});

/* ------------------------------------------------------------------ */
/* ANALYTICS                                                           */
/* ------------------------------------------------------------------ */
/*
[PRO] Purpose: Sales (orders + revenue) grouped by month for a given year.
Context: Revenue source corrected to totals.totalBase (USD base).
Notes: Fills missing months with zeros for charting.
*/
router.get("/stats/sales", adminGuard, async (req, res) => {
  const nowYear = new Date().getFullYear();
  const year = Number(req.query.year) || nowYear;
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { m: { $month: "$createdAt" } },
        orders: { $sum: 1 },
        revenue: { $sum: "$totals.totalBase" }, // fixed from "$total"
      },
    },
    { $project: { _id: 0, month: "$_id.m", orders: 1, revenue: 1 } },
    { $sort: { month: 1 } },
  ]);

  const map = new Map(rows.map((r) => [r.month, r]));
  const out = [];
  for (let m = 1; m <= 12; m++) out.push(map.get(m) || { month: m, orders: 0, revenue: 0 });
  res.json({ data: out });
});

/*
[PRO] Purpose: Top products by quantity + revenue.
Context: Uses stored per-item subtotalBase for revenue.
Notes: Limit clamped; shape unchanged.
*/
router.get("/stats/top-products", adminGuard, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const rows = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        title: { $first: "$items.title" },
        qty: { $sum: "$items.qty" },
        revenue: { $sum: "$items.subtotalBase" }, // fixed from qty*price
      },
    },
    { $sort: { qty: -1 } },
    { $limit: limit },
    { $project: { _id: 0, productId: "$_id", title: 1, qty: 1, revenue: 1 } },
  ]);
  res.json({ data: rows });
});

/*
[PRO] Purpose: Category view totals for dashboard.
Context: Aggregates by category with viewCount sum + item count.
Notes: Sorted by views desc.
*/
router.get("/stats/category-views", adminGuard, async (_req, res) => {
  const rows = await Product.aggregate([
    { $group: { _id: "$category", views: { $sum: "$viewCount" }, items: { $sum: 1 } } },
    { $project: { _id: 0, category: "$_id", views: 1, items: 1 } },
    { $sort: { views: -1 } },
  ]);
  res.json({ data: rows });
});

/*
[PRO] Purpose: Top items by viewCount.
Context: Lean read with projection; limit clamped 1..100.
Notes: For simple cards/charts on admin UI.
*/
router.get("/stats/item-views", adminGuard, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const rows = await Product.find({}, "title category viewCount slug")
    .sort({ viewCount: -1 })
    .limit(limit)
    .lean();
  res.json({ data: rows });
});

export default router;
