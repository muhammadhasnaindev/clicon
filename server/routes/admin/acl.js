// server/routes/admin/acl.js
// Admin ACL + people analytics routes.
// Summary: Small guards, constants for magic values, removed one unused var, and light validation.
import express from "express";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Product from "../../models/Product.js";
import Order from "../../models/Order.js";
import ViewLog from "../../models/ViewLog.js";
import LoginLog from "../../models/LoginLog.js";
import { requireAuth, requireVerified, requireRole } from "../../middleware/auth.js";
import { rolePermissions } from "../../utils/permissionMatch.js";
import { saveBase64AsFile } from "../../utils/saveBase64.js";

const router = express.Router();
const adminGuard = [requireAuth, requireVerified, requireRole(["admin", "manager"])];
const superAdminGuard = [requireAuth, requireVerified, requireRole("admin")];

/* -------------------- Small constants (no magic values) -------------------- */
const ALLOWED_ROLES = ["user", "manager", "admin"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const CSV_FILENAME = "customers_export.csv";
const DEVICE_TYPES = new Set(["desktop", "mobile", "tablet", "other"]);

/*
[PRO] Purpose: Small helpers to keep guards consistent and inputs sane.
Context: We validate ObjectIds and clamp numeric query params in one place.
Edge cases: Non-numeric inputs, negative numbers, or overly large limits.
Notes: Keeps route logic focused on business rules.
*/
const isValidId = (id) => mongoose.isValidObjectId(id);
const safeInt = (v, def, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

/* -------------------- Helpers -------------------- */
function protectEmail(u) {
  const protectedEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  return (u?.email || "").toLowerCase() === protectedEmail;
}
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(+d) ? null : d;
};

/* -------------------- USERS (existing) -------------------- */
async function listUsers(_req, res) {
  const users = await User.find(
    {},
    "name fullName displayName email role permissions emailVerified avatarUrl team createdAt"
  ).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, data: users });
}
router.get("/users", adminGuard, listUsers);
router.get("/acl/users", adminGuard, listUsers);

/*
[PRO] Purpose: Minimal, safe user creation for admins.
Context: Enforces role list, unique email, and password policy.
Edge cases: applyRoleDefaults toggles default perms on top of explicit.
Notes: setPassword is assumed on the User model.
*/
router.post("/users", superAdminGuard, async (req, res) => {
  let {
    name = "",
    email = "",
    password = "",
    role = "user",
    emailVerified = true,
    applyRoleDefaults = true,
  } = req.body || {};
  name = String(name || "").trim();
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");

  if (!email) return res.status(400).json({ message: "Email required" });
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ message: "Invalid role" });

  const exists = await User.findOne({ email }).lean();
  if (exists) return res.status(400).json({ message: "Email already exists" });

  const u = new User({
    name,
    email,
    role,
    emailVerified: !!emailVerified,
    permissions: rolePermissions(role, !!applyRoleDefaults, []),
  });
  await u.setPassword(password);
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
      createdAt: u.createdAt,
    },
  });
});
router.post("/acl/users", superAdminGuard, (req, res) =>
  router.handle({ ...req, url: "/users", method: "POST" }, res)
);

/*
[PRO] Purpose: Controlled role change with optional default permissions.
Context: Guards id validity, role list, and protected accounts.
Edge cases: applyDefaults merges default perms (keeps existing if false).
Notes: 404 on missing user; clear error messages.
*/
router.put("/users/:id/role", superAdminGuard, async (req, res) => {
  const { id } = req.params;
  const { role, applyDefaults = false } = req.body || {};
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });
  if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ message: "Invalid role" });

  const u = await User.findById(id);
  if (!u) return res.status(404).json({ message: "Not found" });
  if (protectEmail(u)) return res.status(400).json({ message: "Protected admin cannot change role" });

  u.role = role;
  if (applyDefaults) u.permissions = rolePermissions(role, true, u.permissions || []);
  await u.save();

  res.json({
    ok: true,
    data: { _id: u._id, name: u.name, email: u.email, role: u.role, permissions: u.permissions || [] },
  });
});
router.put("/acl/users/:id/role", superAdminGuard, (req, res) =>
  router.handle({ ...req, url: req.url.replace(/^\/acl/, ""), method: "PUT" }, res)
);

