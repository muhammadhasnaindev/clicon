// server/routes/orders.js
// Orders routes (customer + admin).
// Summary: Adds order-scoped product reviews, delivery confirm alias, and structured guards.


import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import {
  requireAuth,
  requireVerified,
  requireRole,
  requirePermission,
  maybeAuth,
} from "../middleware/auth.js";

// models used by review endpoints
import Product from "../models/Product.js";
import Review from "../models/Review.js";

const router = express.Router();

/*
[PRO] Purpose: Small helpers for numeric coercion, coupon math, and card brand.
Context: Keep request handlers concise and consistent.
Edge cases: Non-finite numbers; unknown coupon codes; partial card inputs.
Notes: Fixed demo coupons; brand detection is best-effort for display only.
*/
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const COUPONS = {
  SAVE24: { type: "fixed", amount: 24 },
  OFF10: { type: "percent", amount: 10 },
};
const discountOf = (sub, code) => {
  if (!code) return 0;
  const r = COUPONS[String(code).toUpperCase()];
  if (!r) return 0;
  return r.type === "fixed" ? Math.min(r.amount, sub) : Math.floor((sub * r.amount) / 100);
};
const brandFromNumber = (n = "") => {
  const s = String(n).replace(/\s|-/g, "");
  if (/^4\d{6,}$/.test(s)) return "visa";
  if (/^(5[1-5]|2[2-7])\d{4,}$/.test(s)) return "mastercard";
  if (/^3[47]\d{5,}$/.test(s)) return "amex";
  return "card";
};

