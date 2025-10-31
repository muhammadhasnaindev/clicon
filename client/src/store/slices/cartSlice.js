// client/src/store/slices/cartSlice.js
/**
 * Cart slice: normalized lines + totals with coupon validation

 */

import { createSlice, createAsyncThunk, createSelector, nanoid } from "@reduxjs/toolkit";

/** Normalized line:
 * { lineId, id, productId, title, image, priceBase, qty, subtotalBase, compareAtBase?, variantKey? }
 */
const ns = "cart";

/* ============================ Config Constants ============================ */
const TAX_FLAT_BASE = 61.99;   // PRO: demo-only; surfaced as a constant to avoid magic number drift
const SHIPPING_BASE = 0;       // PRO: demo-only; future logic can switch to dynamic shipping rules

/* ============================ State ============================ */
const initialState = {
  items: [],
  // coupon: null | { code, discountBase, meta?, invalid?, reason?, pending? }
  coupon: null,
  updatedAt: 0, // force UI recompute
};

/* ============================ Helpers ============================ */
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const resolvePriceBase = (obj) =>
  num(
    obj?.priceBase ??
      obj?.price?.base ??
      obj?.price?.current ??
      obj?.price ??
      obj?.unitPrice,
    0
  );

// deterministic line id (stable across renders)
const makeLineId = (productId, priceBase, variantKey = "") =>
  `line:${String(productId || "unknown")}|${String(variantKey)}|${num(priceBase, 0)}`;

/** NEW LOGIC: ensure variantKey is a stable string in normalizer
 * PRO: avoids accidental object/string mismatch when deduping cart lines across different sources.
 */
const normalizeLine = (l) => {
  const productId =
    l?.productId || l?._id || l?.pid || l?.sku || l?.slug || l?.id || "";
  const variantKeyRaw =
    l?.variantKey ||
    l?.variant_id ||
    l?.variantId ||
    l?.variant?.id ||
    l?.variant?.sku ||
    "";
  const variantKey = String(variantKeyRaw || "");
  const priceBase = resolvePriceBase(l);
  const lineId = l?.lineId || l?.id || makeLineId(productId, priceBase, variantKey);

  const title = l?.title || l?.name || "Untitled";
  const image =
    l?.image ||
    l?.img ||
    (Array.isArray(l?.images) ? l.images[0] : "") ||
    "/uploads/placeholder.png";
  const qty = Math.max(1, num(l?.qty ?? l?.quantity, 1));
  const compareAtBase = num(l?.compareAtBase ?? l?.price?.old, 0);

  return {
    ...l,
    lineId,
    id: lineId, // many UIs use `id`
    productId,
    variantKey,
    title,
    image,
    priceBase,
    compareAtBase,
    qty,
    subtotalBase: priceBase * qty,
  };
};

const keyOf = (payload) =>
  typeof payload === "string" ? payload : payload?.id ?? payload?.lineId;

const calcSubtotal = (items) =>
  items.reduce((s, i) => s + Number(i.priceBase || 0) * Number(i.qty || 1), 0);

/* ============================ Coupon (server validate) ============================ */
/** NEW LOGIC: tolerant JSON parsing + explicit HTTP_FAIL reason
 * PRO: some servers may send HTML/text errors; we keep UX stable and avoid throwing into rejected.
 */
// Thunk: validate coupon on server using current cart
export const applyCoupon = createAsyncThunk(`${ns}/applyCoupon`, async (code, { getState }) => {
  const state = getState();
  const items = state[ns]?.items || [];
  const lines = items.map((i) => ({
    productId: i.productId || i.id, // support either field
    qty: i.qty || 1,
    priceBase: i.priceBase || 0,
  }));

  try {
    const resp = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code, lines }),
      credentials: "include",
    });
    let data = null;
    try {
      data = await resp.json();
    } catch {
      // NEW LOGIC: non-JSON response
      data = { ok: false, discountBase: 0, reason: "HTTP_FAIL" };
    }
    return { code, result: data };
  } catch {
    // network failure — treat as invalid
    return { code, result: { ok: false, discountBase: 0, reason: "NETWORK" } };
  }
});

