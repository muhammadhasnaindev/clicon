// src/pages/8/ProductDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Grid,
  Typography,
  Rating,
  Chip,
  Button,
  IconButton,
  Divider,
  Select,
  MenuItem,
  Tabs,
  Tab,
  TextField,
  Avatar,
  Snackbar,
  Alert,
  Tooltip,
  Menu,
} from "@mui/material";

import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../store/slices/cartSlice";
import { addToWishlist } from "../store/slices/wishlistSlice";
import { addToCompare } from "../store/slices/compareSlice";
import { selectCurrency, selectRates } from "../store/slices/settingsSlice";
import { convert, formatMoney } from "../utils/money";
import { assetUrl } from "../utils/asset";

import {
  useGetProductQuery,
  useTrackViewMutation,
  useGetProductReviewsQuery,
  useAddProductReviewMutation,
  useMeQuery,
  useGetHomeSectionsQuery,
} from "../store/api/apiSlice";

import FlashSaleToday from "../features/home/FlashSaleToday";

/** -------------------- Theme tokens / constants -------------------- */
const BLUE = "#1B6392";
const ORANGE = "#FA8232";
const GREEN = "#20C997";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";

// sizes / durations
const IMAGE_HEIGHT_XS = 280;
const IMAGE_HEIGHT_MD = 440;
const THUMB_SIZE = 68;
const QTY_BTN_SIZE = 40;
const TOAST_DURATION = 1600;
const COPY_TOAST_DURATION = 1800;

/** --------------------- attribute helpers --------------------- */
const DEFAULT_ORDER = [
  "color",
  "size",
  "memory",
  "storage",
  "carrier",
  "band",
  "caseSize",
  "kit",
  "bundle",
  "length",
  "refresh",
  "connectivity",
  "pack",
];

const labelOf = (k) =>
  ({
    color: "Color",
    size: "Size",
    memory: "Memory",
    storage: "Storage",
    carrier: "Carrier",
    band: "Band",
    caseSize: "Case Size",
    kit: "Kit",
    bundle: "Bundle",
    length: "Length",
    refresh: "Refresh Rate",
    connectivity: "Connectivity",
    pack: "Pack Size",
  }[k] || (k ? k[0].toUpperCase() + k.slice(1) : ""));

const sorted = (arr) =>
  [...arr].sort((a, b) => {
    const ao = a.uiOrder ?? DEFAULT_ORDER.indexOf(a.key);
    const bo = b.uiOrder ?? DEFAULT_ORDER.indexOf(b.key);
    return (ao === -1 ? 999 : ao) - (bo === -1 ? 999 : bo);
  });

function deriveAttributes(p = {}) {
  const attrs = [];

  if (Array.isArray(p?.attributes) && p.attributes.length) {
    p.attributes.forEach((a) =>
      attrs.push({
        ...a,
        label: a.label || labelOf(a.key),
        kind: a.kind || (a.key === "color" ? "swatch" : "select"),
        values: a.values || [],
        required: !!a.required,
      })
    );
  }
  if (Array.isArray(p?.colors) && p.colors.length)
    attrs.push({ key: "color", label: "Color", kind: "swatch", values: p.colors, required: false });
  if (Array.isArray(p?.size) && p.size.length)
    attrs.push({ key: "size", label: "Size", kind: "select", values: p.size, required: true });
  if (Array.isArray(p?.memory) && p.memory.length)
    attrs.push({ key: "memory", label: "Memory", kind: "select", values: p.memory, required: true });
  if (Array.isArray(p?.storage) && p.storage.length)
    attrs.push({ key: "storage", label: "Storage", kind: "select", values: p.storage, required: true });

  return sorted(attrs).map((a) => ({ ...a, label: a.label || labelOf(a.key) }));
}

const variantKey = (sel) =>
  Object.entries(sel)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join("|");

/**
 * PRO (pricing adjustments): compute bumped price based on selected attributes.
 * NEW LOGIC: Only show discount when `old > currVal` to avoid negative badges.
 */
