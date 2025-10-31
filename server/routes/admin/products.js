// server/routes/admin/products.js
// Products CRUD for admin panel + base64 image persistence.
// Summary: Guards for ids & pagination, constants for limits, safer base64 handling.
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import Product from "../../models/Product.js";
import { requireAuth, requireVerified, requirePermission } from "../../middleware/auth.js";

const router = express.Router();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const UPLOAD_SUBDIR = "products";

/*
[PRO] Purpose: Save a base64 data URL into /uploads/<subdir>/uuid.ext
Context: Keeps existing behavior, adds small guards and stable paths.
Edge cases: Bad data -> null, mkdir recursive for first write.
Notes: Returns web path (/uploads/...).
*/
function saveBase64ToUploads(dataUrl, subdir = UPLOAD_SUBDIR) {
  const m = String(dataUrl || "").match(/^data:(.+?);base64,(.+)$/);
  if (!m) return null;

  const mime = (m[1] || "").toLowerCase();
  const buf = Buffer.from(m[2], "base64");
  const ext = (mime.split("/")[1] || "bin").toLowerCase();

  const dir = path.join(process.cwd(), "uploads", subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `${uuid()}.${ext}`;
  const abs = path.join(dir, filename);
  fs.writeFileSync(abs, buf);

  return path.posix.join("/uploads", subdir, filename);
}

/*
[PRO] Purpose: Normalize a heterogeneous images array into string URLs.
Context: Accepts data URLs, plain URLs, or {url} objects.
Notes: Data URLs are persisted; others are kept as-is.
*/
async function normalizeImages(images) {
  const list = Array.isArray(images) ? images : [];
  const out = [];
  for (const img of list) {
    if (typeof img === "string" && img.startsWith("data:")) {
      const saved = saveBase64ToUploads(img, UPLOAD_SUBDIR);
      if (saved) out.push(saved);
    } else if (typeof img === "string" && img) {
      out.push(img);
    } else if (img && typeof img === "object" && typeof img.url === "string") {
      out.push(img.url);
    }
  }
  return out;
}

/*
[PRO] Purpose: Normalize coupon payload with light validation.
Context: Keeps code/type/amount/minSubtotal/active/expiresAt.
Edge cases: Empty/invalid -> null; invalid date -> null.
Notes: Upper-cases code for consistency.
*/
function normCoupon(raw) {
  if (!raw || typeof raw !== "object") return null;
  const code = String(raw.code || "").trim().toUpperCase();
  if (!code) return null;

  const expires = raw.expiresAt ? new Date(raw.expiresAt) : null;
  const expiresAt = expires && !Number.isNaN(+expires) ? expires : null;

  return {
    code,
    type: raw.type === "fixed" ? "fixed" : "percent",
    amount: Number(raw.amount || 0),
    minSubtotal: Number(raw.minSubtotal || 0),
    active: !!raw.active,
    expiresAt,
  };
}

const isValidId = (v) => mongoose.isValidObjectId(v);
const safeInt = (v, d, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return d;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

// Auth + verified required for all routes
router.use(requireAuth, requireVerified);

/*
[PRO] Purpose: List products with optional fuzzy search and pagination.
Context: Search over title/slug/brand/category; newest first.
Notes: lean() for lighter memory.
*/
router.get("/", requirePermission(["products:read", "products:*"]), async (req, res) => {
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
[PRO] Purpose: Create product; normalize images/coupon; default flags.
Context: Preserves existing schema layout and defaults.
Notes: 201 on success.
*/
router.post("/", requirePermission(["products:write", "products:*"]), async (req, res) => {
  const body = req.body || {};
  const images = await normalizeImages(body.images);
  const coupon = normCoupon(body.coupon);

  const p = await Product.create({
    title: body.title,
    slug: body.slug,
    brand: body.brand,
    category: body.category,
    subcategory: body.subcategory,
    sku: body.sku,
    price: {
      current: Number(body?.price?.current ?? body.price ?? 0),
      old: body?.price?.old ?? null,
    },
    label: body.label || "",
    discountText: body.discountText || "",
    dealEndsAt: body.dealEndsAt ? new Date(body.dealEndsAt) : null,
    rating: Number(body.rating || 0),
    numReviews: Number(body.numReviews || 0),
    published: body.published !== false,
    tags: Array.isArray(body.tags) ? body.tags : [],
    description: body.description || "",
    features: Array.isArray(body.features) ? body.features : [],
    shippingInfo: Array.isArray(body.shippingInfo) ? body.shippingInfo : [],
    specs: body.specs || {},
    attributes: Array.isArray(body.attributes) ? body.attributes : [],
    adjustments: body.adjustments || {},
    coupon,
    images,
  });

  res.status(201).json(p);
});

/*
[PRO] Purpose: Patch product in place; normalize lists and coupon.
Context: Guard id; only touch provided fields; keep structure stable.
Notes: Price patch respects partial object updates.
*/
router.put("/:id", requirePermission(["products:write", "products:*"]), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  const body = req.body || {};
  const p = await Product.findById(id);
  if (!p) return res.status(404).json({ message: "Not found" });

  if (Array.isArray(body.images)) p.images = await normalizeImages(body.images);

  if (body.title !== undefined) p.title = body.title;
  if (body.slug !== undefined) p.slug = body.slug;
  if (body.sku !== undefined) p.sku = body.sku;
  if (body.brand !== undefined) p.brand = body.brand;
  if (body.category !== undefined) p.category = body.category;
  if (body.subcategory !== undefined) p.subcategory = body.subcategory;
  if (body.label !== undefined) p.label = body.label;
  if (body.discountText !== undefined) p.discountText = body.discountText;
  if (body.dealEndsAt !== undefined) p.dealEndsAt = body.dealEndsAt ? new Date(body.dealEndsAt) : null;
  if (body.rating !== undefined) p.rating = Number(body.rating);
  if (body.numReviews !== undefined) p.numReviews = Number(body.numReviews);
  if (body.published !== undefined) p.published = !!body.published;
  if (body.tags !== undefined) p.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.description !== undefined) p.description = body.description || "";
  if (body.features !== undefined) p.features = Array.isArray(body.features) ? body.features : [];
  if (body.shippingInfo !== undefined) p.shippingInfo = Array.isArray(body.shippingInfo) ? body.shippingInfo : [];
  if (body.specs !== undefined) p.specs = body.specs || {};
  if (body.attributes !== undefined) p.attributes = Array.isArray(body.attributes) ? body.attributes : [];
  if (body.adjustments !== undefined) p.adjustments = body.adjustments || {};

  if (body.price?.current !== undefined || body.price?.old !== undefined) {
    p.price = {
      current: Number(body?.price?.current ?? p.price?.current ?? 0),
      old: body?.price?.old ?? null,
    };
  }

  if ("coupon" in body) {
    p.coupon = normCoupon(body.coupon);
  }

  await p.save();
  res.json(p);
});

/*
[PRO] Purpose: Delete product by id.
Context: Id guard first to avoid needless DB work.
Notes: Idempotent client-facing ok=true.
*/
router.delete("/:id", requirePermission(["products:write", "products:*"]), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  await Product.findByIdAndDelete(id);
  res.json({ ok: true });
});

export default router;