/* ============================ Slice ============================ */
const slice = createSlice({
  name: ns,
  initialState,
  reducers: {
    /* ---- Add / Update / Remove ---- */
    addItem: {
      // Accepts a product or ready-made line parts
      prepare(product, qty = 1) {
        const { _id, id, slug, title, name, images, image, price } = product || {};
        const productId = _id || id || slug || nanoid();
        const priceBase =
          typeof price === "number"
            ? price
            : typeof price?.current === "number"
            ? price.current
            : 0;

        const variantKey =
          String(
            product?.variantKey ||
            product?.variant?.id ||
            product?.variant?.sku ||
            ""
          );

        const lineId = makeLineId(productId, priceBase, variantKey);

        return {
          payload: {
            lineId,
            product: {
              productId,
              title: title || name || "Untitled",
              image: Array.isArray(images) ? images[0] : image || "",
              priceBase,
              compareAtBase: num(price?.old, 0),
              qty: Number(qty) || 1,
              variantKey,
            },
          },
        };
      },
      reducer(state, action) {
        const { productId, priceBase, variantKey, qty } = action.payload.product;
        const existing = state.items.find(
          (i) =>
            i.productId === productId &&
            num(i.priceBase) === num(priceBase) &&
            (i.variantKey || "") === (variantKey || "")
        );
        if (existing) {
          existing.qty += qty;
        } else {
          state.items.push({
            lineId: action.payload.lineId,
            id: action.payload.lineId,
            ...action.payload.product,
          });
        }
        state.updatedAt = Date.now();
      },
    },

    setItems(state, action) {
      // Replace with a normalized list
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      state.items = incoming.map(normalizeLine);
      state.updatedAt = Date.now();
    },

    updateQty(state, action) {
      const key = keyOf(action.payload);
      const qty = num(action.payload?.qty, 1);
      if (!key) return;
      const line = state.items.find((i) => (i.lineId || i.id) === key);
      if (!line) return;
      line.qty = Math.max(1, qty);
      state.updatedAt = Date.now();
    },

    removeItem(state, action) {
      const key = keyOf(action.payload);
      if (!key) return;
      state.items = state.items.filter((i) => (i.lineId || i.id) !== key);
      state.updatedAt = Date.now();
    },

    clear(state) {
      state.items = [];
      state.coupon = null;
      state.updatedAt = Date.now();
    },

    hydrate(state, action) {
      const incoming = action.payload;
      if (incoming && Array.isArray(incoming.items)) {
        state.items = incoming.items.map((raw) => {
          const n = normalizeLine(raw);
          return {
            ...raw,
            lineId: n.lineId,
            id: n.lineId,
            productId: n.productId,
            variantKey: n.variantKey,
            priceBase: n.priceBase,
            compareAtBase: n.compareAtBase,
            qty: n.qty,
          };
        });
      }
      // preserve legacy coupon formats (string -> object)
      const c = incoming?.coupon;
      if (typeof c === "string" && c) {
        state.coupon = { code: c, discountBase: 0 };
      } else if (c && typeof c === "object") {
        state.coupon = c;
      }
      state.updatedAt = num(incoming?.updatedAt, Date.now());
    },

    // Optional: manually set/clear coupon without server (e.g., when removing)
    clearCoupon(state) {
      state.coupon = null;
      state.updatedAt = Date.now();
    },

    // UI nudge: bump timestamp so selectors recompute / components re-render
    refreshCart(state) {
      state.updatedAt = Date.now();
    },

    checkoutStart() {}, // hook for side-effects if needed
  },

  extraReducers: (builder) => {
    builder
      .addCase(applyCoupon.pending, (state, action) => {
        const code = String(action.meta?.arg || "").trim().toUpperCase();
        state.coupon = { code, discountBase: 0, pending: true };
        state.updatedAt = Date.now();
      })
      .addCase(applyCoupon.fulfilled, (state, action) => {
        const { code, result } = action.payload || {};
        if (result?.ok && Number(result?.discountBase) > 0) {
          state.coupon = {
            code: String(code || "").toUpperCase(),
            discountBase: Number(result.discountBase),
            meta: result.coupon || null,
          };
        } else {
          // invalid or no discount
          state.coupon = {
            code: String(code || "").toUpperCase(),
            discountBase: 0,
            invalid: true,
            reason: result?.reason || "INVALID",
          };
        }
        state.updatedAt = Date.now();
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        const code = String(action.meta?.arg || "").trim().toUpperCase();
        state.coupon = { code, discountBase: 0, invalid: true, reason: "REJECTED" };
        state.updatedAt = Date.now();
      });
  },
});

export const {
  addItem,
  setItems,
  updateQty,
  removeItem,
  clear,
  hydrate,
  clearCoupon,
  refreshCart,
  checkoutStart,
} = slice.actions;

export default slice.reducer;

/* ============================ Selectors ============================ */
/** Root cart slice or initialState as fallback. */
const selectCart = (s) => s[ns] || initialState;
/** Raw cart items (possibly legacy-shaped). */
export const selectCartItems = (s) => selectCart(s).items || [];
/** Always normalize on read to be defensive with persisted/legacy data. */
export const selectCartItemsNormalized = createSelector(selectCartItems, (items) =>
  (items || []).map(normalizeLine)
);
/** Total item count (qty sum). */
export const selectCartCount = createSelector(selectCartItemsNormalized, (lines) =>
  lines.reduce((n, i) => n + (i.qty || 0), 0)
);
/** Subtotal in base currency (pre-discount). */
export const selectCartSubtotalBase = createSelector(selectCartItemsNormalized, (lines) =>
  lines.reduce((sum, i) => sum + Number(i.subtotalBase || 0), 0)
);
/** NEW LOGIC: use named constants for tax and shipping
 * PRO: single place to switch to dynamic shipment/tax modules later.
 */
export const selectCartTotalsBase = createSelector(
  selectCartItemsNormalized,
  selectCart,
  (lines, c) => {
    const subtotalBase = calcSubtotal(lines);
    const discountBase = c?.coupon?.discountBase ? Number(c.coupon.discountBase) : 0;
    const shippingBase = SHIPPING_BASE;
    const taxBase = subtotalBase > 0 ? TAX_FLAT_BASE : 0;
    const totalBase = Math.max(0, subtotalBase - discountBase + shippingBase + taxBase);
    return {
      subtotalBase,
      discountBase,
      shippingBase,
      taxBase,
      totalBase,
      coupon: c.coupon, // object { code, ... } (truthy means "has coupon")
    };
  }
);
