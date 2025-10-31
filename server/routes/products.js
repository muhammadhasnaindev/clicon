// server/routes/products.public.js
// Summary: Public catalog: categories, home sections, list/search/sort, detail, and view tracking.


/*
[PRO] Purpose: Public product browsing endpoints.
Context: No auth required; only `published: true` items are exposed.
Edge cases: Mixed relative/absolute media URLs; legacy sort keys.
Notes: Origin derived from request for stable absolute media links.
*/

import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const router = express.Router();

/** Build absolute origin from request */
function buildOrigin(req) {
  return `${req.protocol}://${req.get("host")}`;
}
function toAbs(u, origin) {
  if (!u) return u;
  const s = String(u).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `${origin.startsWith("https") ? "https:" : "http:"}${s}`;
  return `${origin}${s.startsWith("/") ? "" : "/"}${s}`;
}
function normalizeProductMedia(doc, origin) {
  const o = doc?.toObject ? doc.toObject() : { ...doc };
  if (Array.isArray(o.images)) o.images = o.images.map((x) => toAbs(x, origin));
  if (o.image) o.image = toAbs(o.image, origin);
  if (!o.image && Array.isArray(o.images) && o.images.length) o.image = o.images[0];
  return o;
}
const wrap = (arr, origin) => (arr || []).map((p) => normalizeProductMedia(p, origin));
const uniqById = (arr) => {
  const m = new Map();
  for (const p of arr) {
    const id = String(p?._id || p?.id || p?.slug || "");
    if (!m.has(id)) m.set(id, p);
  }
  return Array.from(m.values());
};

/* ------------------------- categories (filters) ------------------------- */
/*
[PRO] Purpose: Category/subcategory counts for filter sidebars.
Context: Only published products counted; subcategories are cleaned.
Edge cases: Null/empty subcategory removed; sorted alpha by name.
Notes: Aggregation returns `{ name, count, subcategories[] }`.
*/
router.get("/categories", async (_req, res, next) => {
  try {
    const rows = await Product.aggregate([
      { $match: { published: true } },
      {
        $project: {
          category: { $ifNull: ["$category", null] },
          subcategory: { $ifNull: ["$subcategory", null] },
        },
      },
      { $group: { _id: { cat: "$category", sub: "$subcategory" }, count: { $sum: 1 } } },
      {
        $group: {
          _id: "$_id.cat",
          count: { $sum: "$count" },
          subcategories: { $push: { name: "$_id.sub", count: "$count" } },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          count: 1,
          subcategories: {
            $filter: {
              input: "$subcategories",
              as: "s",
              cond: { $and: [{ $ne: ["$$s.name", null] }, { $ne: ["$$s.name", ""] }] },
            },
          },
        },
      },
      { $sort: { name: 1 } },
    ]);
    res.json({ categories: rows });
  } catch (e) {
    next(e);
  }
});

/* ------------------------- home sections ------------------------- */
/*
[PRO] Purpose: Curated home payload (featured, flash, and buckets).
Context: Picks featured pool + ensures at least a phone & TV if possible.
Edge cases: Fallbacks from popular/top-rated/latest; unique by id.
Notes: Media normalized to absolute URLs for client display.
*/
router.get("/sections/home/data", async (req, res, next) => {
  try {
    const [latest, popular, cheapest, topRated] = await Promise.all([
      Product.find({ published: true }).sort({ createdAt: -1 }).limit(16),
      Product.find({ published: true }).sort({ viewCount: -1 }).limit(16),
      Product.find({ published: true }).sort({ "price.current": 1 }).limit(16),
      Product.find({ published: true }).sort({ rating: -1, numReviews: -1 }).limit(16),
    ]);

    const poolFeatured = await Product.find({ published: true, label: /featured/i })
      .sort({ createdAt: -1 })
      .limit(32);

    const needOne = async (query) =>
      (await Product.findOne({ published: true, ...query }).sort({ createdAt: -1 })) || null;

    const pickSmartPhone =
      (await needOne({ category: /smart ?phone/i })) ||
      (await needOne({ category: /phone/i })) ||
      (await needOne({ title: /(iphone|galaxy|pixel)/i }));

    const pickTV =
      (await needOne({ category: /^tv$/i })) ||
      (await needOne({ category: /television/i })) ||
      (await needOne({ subcategory: /streaming/i })) ||
      (await needOne({ title: /(tv|chromecast|fire tv)/i }));

    let featuredArr = [...poolFeatured];

    const hasSmartPhone = featuredArr.some((p) =>
      /smart ?phone|phone/i.test(String(p?.category || ""))
    );
    if (!hasSmartPhone && pickSmartPhone) featuredArr.push(pickSmartPhone);

    const hasTV = featuredArr.some(
      (p) =>
        /(^tv$)|television/i.test(String(p?.category || "")) ||
        /streaming/i.test(String(p?.subcategory || ""))
    );
    if (!hasTV && pickTV) featuredArr.push(pickTV);

    const filler = uniqById([...topRated, ...popular, ...latest]);
    featuredArr = uniqById([...featuredArr, ...filler]).slice(0, 8);

    const caAll = await Product.find({ published: true, category: "Computer Accessories" }).limit(
      60
    );
    const lc = (s) => String(s ?? "").toLowerCase();
    const caKeyboardMouse = caAll.filter((p) => /keyboard|mouse/.test(lc(p.subcategory)));
    const caHeadphone = caAll.filter((p) => /headphone/.test(lc(p.subcategory)));
    const caWebcam = caAll.filter((p) => /webcam/.test(lc(p.subcategory)));
    const caPrinter = caAll.filter((p) => /printer/.test(lc(p.subcategory)));

    const origin = buildOrigin(req);

    res.json({
      bestDeals: wrap(cheapest.slice(0, 8), origin),
      featured: wrap(featuredArr, origin),
      flash: {
        flashSale: wrap(cheapest.slice(0, 8), origin),
        bestSellers: wrap(popular.slice(0, 8), origin),
        topRated: wrap(topRated.slice(0, 8), origin),
        newArrival: wrap(latest.slice(0, 8), origin),
      },
      computerAccessories: {
        all: wrap(caAll, origin),
        keyboardMouse: wrap(caKeyboardMouse, origin),
        headphone: wrap(caHeadphone, origin),
        webcam: wrap(caWebcam, origin),
        printer: wrap(caPrinter, origin),
      },
      data: [
        { key: "latest", title: "Latest", products: wrap(latest.slice(0, 8), origin) },
        { key: "popular", title: "Popular", products: wrap(popular.slice(0, 8), origin) },
        { key: "deals", title: "Best Deals", products: wrap(cheapest.slice(0, 8), origin) },
      ],
    });
  } catch (e) {
    next(e);
  }
});