function priceFor(product = {}, sel, currency, rates) {
  const base = Number(product?.basePrice ?? product?.price?.current ?? product?.price ?? 0);
  const adj = product?.adjustments || {};
  let bump = 0;
  for (const [k, v] of Object.entries(sel)) {
    if (!v) continue;
    const add = adj[k]?.[v];
    if (add) bump += Number(add) || 0;
  }
  const currVal = base + bump;
  const old = Number(product?.oldPrice ?? product?.price?.old ?? 0);

  const price = formatMoney(convert(currVal, rates, currency), currency);
  const oldDisplay = old > 0 ? formatMoney(convert(old, rates, currency), currency) : null;

  // NEW LOGIC: show pct only when there's a real discount
  const discountPct = old > currVal ? Math.round(((old - currVal) / old) * 100) : null;

  return { currVal, price, oldDisplay, discountPct };
}

/* --------- Specification helpers (always show something) ---------- */
const isNonEmptyObject = (o) => o && typeof o === "object" && Object.keys(o).length > 0;

function buildSpecs(product, attributes, sel) {
  const base = {};

  // 1) Backend-provided specs
  if (isNonEmptyObject(product?.specs)) {
    Object.entries(product.specs).forEach(([k, v]) => {
      if (v != null && v !== "") base[k] = v;
    });
  }

  // 2) Basics
  if (product?.brand && !base.Brand) base.Brand = product.brand;
  if (product?.sku && !base.SKU) base.SKU = product.sku;
  if (product?.category && !base.Category) base.Category = product.category;

  // 3) Attributes (selected → value; otherwise list)
  (attributes || []).forEach((a) => {
    const key = labelOf(a.key);
    if (base[key]) return;
    const selected = sel?.[a.key];
    if (selected) base[key] = String(selected);
    else if (Array.isArray(a.values) && a.values.length) base[key] = a.values.join(", ");
  });

  return base;
}

/**
 * ProductDetail component
 * @returns {JSX.Element}
 */