/*
[PRO] Purpose: Review utilities: clamp rating and refresh product aggregates.
Context: Ensure stored ratings stay in 1–5 and product caches stay accurate.
Edge cases: No reviews → rating=0, numReviews=0.
Notes: Aggregation uses productId match; updates are idempotent.
*/
const clampRating = (n) => Math.max(1, Math.min(5, Number(n || 5)));
async function recomputeProductRating(productId) {
  const pid = new mongoose.Types.ObjectId(productId);
  const agg = await Review.aggregate([
    { $match: { productId: pid } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const a = agg[0] || { avg: 0, count: 0 };
  await Product.updateOne(
    { _id: pid },
    { $set: { rating: Number((a.avg || 0).toFixed(2)), numReviews: a.count || 0 } }
  );
}

/* --------------------------------------------------------------------------
   USER / GUEST: create order (dummy checkout)
   POST /api/orders/checkout-demo
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Minimal demo checkout for local/testing flows.
Context: Accepts line items, computes base totals, persists an Order document.
Edge cases: Missing productId allowed (falls back to slug); COD stays pending.
Notes: Payment fields are demo-only; status timeline documents changes.
*/
router.post("/checkout-demo", maybeAuth, async (req, res) => {
  try {
    const body = req.body || {};

    const items = Array.isArray(body.lines)
      ? body.lines.map((l) => {
          const qty = Math.max(1, num(l.qty, 1));
          const unit = Math.max(0, num(l.unitPriceBase, l.priceBase));
          return {
            productId:
              l.productId && mongoose.Types.ObjectId.isValid(l.productId) ? l.productId : undefined,
            slug: l.slug || l.id || "",
            category: l.category || "",
            title: l.title || "Untitled",
            image: l.image || "",
            qty,
            unitPriceBase: unit,
            subtotalBase: qty * unit,
          };
        })
      : [];

    const subtotalBase = items.reduce((s, i) => s + num(i.subtotalBase, 0), 0);
    const discountBase = discountOf(subtotalBase, body?.totalsBase?.coupon || body?.coupon);
    const shippingBase = 0; // Free (demo)
    const taxBase = subtotalBase > 0 ? 61.99 : 0; // demo tax
    const totalBase = Math.max(0, subtotalBase - discountBase + shippingBase + taxBase);

    const billing = body.customer?.address || {};
    const addr = {
      line1: billing.line1 || body.customer?.address || "",
      line2: billing.line2 || "",
      city: billing.city || "",
      state: billing.state || "",
      zip: billing.zip || "",
      country: billing.country || "",
    };

    const pm = String(body.paymentMethod || "demo");
    const last4 = String(body.card?.last4 || body.cardNumber || "")
      .replace(/\s|-/g, "")
      .slice(-4);
    const brand = body.card?.brand || brandFromNumber(body.cardNumber);
    const payment = {
      method: pm,
      status: pm === "cod" ? "pending" : "paid",
      brand,
      last4: last4 || undefined,
      txnId: `DEMO-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    };

    const now = new Date();
    const order = await Order.create({
      userId: req.userId || undefined,
      items,
      customer: {
        firstName: body.customer?.firstName || "",
        lastName: body.customer?.lastName || "",
        email: body.customer?.email || "",
        phone: body.customer?.phone || "",
        company: body.customer?.company || "",
      },
      billingAddress: addr,
      shippingAddress:
        body.shippingSameAsBilling === false ? body.shippingAddress || addr : addr,
      shippingSameAsBilling: body.shippingSameAsBilling !== false,
      payment,
      totals: { subtotalBase, discountBase, shippingBase, taxBase, totalBase, currency: "USD" },
      status: pm === "cod" ? "pending" : "in progress",
      stage: "created",
      notes: body.notes || "",
      statusTimeline: [
        { code: "created", note: "Order created", at: now },
        {
          code: pm === "cod" ? "pending" : "paid",
          note: pm === "cod" ? "Cash on delivery" : "Demo payment",
          at: now,
        },
      ],
    });

    return res.status(201).json({ ok: true, data: order });
  } catch (err) {
    console.error("POST /orders/checkout-demo error:", err);
    return res.status(500).json({ message: "Failed to create order" });
  }
});

/* --------------------------------------------------------------------------
   PUBLIC: track by id + email
   POST /api/orders/track { orderId, email }
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Allow guests to check order status without auth.
Context: Matches order by id and case-insensitive customer email.
Edge cases: Invalid id; not found; email required.
Notes: Returns lean order document; no PII beyond what customer provided.
*/
router.post("/track", async (req, res) => {
  try {
    const { orderId, email } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(orderId || "")) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    const e = String(email || "").trim().toLowerCase();
    if (!e) return res.status(400).json({ message: "Email required" });

    const order = await Order.findOne({
      _id: orderId,
      "customer.email": new RegExp(`^${e}$`, "i"),
    }).lean();

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res.json({ ok: true, data: order });
  } catch (err) {
    console.error("POST /orders/track error:", err);
    res.status(500).json({ message: "Failed to track order" });
  }
});

/* --------------------------------------------------------------------------
   USER: list own orders
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Paginated list of a user’s own orders.
Context: Requires auth + verified; sorted newest first.
Edge cases: Page/limit clamped; empty set returns ok with meta.
Notes: Lean reads for response speed.
*/
router.get("/", requireAuth, requireVerified, async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const q = { userId: req.user._id };
  const [data, total] = await Promise.all([
    Order.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(q),
  ]);

  res.json({ ok: true, data, meta: { total, page, limit } });
});

/* --------------------------------------------------------------------------
   USER: get single own order
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Fetch one order that belongs to the caller.
Context: Verifies id and ownership, returns 404 if not found.
Edge cases: Invalid id → 400; not your order → 404.
Notes: Lean read; no writes here.
*/
router.get("/:id", requireAuth, requireVerified, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid id" });
  const order = await Order.findOne({ _id: id, userId: req.user._id }).lean();
  if (!order) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true, data: order });
});

/* --------------------------------------------------------------------------
   USER: cancel own order
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Let the customer cancel their order.
Context: Marks status, stamps cancelledAt, and appends timeline note.
Edge cases: Ownership required; invalid id; missing order.
Notes: Does not enforce stage checks; keep business rules on admin side.
*/
router.post("/:id/cancel", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid id" });
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: "Not found" });
  if (String(o.userId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });

  o.status = "cancelled";
  o.cancelledAt = new Date();
  o.statusTimeline.push({
    code: "cancelled",
    note: "Order has been cancelled by customer.",
    at: new Date(),
  });
  await o.save();
  res.json({ ok: true, data: o });
});

/* --------------------------------------------------------------------------
   USER: confirm delivery (+ alias)
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Let the customer mark delivery, completing the order.
Context: Sets stage/status and stamps deliveredAt; notes the timeline.
Edge cases: Ownership required; invalid id; missing order.
Notes: Alias /:id/confirm rewrites internally to /confirm-delivery.
*/
router.post("/:id/confirm-delivery", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid id" });
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: "Not found" });
  if (String(o.userId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });

  o.stage = "delivered";
  o.status = "completed";
  o.deliveredAt = new Date();
  o.statusTimeline.push({
    code: "delivered",
    note: "Order marked delivered by customer.",
    at: new Date(),
  });
  await o.save();
  res.json({ ok: true, data: o });
});

router.post("/:id/confirm", requireAuth, async (req, res) => {
  req.params.id && (req.url = req.url.replace("/confirm", "/confirm-delivery"));
  return router.handle(req, res);
});

/* --------------------------------------------------------------------------
   USER: limited update (cancel only)
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Backward-compat path to cancel via PUT.
Context: Supports legacy clients sending { status: "cancelled" }.
Edge cases: Ownership required; other statuses rejected with 400.
Notes: Prefer POST /:id/cancel going forward.
*/
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid id" });
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: "Not found" });
  if (String(o.userId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });

  if (status === "cancelled") {
    o.status = "cancelled";
    o.cancelledAt = new Date();
    o.statusTimeline.push({
      code: "cancelled",
      note: "Order has been cancelled by customer.",
      at: new Date(),
    });
    await o.save();
    return res.json({ ok: true, data: o });
  }
  return res.status(400).json({ message: "Unsupported update" });
});

/* --------------------------------------------------------------------------
   ADMIN/MANAGER: update STATUS
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Admin/Manager can set status with timeline note.
Context: Validates status; stamps delivered/cancelled timestamps.
Edge cases: Invalid id/status; missing order.
Notes: Require both role and permission to lower abuse risk.
*/
router.put(
  "/:id/status",
  requireAuth,
  requireVerified,
  requireRole(["admin", "manager"]),
  requirePermission("orders:update"),
  async (req, res) => {
    const { id } = req.params;
    let { status } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    status = String(status || "").toLowerCase();
    if (!["pending", "in progress", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: "Not found" });

    o.status = status;
    if (status === "completed") o.deliveredAt = new Date();
    if (status === "cancelled") o.cancelledAt = new Date();

    o.statusTimeline.push({
      code: status,
      note:
        status === "pending"
          ? "Order marked Pending."
          : status === "in progress"
          ? "Order moved In Progress."
          : status === "completed"
          ? "Order marked Completed."
          : "Order has been Cancelled.",
      at: new Date(),
    });

    await o.save();
    res.json({ ok: true, data: o });
  }
);

/* --------------------------------------------------------------------------
   ADMIN/MANAGER: update STAGE
--------------------------------------------------------------------------- */
/*
[PRO] Purpose: Admin/Manager can move order through operational stages.
Context: Normalizes "packing" → "packaging"; updates shipped/delivered stamps.
Edge cases: Invalid id/stage; missing order.
Notes: Completing delivery also flips status to "completed".
*/
router.put(
  "/:id/stage",
  requireAuth,
  requireVerified,
  requireRole(["admin", "manager"]),
  requirePermission("orders:update"),
  async (req, res) => {
    const { id } = req.params;
    let { stage } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    stage = String(stage || "").toLowerCase();
    if (stage === "packing") stage = "packaging";
    if (!["created", "packaging", "shipped", "delivered"].includes(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: "Not found" });

    o.stage = stage;
    if (stage === "shipped") o.shippedAt = new Date();
    if (stage === "delivered") {
      o.deliveredAt = new Date();
      o.status = "completed";
    }

    o.statusTimeline.push({
      code: stage,
      note:
        stage === "created"
          ? "Order has been created."
          : stage === "packaging"
          ? "Order is in Packaging."
          : stage === "shipped"
          ? "Order has been Shipped."
          : "Order has been Delivered.",
      at: new Date(),
    });

    await o.save();
    res.json({ ok: true, data: o });
  }
);

/* ======================= ORDER-SCOPED REVIEWS =======================
   GET  /api/orders/:orderId/reviews
   POST /api/orders/:orderId/reviews
   Accepts:
     - { productId, rating, comment }                 // single
     - { items: [{ productId, rating, comment }] }    // multi
   Validates ownership & that productId exists in order items.
   Upserts per (userId, orderId, productId). Refreshes product caches.
===================================================================== */
/*
[PRO] Purpose: Allow customers to rate/comment products they bought.
Context: Ties reviews to both order and product to prevent abuse.
Edge cases: Product not in order → ignored; empty payload → 400.
Notes: After writes, product aggregates are recomputed.
*/
router.get("/:orderId/reviews", requireAuth, async (req, res) => {
  const { orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const order = await Order.findOne({ _id: orderId, userId: req.user._id }).lean();
  if (!order) return res.status(404).json({ message: "Order not found" });

  const rows = await Review.find({ orderId, userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ ok: true, data: rows });
});

/*
[PRO] Purpose: Upsert reviews for items within the given order.
Context: Supports both single and batch payloads; validates membership.
Edge cases: No valid items → 400; invalid ids ignored; rating clamped 1–5.
Notes: Upsert ensures idempotency; aggregates recomputed per touched product.
*/
router.post("/:orderId/reviews", requireAuth, async (req, res) => {
  const { orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const order = await Order.findOne({ _id: orderId, userId: req.user._id }).lean();
  if (!order) return res.status(404).json({ message: "Order not found" });

  const allowedProductIds = new Set(
    (order.items || [])
      .map((it) => it.productId || it.product?._id)
      .filter((x) => mongoose.Types.ObjectId.isValid(x))
      .map((x) => String(x))
  );

  const incoming = Array.isArray(req.body?.items)
    ? req.body.items
    : req.body?.productId
    ? [{ productId: req.body.productId, rating: req.body.rating, comment: req.body.comment }]
    : [];

  if (!incoming.length) {
    return res.status(400).json({ message: "No review items provided" });
  }

  const ops = [];
  const touched = new Set();

  for (const it of incoming) {
    const raw = it?.productId;
    if (!mongoose.Types.ObjectId.isValid(raw)) continue;

    const pidStr = String(raw);
    if (!allowedProductIds.has(pidStr)) {
      continue; // only allow products that belong to this order
    }

    const filter = {
      userId: req.user._id,
      orderId: new mongoose.Types.ObjectId(orderId),
      productId: new mongoose.Types.ObjectId(pidStr),
    };
    const update = {
      $set: {
        rating: clampRating(it?.rating),
        comment: (it?.comment || "").trim(),
      },
    };

    ops.push(Review.updateOne(filter, update, { upsert: true }));
    touched.add(pidStr);
  }

  if (!ops.length) {
    return res.status(400).json({ message: "No valid review items (product not in order)" });
  }

  await Promise.all(ops);
  await Promise.all([...touched].map((pid) => recomputeProductRating(pid)));

  return res.json({ ok: true });
});

export default router;