/* ------------------------- list (with full sorting) ------------------------- */
/*
[PRO] Purpose: Main catalog listing with filters and UI-aligned sorting.
Context: Supports category/sub/brand/tags/q; maps UI sort keys.
Edge cases: Legacy sort support; clamps page/limit; safe regex.
Notes: Returns normalized media and total/page counts.
*/
/**
 * Accepts:
 *   q, category, subcategory, brand, tags (comma), page, limit
 *   sort UI keys: popular | newest | price_asc | price_desc | rating
 *   legacy: sort=price&order=asc|desc, sort=createdAt, sort=rating
 */
router.get("/", async (req, res, next) => {
  try {
    const {
      category,
      subcategory,
      brand,
      tags,
      q,
      page = 1,
      limit = 20,
      sort = "popular",
      order = "desc",
    } = req.query;

    const filter = { published: true };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (brand) filter.brand = brand;
    if (tags)
      filter.tags = { $in: String(tags).split(",").map((t) => t.trim()).filter(Boolean) };
    if (q) {
      const s = String(q).trim();
      if (s) {
        filter.$or = [
          { title: { $regex: s, $options: "i" } },
          { brand: { $regex: s, $options: "i" } },
          { category: { $regex: s, $options: "i" } },
          { subcategory: { $regex: s, $options: "i" } },
          { slug: { $regex: s, $options: "i" } },
        ];
      }
    }

    const uiSort = String(sort).toLowerCase();
    const isAsc = String(order).toLowerCase() === "asc";

    let sortSpec;
    switch (uiSort) {
      case "price_asc":
        sortSpec = { "price.current": 1, createdAt: -1 };
        break;
      case "price_desc":
        sortSpec = { "price.current": -1, createdAt: -1 };
        break;
      case "rating":
        sortSpec = { rating: -1, numReviews: -1, createdAt: -1 };
        break;
      case "newest":
      case "createdat": // legacy
        sortSpec = { createdAt: -1 };
        break;
      case "price": // legacy
        sortSpec = { "price.current": isAsc ? 1 : -1, createdAt: -1 };
        break;
      case "popular":
      default:
        sortSpec = { viewCount: -1, rating: -1, numReviews: -1, createdAt: -1 };
        break;
    }

    const p = Math.max(1, Number(page) || 1);
    const lim = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (p - 1) * lim;

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sortSpec).skip(skip).limit(lim),
      Product.countDocuments(filter),
    ]);

    const origin = buildOrigin(req);
    const data = items.map((it) => normalizeProductMedia(it, origin));

    res.json({ data, page: p, pages: Math.ceil(total / lim), total });
  } catch (e) {
    next(e);
  }
});

/* ------------------------- detail ------------------------- */
/*
[PRO] Purpose: Product detail by id or slug.
Context: Only published items; supports both id and slug paths.
Edge cases: 404 on miss; origin-based absolute media.
Notes: No side effects here.
*/
router.get("/:idOrSlug", async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const byId = await Product.findOne({ _id: idOrSlug, published: true }).catch(() => null);
    const doc = byId || (await Product.findOne({ slug: idOrSlug, published: true }));
    if (!doc) return res.status(404).json({ message: "Product not found" });
    const origin = buildOrigin(req);
    res.json({ ok: true, data: normalizeProductMedia(doc, origin) });
  } catch (e) {
    next(e);
  }
});

/* ------------------------- track view ------------------------- */
/*
[PRO] Purpose: Increment a product's view counter.
Context: Accepts id or slug; returns new viewCount.
Edge cases: 404 if not found; no auth required.
Notes: Separate endpoint prevents accidental increments on detail GET.
*/
router.post("/:idOrSlug/track-view", async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const doc =
      (await Product.findOneAndUpdate(
        { _id: idOrSlug, published: true },
        { $inc: { viewCount: 1 } },
        { new: true }
      ).catch(() => null)) ||
      (await Product.findOneAndUpdate(
        { slug: idOrSlug, published: true },
        { $inc: { viewCount: 1 } },
        { new: true }
      ));
    if (!doc) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true, data: { viewCount: doc.viewCount } });
  } catch (e) {
    next(e);
  }
});

export default router;