/*
[PRO] Purpose: Replace an account's explicit permission list.
Context: Validates id; normalizes the list to unique, trimmed strings.
Edge cases: Empty payload becomes an empty list (explicit).
Notes: Returns selected fields only.
*/
router.put("/users/:id/permissions", adminGuard, async (req, res) => {
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
router.put("/acl/users/:id/permissions", adminGuard, (req, res) =>
  router.handle({ ...req, url: req.url.replace(/^\/acl/, ""), method: "PUT" }, res)
);

/*
[PRO] Purpose: Safe, idempotent delete with protection rules.
Context: Blocks self-delete, protected email, and admin role.
Edge cases: Invalid id → treated idempotently; already deleted → ok.
Notes: Keeps client UX simple; no data leaks.
*/
router.delete("/users/:id", superAdminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.json({ ok: true, note: "invalid id (treated idempotently)" });
  if (String(req.user?._id) === String(id)) {
    return res.status(400).json({ message: "You cannot delete yourself" });
  }

  const u = await User.findById(id).lean();
  if (!u) return res.json({ ok: true, note: "already deleted" });
  if (protectEmail(u)) return res.status(400).json({ message: "Protected admin cannot be deleted" });
  if ((u.role || "").toLowerCase() === "admin") {
    return res.status(400).json({ message: "Admin accounts cannot be deleted" });
  }

  await User.deleteOne({ _id: id });
  res.json({ ok: true });
});
router.delete("/acl/users/:id", superAdminGuard, (req, res) =>
  router.handle({ ...req, url: req.url.replace(/^\/acl/, ""), method: "DELETE" }, res)
);

/* -------------------- PER-USER ABOUT -------------------- */
/*
[PRO] Purpose: Update “about/team” fields and avatar in one endpoint.
Context: Support base64 upload or external URL; partial updates via $set.
Edge cases: Invalid id; non-numeric order; non-data URI ignored unless avatarUrl provided.
Notes: Returns minimal fields for UI.
*/
async function updateUserAbout(req, res) {
  const { id } = req.params;
  const { showOnAbout, title, order, avatarImage, avatarUrl } = req.body || {};
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid user id" });

  const $set = {};
  if (typeof showOnAbout === "boolean") $set["team.showOnAbout"] = showOnAbout;
  if (typeof title === "string") $set["team.title"] = title;
  if (order !== undefined && order !== null && !Number.isNaN(Number(order))) {
    $set["team.order"] = Number(order);
  }

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
  return res.json({ ok: true, data: updated });
}
router.put("/users/:id/about", adminGuard, updateUserAbout);
router.put("/acl/users/:id/about", adminGuard, updateUserAbout);

/* -------------------- PERMISSIONS CATALOG -------------------- */
/*
[PRO] Purpose: Static permission names + dynamic category list for UI.
Context: Keeps client options in sync with product categories.
Edge cases: No categories → empty list.
Notes: Static list can be extended without breaking API shape.
*/
router.get("/permissions", adminGuard, async (_req, res) => {
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

/* ======================================================================
    PEOPLE APIs — Customers vs Staff + per-user Activity + Filters/CSV
   ====================================================================== */

/*
[PRO] Purpose: Buyers only with filters and simple pagination.
Context: Optional search, date range, min orders, and top device filter.
Edge cases: Invalid dates ignored; device filter only applied if known type.
Notes: Keeps result lean and sorted by recency.
*/
router.get("/customers", adminGuard, async (req, res) => {
  const page = safeInt(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = safeInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const skip = (page - 1) * limit;

  const q = String(req.query.q || "").trim();
  const start = parseDate(req.query.start);
  const end = parseDate(req.query.end);
  const minOrders = Math.max(1, Number(req.query.minOrders || 1));
  const deviceTopRaw = String(req.query.deviceTop || "").toLowerCase();
  const deviceTop = DEVICE_TYPES.has(deviceTopRaw) ? deviceTopRaw : "";

  const $match = { role: "user" };
  if (q) {
    $match.$or = [
      { name: { $regex: q, $options: "i" } },
      { fullName: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const pipeline = [
    { $match },
    // orders aggregate (with optional date filter)
    {
      $lookup: {
        from: "orders",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          ...(start || end
            ? [{ $match: { createdAt: { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) } } }]
            : []),
          { $group: { _id: null, totalOrders: { $sum: 1 }, lastOrderAt: { $max: "$createdAt" } } },
        ],
        as: "ordersAgg",
      },
    },
    // views aggregate
    {
      $lookup: {
        from: "viewlogs",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $group: { _id: null, totalViews: { $sum: 1 }, lastViewAt: { $max: "$updatedAt" } } },
        ],
        as: "viewsAgg",
      },
    },
    // last login
    {
      $lookup: {
        from: "loginlogs",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "lastLogin",
      },
    },
    // top device (by login count)
    {
      $lookup: {
        from: "loginlogs",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $group: { _id: "$device", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ],
        as: "topDev",
      },
    },
    // flatten fields
    {
      $addFields: {
        totalOrders: { $ifNull: [{ $arrayElemAt: ["$ordersAgg.totalOrders", 0] }, 0] },
        lastOrderAt: { $arrayElemAt: ["$ordersAgg.lastOrderAt", 0] },
        totalViews: { $ifNull: [{ $arrayElemAt: ["$viewsAgg.totalViews", 0] }, 0] },
        lastViewAt: { $arrayElemAt: ["$viewsAgg.lastViewAt", 0] },
        lastLogin: { $arrayElemAt: ["$lastLogin", 0] },
        topDevice: { $arrayElemAt: ["$topDev._id", 0] },
      },
    },
    // buyers only + minOrders
    { $match: { totalOrders: { $gte: minOrders } } },
    // optional top-device filter (validated)
    ...(deviceTop ? [{ $match: { topDevice: deviceTop } }] : []),
    {
      $project: {
        name: 1,
        fullName: 1,
        email: 1,
        role: 1,
        avatarUrl: 1,
        createdAt: 1,
        totalOrders: 1,
        lastOrderAt: 1,
        totalViews: 1,
        lastViewAt: 1,
        "lastLogin.createdAt": 1,
        "lastLogin.device": 1,
        "lastLogin.browser": 1,
        "lastLogin.os": 1,
        "lastLogin.location": 1,
        topDevice: 1,
      },
    },
    { $sort: { lastOrderAt: -1, createdAt: -1 } },
    { $facet: { data: [{ $skip: skip }, { $limit: limit }], meta: [{ $count: "total" }] } },
  ];

  const [agg] = await User.aggregate(pipeline);
  const total = Number(agg?.meta?.[0]?.total || 0);
  res.json({ ok: true, data: agg?.data || [], meta: { total, page, limit } });
});

/*
[PRO] Purpose: Same filters as /customers but returns CSV.
Context: Uses the same aggregation minus pagination; adds CSV escaping.
Edge cases: Empty rows → header only; dates ISO-formatted.
Notes: UTF-8 CSV, client downloads with a predictable filename.
*/
router.get("/customers/export.csv", adminGuard, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const start = parseDate(req.query.start);
  const end = parseDate(req.query.end);
  const minOrders = Math.max(1, Number(req.query.minOrders || 1));
  const deviceTopRaw = String(req.query.deviceTop || "").toLowerCase();
  const deviceTop = DEVICE_TYPES.has(deviceTopRaw) ? deviceTopRaw : "";

  const $match = { role: "user" };
  if (q) {
    $match.$or = [
      { name: { $regex: q, $options: "i" } },
      { fullName: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const pipeline = [
    { $match },
    {
      $lookup: {
        from: "orders",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          ...(start || end
            ? [{ $match: { createdAt: { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) } } }]
            : []),
          { $group: { _id: null, totalOrders: { $sum: 1 }, lastOrderAt: { $max: "$createdAt" } } },
        ],
        as: "ordersAgg",
      },
    },
    {
      $lookup: {
        from: "viewlogs",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $group: { _id: null, totalViews: { $sum: 1 }, lastViewAt: { $max: "$updatedAt" } } },
        ],
        as: "viewsAgg",
      },
    },
    {
      $lookup: {
        from: "loginlogs",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "lastLogin",
      },
    },
    {
      $lookup: {
        from: "loginlogs",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $group: { _id: "$device", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ],
        as: "topDev",
      },
    },
    {
      $addFields: {
        totalOrders: { $ifNull: [{ $arrayElemAt: ["$ordersAgg.totalOrders", 0] }, 0] },
        lastOrderAt: { $arrayElemAt: ["$ordersAgg.lastOrderAt", 0] },
        totalViews: { $ifNull: [{ $arrayElemAt: ["$viewsAgg.totalViews", 0] }, 0] },
        lastViewAt: { $arrayElemAt: ["$viewsAgg.lastViewAt", 0] },
        lastLogin: { $arrayElemAt: ["$lastLogin", 0] },
        topDevice: { $arrayElemAt: ["$topDev._id", 0] },
      },
    },
    { $match: { totalOrders: { $gte: minOrders } } },
    ...(deviceTop ? [{ $match: { topDevice: deviceTop } }] : []),
    {
      $project: {
        name: 1,
        fullName: 1,
        email: 1,
        role: 1,
        avatarUrl: 1,
        createdAt: 1,
        totalOrders: 1,
        lastOrderAt: 1,
        totalViews: 1,
        lastViewAt: 1,
        "lastLogin.createdAt": 1,
        "lastLogin.device": 1,
        "lastLogin.browser": 1,
        "lastLogin.os": 1,
        "lastLogin.location.country": 1,
        "lastLogin.location.region": 1,
        "lastLogin.location.city": 1,
        topDevice: 1,
      },
    },
    { $sort: { lastOrderAt: -1, createdAt: -1 } },
  ];

  const rows = await User.aggregate(pipeline);

  const esc = (s) => {
    const v = s == null ? "" : String(s);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    // CSV RFC4180-style escaping.
  };

  const header = [
    "name","email","role","createdAt",
    "totalOrders","lastOrderAt",
    "totalViews","lastViewAt",
    "lastLoginAt","lastLoginDevice","lastLoginBrowser","lastLoginOS",
    "country","region","city",
    "topDevice",
  ].join(",");

  const lines = rows.map((r) =>
    [
      esc(r.name || r.fullName || ""),
      esc(r.email || ""),
      esc(r.role || ""),
      esc(r.createdAt ? new Date(r.createdAt).toISOString() : ""),
      esc(r.totalOrders ?? 0),
      esc(r.lastOrderAt ? new Date(r.lastOrderAt).toISOString() : ""),
      esc(r.totalViews ?? 0),
      esc(r.lastViewAt ? new Date(r.lastViewAt).toISOString() : ""),
      esc(r.lastLogin?.createdAt ? new Date(r.lastLogin.createdAt).toISOString() : ""),
      esc(r.lastLogin?.device || ""),
      esc(r.lastLogin?.browser || ""),
      esc(r.lastLogin?.os || ""),
      esc(r.lastLogin?.location?.country || ""),
      esc(r.lastLogin?.location?.region || ""),
      esc(r.lastLogin?.location?.city || ""),
      esc(r.topDevice || ""),
    ].join(",")
  );

  const csv = [header, ...lines].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${CSV_FILENAME}`);
  return res.send(csv);
});

/* -------------------- Staff list -------------------- */
/*
[PRO] Purpose: Show staff (role-based or permission-based) with last login.
Context: Filters by name/email; sorts by role and recency.
Edge cases: No matches → empty array; pagination clamped.
Notes: ADMIN_ENTRY_PERMS mirrors routes that grant panel access.
*/
router.get("/staff", adminGuard, async (req, res) => {
  const page = safeInt(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = safeInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const skip = (page - 1) * limit;

  const q = String(req.query.q || "").trim();

  const ADMIN_ENTRY_PERMS = [
    "products:*", "products:write",
    "posts:*", "posts:write", "posts:read", "posts:read:own", "posts:write:own",
    "analytics:view",
    "orders:update",
    "users:read", "users:role:set", "users:permission:set",
    "settings:write",
  ];

  const $match = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { fullName: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const pipeline = [
    { $match },
    {
      $addFields: {
        isAdminRole: { $in: [{ $toLower: "$role" }, ["admin", "manager"]] },
        hasAdminPerm: {
          $gt: [
            {
              $size: {
                $setIntersection: ["$permissions", ADMIN_ENTRY_PERMS],
              },
            },
            0,
          ],
        },
      },
    },
    { $match: { $or: [{ isAdminRole: true }, { hasAdminPerm: true }] } },
    {
      $lookup: {
        from: "loginlogs",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "lastLogin",
      },
    },
    {
      $project: {
        name: 1,
        fullName: 1,
        email: 1,
        role: 1,
        permissions: 1,
        avatarUrl: 1,
        createdAt: 1,
        lastLogin: { $arrayElemAt: ["$lastLogin", 0] },
      },
    },
    { $sort: { role: 1, "lastLogin.createdAt": -1, createdAt: -1 } },
    { $facet: { data: [{ $skip: skip }, { $limit: limit }], meta: [{ $count: "total" }] } },
  ];

  const [agg] = await User.aggregate(pipeline);
  const total = Number(agg?.meta?.[0]?.total || 0);
  res.json({ ok: true, data: agg?.data || [], meta: { total, page, limit } });
});

/* -------------------- Per-user activity -------------------- */
/*
[PRO] Purpose: Compact activity overview for a single user.
Context: Parallel queries for orders, views, last login, and device breakdown.
Edge cases: Invalid id → 400; missing entities → zeros/nulls.
Notes: Computes lastSeenAt as the latest of the three signals.
*/
router.get("/users/:id/activity", adminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

  const [user, ordersAgg, viewsAgg, lastLogin, devicesAgg] = await Promise.all([
    User.findById(id).lean(),
    Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, total: { $sum: 1 }, lastAt: { $max: "$createdAt" } } },
    ]),
    ViewLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, total: { $sum: 1 }, lastAt: { $max: "$updatedAt" } } },
    ]),
    LoginLog.findOne({ userId: id }).sort({ createdAt: -1 }).lean(),
    LoginLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: { device: "$device", os: "$os", browser: "$browser" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const orders = { total: ordersAgg?.[0]?.total || 0, lastAt: ordersAgg?.[0]?.lastAt || null };
  const views = { total: viewsAgg?.[0]?.total || 0, lastAt: viewsAgg?.[0]?.lastAt || null };

  res.json({
    ok: true,
    data: {
      user: user
        ? {
            _id: user._id,
            name: user.name || user.fullName || "",
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          }
        : null,
      orders,
      views,
      lastLogin,
      devices:
        devicesAgg?.map((d) => ({
          device: d._id?.device || "other",
          os: d._id?.os || "",
          browser: d._id?.browser || "",
          count: d.count,
        })) || [],
      lastSeenAt:
        [orders.lastAt, views.lastAt, lastLogin?.createdAt]
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || null,
    },
  });
});

/* -------------------- Activity logs (lists) -------------------- */
router.get("/users/:id/login-logs", adminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });
  const limit = safeInt(req.query.limit, 50, 1, 200);
  const logs = await LoginLog.find({ userId: id }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ ok: true, data: logs });
});

router.get("/users/:id/views", adminGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });
  const limit = safeInt(req.query.limit, 50, 1, 200);
  const views = await ViewLog.find({ userId: id }).sort({ updatedAt: -1 }).limit(limit).lean();
  res.json({ ok: true, data: views });
});

export default router;