export default function ProductDetail() {
  const { idOrSlug } = useParams();

  // hooks
  const { data, isLoading, isError } = useGetProductQuery(idOrSlug);
  const { data: me } = useMeQuery();
  const [trackView] = useTrackViewMutation();
  const { data: revData, refetch: refetchReviews } = useGetProductReviewsQuery(idOrSlug);
  const [addReview, { isLoading: posting }] = useAddProductReviewMutation();
  const { data: homeSections, isLoading: homeLoading } = useGetHomeSectionsQuery();

  const dispatch = useDispatch();
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);

  const [tab, setTab] = useState(0);
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [wished, setWished] = useState(false);
  const [compared, setCompared] = useState(false);
  const [toast, setToast] = useState("");

  // share state (align with Quick View)
  const [anchorShare, setAnchorShare] = useState(null);
  const [copied, setCopied] = useState(false);

  const product = data?.data || data;
  const isReady = !!product;

  // gallery
  const images = useMemo(() => {
    const arr = (product?.images && product.images.length ? product.images : [product?.image]).filter(Boolean);
    return arr.map(assetUrl);
  }, [product]);

  const [img, setImg] = useState("");
  useEffect(() => {
    setImg(images[0] || "");
  }, [images]);

  /**
   * PRO: Gallery navigation
   * NEW LOGIC: If fewer than 2 images, do nothing (prevents modulo with 0/1).
   */
  const prev = () => {
    if (!images || images.length < 2) return; // NEW LOGIC
    setImg((v) => images[(images.indexOf(v) - 1 + images.length) % images.length]);
  };
  const next = () => {
    if (!images || images.length < 2) return; // NEW LOGIC
    setImg((v) => images[(images.indexOf(v) + 1) % images.length]);
  };

  // attributes
  const attributes = useMemo(() => deriveAttributes(product), [product]);
  const defaultSel = useMemo(() => {
    const s = {};
    attributes.forEach((a) => {
      s[a.key] = a.kind === "swatch" ? a.values?.[0] ?? "" : a.required ? a.values?.[0] ?? "" : "";
    });
    return s;
  }, [attributes]);
  const [sel, setSel] = useState(defaultSel);
  useEffect(() => setSel((prev) => ({ ...defaultSel, ...prev })), [defaultSel]);

  // price
  const { currVal, price, oldDisplay, discountPct } = useMemo(
    () => priceFor(product, sel, currency, rates),
    [product, sel, currency, rates]
  );

  // ids + helpers
  const id = product?._id || product?.id || product?.slug || product?.sku;
  const showImg = img || images[0] || product?.image || "";
  const reviews = revData?.data || [];
  const ratingValueRaw =
    product?.ratingAverage ?? product?.avgRating ?? product?.rating?.average ?? product?.rating ?? 0;
  const ratingValue = Number.isFinite(Number(ratingValueRaw)) ? Math.max(0, Math.min(5, Number(ratingValueRaw))) : 0; // clamp 0..5
  const ratingCount = Number(
    product?.numReviews ?? product?.reviewsCount ?? product?.rating?.count ?? 0
  );

  // track view (fire-and-forget; backend dedupes)
  useEffect(() => {
    try {
      trackView(idOrSlug).catch(() => {});
    } catch {}
  }, [idOrSlug, trackView]);

  // related groups
  const relatedBase = useMemo(
    () =>
      product?.relatedProducts ||
      product?.related ||
      product?.similar ||
      product?.recommendations ||
      product?.upsell ||
      product?.crossSell ||
      product?.alsoBought ||
      [],
    [product]
  );

  const relatedGroups = useMemo(() => {
    const L = Array.isArray(relatedBase) ? relatedBase : [];
    if (!L.length) return { flashSale: [], bestSellers: [], topRated: [], newArrival: [] };
    const take = (s) => (L.slice(s, s + 3).length ? L.slice(s, s + 3) : L.slice(0, Math.min(3, L.length)));
    return { flashSale: take(0), bestSellers: take(3), topRated: take(6), newArrival: take(9) };
  }, [relatedBase]);

  const homeGroups = homeSections?.flash || { flashSale: [], bestSellers: [], topRated: [], newArrival: [] };
  const hasAny = (g) => !!(g?.flashSale?.length || g?.bestSellers?.length || g?.topRated?.length || g?.newArrival?.length);
  const groupsToUse = hasAny(relatedGroups) ? relatedGroups : homeGroups;
  const showFlash = hasAny(groupsToUse);

  // specs (never empty)
  const specsToShow = useMemo(
    () => buildSpecs(product || {}, attributes, sel),
    [product, attributes, sel]
  );

  // early render states
  if (isLoading) return <Box sx={{ p: 3 }}>Loading…</Box>;
  if (isError || !product) return <Box sx={{ p: 3 }}>Product not found.</Box>;

  // qty helpers
  const stock = Number.isFinite(Number(product?.stock)) ? Number(product.stock) : undefined;
  const clampQty = (n) => {
    const safe = Math.max(1, Math.floor(n));
    if (typeof stock === "number" && stock > 0) return Math.min(safe, stock);
    return safe;
  };

  /**
   * PRO: Qty controls
   * NEW LOGIC: Respect `stock` when available, clamp to [1..stock].
   */
  const inc = () => setQty((q) => clampQty(q + 1));
  const dec = () => setQty((q) => clampQty(q - 1));

  const addToCart = (q) => {
    const finalQty = clampQty(q);
    dispatch(
      addItem(
        { id, title: product.title, image: showImg, price: currVal, variantKey: variantKey(sel) },
        finalQty
      )
    );
  };
  const handleBuyNow = () => {
    addToCart(1);
    if (typeof window !== "undefined") {
      window.location.href = "/shopping-cart";
    }
  };

  const doWishlist = () => {
    dispatch(addToWishlist({ id, title: product.title, image: showImg, price: currVal }));
    setWished(true);
    setToast("Added to Wishlist");
  };
  const doCompare = () => {
    dispatch(
      addToCompare({
        _id: id,
        id,
        title: product.title,
        images: [showImg],
        image: showImg,
        price: product.price || { current: currVal, old: product.price?.old ?? null },
        brand: product.brand,
        rating: product.rating,
        numReviews: product.numReviews,
        specs: sel,
      })
    );
    setCompared(true);
    setToast("Added to Compare");
  };

  /**
   * PRO: Post review
   * Keep messages user-safe; backend errors bubble as fallback text.
   */
  const handlePostReview = async () => {
    if (!me?._id) {
      setToast("Please sign in to post a review");
      return;
    }
    // Optional light validation (no change in backend behavior)
    if (!comment.trim()) {
      setToast("Please write a short comment.");
      return;
    }
    try {
      await addReview({ idOrSlug, rating, comment }).unwrap();
      setRating(5);
      setComment("");
      await refetchReviews();
      setToast("Review posted");
    } catch (e) {
      setToast(e?.data?.message || "Failed to post review");
    }
  };

  // helpers
  const fmtMoney = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  // features & shipping with defaults
  const featureItems =
    Array.isArray(product?.features) && product.features.length
      ? product.features.slice(0, 5).map((t, i) => ({
          icon:
            [WorkspacePremiumOutlinedIcon, LocalShippingOutlinedIcon, AutorenewOutlinedIcon, SupportAgentOutlinedIcon, LockOutlinedIcon][i] ||
            WorkspacePremiumOutlinedIcon,
          text: t,
        }))
      : [
          { icon: WorkspacePremiumOutlinedIcon, text: "Free 1 Year Warranty" },
          { icon: LocalShippingOutlinedIcon, text: "Free Shipping & Fasted Delivery" },
          { icon: AutorenewOutlinedIcon, text: "100% Money-back guarantee" },
          { icon: SupportAgentOutlinedIcon, text: "24/7 Customer support" },
          { icon: LockOutlinedIcon, text: "Secure payment method" },
        ];

  const shippingInfo =
    Array.isArray(product?.shippingInfo) && product.shippingInfo.length
      ? product.shippingInfo
      : [
          { label: "Courier", note: "2 - 4 days, free shipping", cost: 0 },
          { label: "Local Shipping", note: "up to one week", cost: 19 },
          { label: "UPS Ground Shipping", note: "4 - 6 days", cost: 29 },
          { label: "Unishop Global Export", note: "3 - 4 days", cost: 39 },
        ];

  // share
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/product/${product.slug || id}`;

  const openShare = (e) => setAnchorShare(e.currentTarget);
  const closeShare = () => setAnchorShare(null);
  const openWin = (u) => {
    if (typeof window === "undefined" || typeof window.open !== "function") return; // NEW LOGIC
    window.open(u, "_blank", "noopener,noreferrer,width=600,height=520");
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: product.title, url: shareUrl });
      } catch {}
      closeShare();
    }
  };
  const doCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
      }
    } finally {
      closeShare();
    }
  };
  const shareFacebook = () =>
    openWin(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
  const shareTwitter = () =>
    openWin(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
        product.title || ""
      )}`
    );
  const shareWhatsApp = () =>
    openWin(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${product.title} ${shareUrl}`)}`);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 0 }, py: 3 }}>
      <Grid container spacing={4}>
        {/* Left: gallery */}
        <Grid item xs={12} md={6}>
          <Box sx={{ position: "relative", border: `1px solid ${BORDER}`, borderRadius: 1 }}>
            <Box
              component="img"
              src={showImg}
              alt={product.title}
              sx={{ width: "100%", height: { xs: IMAGE_HEIGHT_XS, md: IMAGE_HEIGHT_MD }, objectFit: "contain", display: "block", bgcolor: "#fff" }}
            />
            {images.length > 1 && (
              <>
                <IconButton
                  aria-label="Previous image"
                  title="Previous image"
                  onClick={prev}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: 10,
                    transform: "translateY(-50%)",
                    bgcolor: ORANGE,
                    color: "#fff",
                    "&:hover": { bgcolor: "#E7712F" },
                  }}
                >
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label="Next image"
                  title="Next image"
                  onClick={next}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    right: 10,
                    transform: "translateY(-50%)",
                    bgcolor: ORANGE,
                    color: "#fff",
                    "&:hover": { bgcolor: "#E7712F" },
                  }}
                >
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1.25, mt: 1.5, flexWrap: "wrap" }}>
            {images.map((src, i) => (
              <Box
                key={i}
                component="img"
                src={src}
                alt={`thumb-${i}`}
                onClick={() => setImg(src)}
                sx={{
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  objectFit: "cover",
                  p: 0.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: showImg === src ? `2px solid ${ORANGE}` : `1px solid ${BORDER}`,
                  bgcolor: "#fff",
                }}
              />
            ))}
          </Box>
        </Grid>

        {/* Right: details */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Rating value={ratingValue} precision={0.5} readOnly sx={{ "& .MuiRating-iconFilled": { color: "#FFB400" } }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{ratingValue.toFixed(1)} Star Rating</Typography>
            {!!ratingCount && <Typography sx={{ color: MUTED, fontSize: 12 }}>({ratingCount.toLocaleString()} user feedback)</Typography>}
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: 24, lineHeight: 1.25, color: DARK, mb: 1 }}>
            {product.title}
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", color: MUTED, fontSize: 13, mb: 2 }}>
            {product.sku && (
              <Typography>
                <strong>Sku:</strong> {product.sku}
              </Typography>
            )}
            {product.brand && (
              <Typography>
                <strong>Brand:</strong> {product.brand}
              </Typography>
            )}
            {product.stock != null && (
              <Typography sx={{ color: product.stock > 0 ? GREEN : "#ff4d4f" }}>
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </Typography>
            )}
            {product.category && (
              <Typography>
                <strong>Category:</strong> {product.category}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Typography sx={{ color: BLUE, fontWeight: 800, fontSize: 28 }}>{price}</Typography>
            {oldDisplay && <Typography sx={{ color: MUTED, textDecoration: "line-through" }}>{oldDisplay}</Typography>}
            {discountPct ? (
              <Chip size="small" label={`${discountPct}% OFF`} sx={{ bgcolor: "#FFE57C", color: DARK, fontWeight: 800, height: 24 }} />
            ) : null}
          </Box>

          {/* selectors */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {attributes.map((a) => (
              <Grid item xs={12} sm={6} key={a.key}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>
                  {a.label}
                  {a.required ? " *" : ""}
                </Typography>
                {a.kind === "swatch" ? (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {(a.values || []).slice(0, 3).map((v) => (
                      <Tooltip title={String(v)} key={v}>
                        <Box
                          onClick={() => setSel((s) => ({ ...s, [a.key]: v }))}
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            bgcolor: String(v),
                            border: sel[a.key] === v ? `2px solid ${ORANGE}` : `1px solid ${BORDER}`,
                            cursor: "pointer",
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                ) : (
                  <Select
                    fullWidth
                    size="small"
                    value={sel[a.key] ?? ""}
                    onChange={(e) => setSel((s) => ({ ...s, [a.key]: e.target.value }))}
                    displayEmpty
                    renderValue={(selected) =>
                      selected ? (
                        (() => {
                          const bump = product?.adjustments?.[a.key]?.[selected];
                          return bump ? `${selected} (+${formatMoney(convert(bump, rates, currency), currency)})` : selected;
                        })()
                      ) : (
                        <span style={{ color: "#9aa4ab" }}>{`Select ${a.label}`}</span>
                      )
                    }
                  >
                    <MenuItem value="" disabled>{`Select ${a.label}`}</MenuItem>
                    {(a.values || []).map((v) => (
                      <MenuItem key={v} value={v}>
                        {(() => {
                          const bump = product?.adjustments?.[a.key]?.[v];
                          return bump ? `${v} (+${formatMoney(convert(bump, rates, currency), currency)})` : v;
                        })()}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </Grid>
            ))}
          </Grid>

          {/* qty + actions */}
          <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                border: `1px solid ${BORDER}`,
                borderRadius: 1,
                overflow: "hidden",
                height: QTY_BTN_SIZE,
              }}
            >
              <IconButton aria-label="Decrease quantity" onClick={dec} sx={{ borderRight: `1px solid ${BORDER}`, width: QTY_BTN_SIZE, height: QTY_BTN_SIZE }}>
                <RemoveIcon />
              </IconButton>
              <Box sx={{ width: QTY_BTN_SIZE, textAlign: "center", fontWeight: 700 }}>{qty}</Box>
              <IconButton aria-label="Increase quantity" onClick={inc} sx={{ borderLeft: `1px solid ${BORDER}`, width: QTY_BTN_SIZE, height: QTY_BTN_SIZE }}>
                <AddIcon />
              </IconButton>
            </Box>

            <Button
              onClick={() => addToCart(qty)}
              startIcon={<AddIcon />}
              variant="contained"
              sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#E7712F" }, fontWeight: 800, height: 44 }}
            >
              ADD TO CART
            </Button>
            <Button
              onClick={handleBuyNow}
              variant="outlined"
              sx={{ height: 44, borderColor: BORDER, color: DARK, fontWeight: 800, "&:hover": { borderColor: DARK } }}
            >
              BUY NOW
            </Button>
          </Box>

          <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", color: MUTED, mb: 2, flexWrap: "wrap" }}>
            <Button onClick={doWishlist} startIcon={wished ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />} sx={{ textTransform: "none" }}>
              {wished ? "Added to Wishlist" : "Add to Wishlist"}
            </Button>
            <Button onClick={doCompare} startIcon={<ShuffleIcon />} sx={{ textTransform: "none", color: compared ? BLUE : MUTED }}>
              {compared ? "Added to Compare" : "Add to Compare"}
            </Button>

            {/* Share button + menu */}
            <Button startIcon={<ShareOutlinedIcon />} sx={{ textTransform: "none" }} onClick={openShare}>
              Share product
            </Button>
            <Menu anchorEl={anchorShare} open={Boolean(anchorShare)} onClose={closeShare}>
              {typeof navigator !== "undefined" && navigator.share ? (
                <MenuItem onClick={nativeShare}>
                  <ShareOutlinedIcon fontSize="small" style={{ marginRight: 8 }} /> Share…
                </MenuItem>
              ) : null}
              <MenuItem onClick={doCopy}>
                <ContentCopyIcon fontSize="small" style={{ marginRight: 8 }} /> Copy link
              </MenuItem>
              <MenuItem onClick={shareFacebook}>
                <FacebookIcon fontSize="small" style={{ marginRight: 8 }} /> Facebook
              </MenuItem>
              <MenuItem onClick={shareTwitter}>
                <TwitterIcon fontSize="small" style={{ marginRight: 8 }} /> X / Twitter
              </MenuItem>
              <MenuItem onClick={shareWhatsApp}>
                <WhatsAppIcon fontSize="small" style={{ marginRight: 8 }} /> WhatsApp
              </MenuItem>
            </Menu>
          </Box>

          <Divider sx={{ mb: 1.5 }} />
          <Typography sx={{ color: DARK, fontWeight: 700, fontSize: 12, mb: 0.75 }}>100% Guarantee Safe Checkout</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {[
              "/uploads/payments/visa.png",
              "/uploads/payments/mastercard.png",
              "/uploads/payments/amex.png",
              "/uploads/payments/paypal.png",
              "/uploads/payments/maestro.png",
            ].map((u) => (
              <Box key={u} component="img" src={assetUrl(u)} alt="" sx={{ height: 18, filter: "grayscale(.2)" }} />
            ))}
          </Box>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ mt: 5, border: `1px solid ${BORDER}`, borderRadius: 1, bgcolor: "#fff" }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            px: 2,
            borderBottom: `1px solid ${BORDER}`,
            "& .MuiTab-root": {
              minHeight: 48,
              fontSize: 12.5,
              fontWeight: 800,
              color: "#5F6C72",
              letterSpacing: 0.35,
              textTransform: "uppercase",
              mr: 2,
              position: "relative",
              "&.Mui-selected": { color: "#191C1F" },
              "&.Mui-selected::after": {
                content: '""',
                display: "block",
                height: 2,
                background: ORANGE,
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
              },
            },
          }}
        >
          <Tab label="Description" />
          <Tab label="Additional Information" />
          <Tab label="Specification" />
          <Tab label={`Review (${reviews.length || ratingCount || 0})`} />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {/* Description */}
          {tab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Description</Typography>
                <Typography sx={{ color: "#374151", mb: 1.5 }}>
                  {product.description ||
                    `The ${product.title} delivers excellent performance and value. With its premium build and reliable components, it is a great choice for everyday workloads, entertainment, and productivity.`}
                </Typography>
                {Array.isArray(product?.longDescription) ? (
                  product.longDescription.map((p, i) => (
                    <Typography key={i} sx={{ color: "#374151", mb: 1 }}>
                      {p}
                    </Typography>
                  ))
                ) : (
                  <Typography sx={{ color: "#374151" }}>
                    Even the most ambitious projects are easily handled with up to 10 CPU cores, dedicated media engines, and advanced graphics.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Feature</Typography>
                <Box sx={{ display: "grid", rowGap: 1 }}>
                  {featureItems.map(({ icon: Icon, text }, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Icon sx={{ fontSize: 18, color: ORANGE }} />
                      <Typography sx={{ fontSize: 14, color: "#191C1F" }}>{text}</Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12} md={3} sx={{ borderLeft: { md: `1px solid ${BORDER}` }, pl: { md: 3 } }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Shipping Information</Typography>
                <Box sx={{ display: "grid", rowGap: 1 }}>
                  {shippingInfo.map((s, i) => (
                    <Box key={i} sx={{ fontSize: 14, color: "#191C1F" }}>
                      <Typography component="span" sx={{ fontWeight: 700 }}>
                        {s.label}:
                      </Typography>{" "}
                      {s.note}
                      {typeof s.cost === "number" ? (s.cost <= 0 ? ", free shipping" : `, ${fmtMoney(s.cost)}`) : null}
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}

          {/* Additional Information */}
          {tab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {attributes.map((a) => (
                  <Box key={a.key} sx={{ display: "flex", py: 1, borderBottom: `1px dashed ${BORDER}` }}>
                    <Box sx={{ width: 200, color: MUTED, fontWeight: 600 }}>{a.label}</Box>
                    <Box sx={{ flex: 1 }}>{a.values && a.values.length ? a.values.join(", ") : "-"}</Box>
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12} md={6}>
                {[
                  ["Brand", product.brand || "-"],
                  ["Sku", product.sku || "-"],
                  ["Category", product.category || "-"],
                ].map(([k, v]) => (
                  <Box key={k} sx={{ display: "flex", py: 1, borderBottom: `1px dashed ${BORDER}` }}>
                    <Box sx={{ width: 200, color: MUTED, fontWeight: 600 }}>{k}</Box>
                    <Box sx={{ flex: 1 }}>{v}</Box>
                  </Box>
                ))}
              </Grid>
            </Grid>
          )}

          {/* Specification */}
          {tab === 2 && (
            <Grid container spacing={2}>
              {isNonEmptyObject(specsToShow) ? (
                Object.entries(specsToShow).map(([k, v]) => (
                  <Grid key={k} item xs={12} sm={6} md={4}>
                    <Box sx={{ p: 1.25, border: `1px solid ${BORDER}`, borderRadius: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: DARK }}>{k}</Typography>
                      <Typography sx={{ color: MUTED, fontSize: 13 }}>{String(v || "-")}</Typography>
                    </Box>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, border: `1px dashed ${BORDER}`, borderRadius: 1, color: MUTED }}>No specification info yet.</Box>
                </Grid>
              )}
            </Grid>
          )}

          {/* Reviews */}
          {tab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                {(reviews.length ? reviews : []).map((r) => (
                  <Box key={r._id} sx={{ display: "flex", gap: 1.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
                    <Avatar sx={{ width: 36, height: 36 }}>{(r.userName || "U").slice(0, 1).toUpperCase()}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ fontWeight: 700 }}>{r.userName || "User"}</Typography>
                        <Rating value={Number(r.rating || 0)} size="small" readOnly />
                        <Typography sx={{ color: MUTED, fontSize: 12 }}>
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                        </Typography>
                      </Box>
                      <Typography sx={{ mt: 0.25 }}>{r.comment}</Typography>
                    </Box>
                  </Box>
                ))}
                {!reviews.length && <Typography sx={{ color: MUTED }}>No reviews yet. Be the first to review this product!</Typography>}
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 1 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Write a review</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Typography sx={{ color: MUTED }}>Your rating:</Typography>
                    <Rating value={rating} onChange={(_e, v) => setRating(v || 5)} />
                  </Box>
                  <TextField
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write your feedback…"
                    multiline
                    minRows={3}
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                  <Button
                    variant="contained"
                    disabled={posting}
                    onClick={handlePostReview}
                    sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#E7712F" }, fontWeight: 800 }}
                  >
                    {posting ? "Publishing…" : "Publish Review"}
                  </Button>
                  {!me?._id && <Typography sx={{ mt: 1, color: MUTED, fontSize: 12 }}>You must be signed in to post.</Typography>}
                </Box>
              </Grid>
            </Grid>
          )}
        </Box>
      </Box>

      {/* Flash Sale Today */}
      {showFlash && <FlashSaleToday loading={!isReady || homeLoading} groups={groupsToUse} />}

      {/* Toasts */}
      <Snackbar
        open={!!toast}
        autoHideDuration={TOAST_DURATION}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>
          {toast}
        </Alert>
      </Snackbar>

      <Snackbar
        open={copied}
        autoHideDuration={COPY_TOAST_DURATION}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setCopied(false)}>
          Link copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
}
