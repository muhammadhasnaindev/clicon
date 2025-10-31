// src/components/product/ProductQuickView.jsx
/**
 * Summary:
 * Quick view dialog with gallery, variant pricing, and cart/wishlist/compare.

 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, Box, Typography, IconButton, Button, Divider,
  MenuItem, Select, Rating, Chip, Tooltip, Menu, Snackbar, Alert, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../../../store/slices/cartSlice";
import { addToWishlist } from "../../../store/slices/wishlistSlice";
import { addToCompare } from "../../../store/slices/compareSlice";
import { convert, formatMoney } from "../../../utils/money";
import { selectCurrency, selectRates } from "../../../store/slices/settingsSlice";
import { assetUrl } from "../../../utils/asset";
import { useLogProductViewMutation } from "../../../store/api/apiSlice";

const BLUE = "#1B6392";
const ORANGE = "#FA8232";
const GREEN = "#20C997";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";

const DEFAULT_ORDER = [
  "color","size","memory","storage","carrier","band","caseSize","kit","bundle","length","refresh","connectivity","pack",
];
const labelOf = (k) => ({
  color:"Color", size:"Size", memory:"Memory", storage:"Storage", carrier:"Carrier", band:"Band",
  caseSize:"Case Size", kit:"Kit", bundle:"Bundle", length:"Length", refresh:"Refresh Rate",
  connectivity:"Connectivity", pack:"Pack Size",
}[k] || (k ? k[0]?.toUpperCase() + k.slice(1) : ""));

const sorted = (arr) => [...arr].sort((a,b) => {
  const ao = a.uiOrder ?? DEFAULT_ORDER.indexOf(a.key);
  const bo = b.uiOrder ?? DEFAULT_ORDER.indexOf(b.key);
  return (ao === -1 ? 999 : ao) - (bo === -1 ? 999 : bo);
});

/* Logic: sensible fallback attributes by category
   Why: keep quick view useful even if product data is sparse */
function defaultsByCategory(p) {
  const C = (vals) => ({ key: "color", label: "Color", kind: "swatch", values: vals, required: false });
  const swatches = ["#191C1F", "#f2f3f5", "#FF7F2A"];
  switch ((p?.category || "").toLowerCase()) {
    case "computer & laptop":
      return [C(swatches), { key:"size", label:"Size", kind:"select", values:['13"','15"'], required:true },
        { key:"memory", label:"Memory", kind:"select", values:["8GB","16GB","32GB"], required:true },
        { key:"storage", label:"Storage", kind:"select", values:["256GB SSD","512GB SSD","1TB SSD"], required:true }];
    case "smartphone":
      return [C(swatches), { key:"storage", label:"Storage", kind:"select", values:["64GB","128GB","256GB"], required:true },
        { key:"memory", label:"Memory", kind:"select", values:["6GB","8GB"], required:false },
        { key:"carrier", label:"Carrier", kind:"select", values:["Unlocked","AT&T","T-Mobile"], required:false }];
    case "wearable technology":
      return [{ key:"caseSize", label:"Case Size", kind:"select", values:["41mm","45mm"], required:true },
        { key:"band", label:"Band", kind:"select", values:["Sport","Milanese","Leather"], required:true }, C(swatches)];
    default:
      return [];
  }
}

function deriveAttributes(p) {
  const attrs = [];
  if (Array.isArray(p?.attributes) && p.attributes.length) {
    p.attributes.forEach((a) => attrs.push({
      ...a, label: a.label || labelOf(a.key), kind: a.kind || (a.key === "color" ? "swatch" : "select"),
      values: a.values || [], required: Boolean(a.required),
    }));
  }
  if (Array.isArray(p?.colors) && p.colors.length) attrs.push({ key:"color", label:"Color", kind:"swatch", values:p.colors, required:false });
  if (Array.isArray(p?.size) && p.size.length) attrs.push({ key:"size", label:"Size", kind:"select", values:p.size, required:true });
  if (Array.isArray(p?.memory) && p.memory.length) attrs.push({ key:"memory", label:"Memory", kind:"select", values:p.memory, required:true });
  if (Array.isArray(p?.storage) && p.storage.length) attrs.push({ key:"storage", label:"Storage", kind:"select", values:p.storage, required:true });
  if (!attrs.length) attrs.push(...defaultsByCategory(p || {}));
  return sorted(attrs).map((a) => ({ ...a, label: a.label || labelOf(a.key) }));
}

const variantKey = (sel) =>
  Object.entries(sel)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join("|");

function priceFor(product, sel, currency, rates) {
  const base = Number(product?.basePrice ?? product?.price?.current ?? 0);
  const adj = product?.adjustments || {};
  let bump = 0;
  for (const [k, v] of Object.entries(sel)) {
    if (!v) continue;
    const add = adj[k]?.[v];
    if (add) bump += Number(add) || 0;
  }
  const curr = base + bump;
  const old = Number(product?.oldPrice ?? product?.price?.old ?? 0);
  const price = formatMoney(convert(curr, rates, currency), currency);
  const oldDisplay = old ? formatMoney(convert(old, rates, currency), currency) : null;
  const discountPct = old > 0 ? Math.round(((old - curr) / old) * 100) : null;
  return { curr, price, oldDisplay, discountPct };
}

// tiny helpers
const isFiniteNumber = (n) => Number.isFinite(n);

export default function ProductQuickView({ open, onClose, product, productId }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const [logView] = useLogProductViewMutation();

  if (!product) return null;

  const images = (product.images || []).map(assetUrl);
  const [img, setImg] = useState(images[0] || "");
  useEffect(() => setImg(images[0] || ""), [open, product?._id]); // reset per open

  const prev = () =>
    setImg((v) => images[(images.indexOf(v) - 1 + images.length) % images.length]);
  const next = () =>
    setImg((v) => images[(images.indexOf(v) + 1) % images.length]);

  const attributes = useMemo(() => deriveAttributes(product), [product]);
  const initialSel = useMemo(() => {
    const s = {};
    attributes.forEach((a) => {
      s[a.key] =
        a.kind === "swatch"
          ? a.values?.[0] ?? ""
          : a.required
          ? a.values?.[0] ?? ""
          : "";
    });
    return s;
  }, [attributes]);

  const [sel, setSel] = useState(initialSel);
  useEffect(() => setSel(initialSel), [open, initialSel]);

  // PRO: block actions until required attrs are chosen (human-friendly guard)
  const missingRequired = useMemo(
    () =>
      attributes
        .filter((a) => a.required)
        .filter((a) => !sel[a.key]),
    [attributes, sel]
  );
  const hasAllRequired = missingRequired.length === 0;

  const { curr, price, oldDisplay, discountPct } = priceFor(product, sel, currency, rates);

  const [qty, setQty] = useState(1);
  const inc = () => setQty((q) => Math.min(99, q + 1)); // soft clamp
  const dec = () => setQty((q) => Math.max(1, q - 1));

  const id = productId || product?._id || product?.id || product?.slug || product?.sku;

  const [wishAdded, setWishAdded] = useState(false);
  const [compAdded, setCompAdded] = useState(false);
  const [compareToast, setCompareToast] = useState(false);
  const [needSelectToast, setNeedSelectToast] = useState(false);

  const handleAddWishlist = () => {
    const showImg =
      img || images[0] || product?.image || (Array.isArray(product?.images) ? product.images[0] : "");
    dispatch({
      type: addToWishlist.type,
      payload: { id, title: product.title, image: showImg, price: curr },
    });
    setWishAdded(true);
  };

  const handleAddCompare = () => {
    const showImg =
      img || images[0] || product?.image || (Array.isArray(product?.images) ? product.images[0] : "");
    dispatch(
      addToCompare({
        _id: id,
        id,
        title: product.title,
        images: [showImg],
        image: showImg,
        price: product.price || { current: curr, old: product.price?.old ?? null },
        brand: product.brand,
        rating: product.rating,
        numReviews: product.numReviews,
        specs: sel,
      })
    );
    setCompAdded(true);
    setCompareToast(true);
  };

  const addToCart = (q) => {
    if (!hasAllRequired) {
      setNeedSelectToast(true);
      return;
    }
    const showImg =
      img || images[0] || product?.image || (Array.isArray(product?.images) ? product.images[0] : "");
    dispatch(
      addItem(
        { id, title: product.title, image: showImg, price: curr, variantKey: variantKey(sel) },
        q
      )
    );
  };

  const handleBuyNow = () => {
    if (!hasAllRequired) {
      setNeedSelectToast(true);
      return;
    }
    addToCart(1);
    onClose?.();
    navigate("/shopping-cart");
  };

  const [anchorShare, setAnchorShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/product/${product.slug || id}`
      : `/product/${product.slug || id}`;
  const openShare = (e) => setAnchorShare(e.currentTarget);
  const closeShare = () => setAnchorShare(null);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } finally {
      closeShare();
    }
  };
  const openWin = (u) => {
    window.open(u, "_blank", "noopener,noreferrer,width=600,height=520");
    closeShare();
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
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, url: shareUrl });
      } catch {}
      closeShare();
    }
  };

  const qvRatingValue = Number(
    product?.ratingAverage ?? product?.avgRating ?? product?.rating?.average ?? product?.rating ?? 0
  );
  const qvRatingCount = Number(
    product?.numReviews ?? product?.reviewsCount ?? product?.rating?.count ?? 0
  );

  // Log product view once per open
  useEffect(() => {
    if (open && product) {
      const rawImage = product?.image || (Array.isArray(product?.images) ? product.images[0] : "");
      const payload = {
        productId: product._id || product.id,
        slug: product.slug,
        title: product.title,
        source: "quickview_open",
        image: rawImage || undefined,
        price: product?.price?.current ?? product?.price ?? undefined,
        currency: product?.currency ?? undefined,
      };
      try {
        logView(payload).catch(() => {});
      } catch {}
    }
  }, [open, product, logView]);

  const outOfStock = product.stock != null && product.stock <= 0;
  const canInteract = !outOfStock;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
      >
        <DialogContent sx={{ p: { xs: 2, md: 4 }, position: "relative" }}>
          <IconButton
            onClick={onClose}
            aria-label="Close"
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              bgcolor: "#fff",
              border: `1px solid ${BORDER}`,
              borderRadius: "50%",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              zIndex: 3,
              "&:hover": { bgcolor: "#fff" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "560px 1fr" }, gap: { xs: 3, md: 4 } }}>
            {/* gallery */}
            <Box>
              <Box sx={{ position: "relative", border: `1px solid ${BORDER}`, borderRadius: 1, overflow: "hidden", bgcolor: "#fff" }}>
                <Box
                  component="img"
                  src={img}
                  alt={product.title}
                  sx={{ width: "100%", height: { xs: 260, md: 360 }, objectFit: "contain" }}
                />
                {images.length > 1 && (
                  <>
                    <IconButton
                      onClick={prev}
                      sx={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        bgcolor: ORANGE,
                        color: "#fff",
                        width: 36,
                        height: 36,
                        "&:hover": { bgcolor: "#E7712F" },
                      }}
                    >
                      <ArrowBackIosNewIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={next}
                      sx={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        bgcolor: ORANGE,
                        color: "#fff",
                        width: 36,
                        height: 36,
                        "&:hover": { bgcolor: "#E7712F" },
                      }}
                    >
                      <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>

              {images.length > 0 && (
                <Box sx={{ display: "flex", gap: 1.5, mt: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                  {images.map((src, i) => (
                    <Box
                      key={i}
                      component="img"
                      src={src}
                      alt={`thumb-${i}`}
                      onClick={() => setImg(src)}
                      sx={{
                        width: 62,
                        height: 62,
                        objectFit: "cover",
                        borderRadius: 1,
                        cursor: "pointer",
                        border: img === src ? `2px solid ${ORANGE}` : `1px solid ${BORDER}`,
                        p: 0.5,
                        bgcolor: "#fff",
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* details */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Rating
                  value={isFiniteNumber(qvRatingValue) ? qvRatingValue : 0}
                  precision={0.5}
                  readOnly
                  sx={{ "& .MuiRating-iconFilled": { color: "#FFB400" } }}
                />
                <Typography sx={{ color: DARK, fontSize: 13, fontWeight: 700 }}>
                  {isFiniteNumber(qvRatingValue) ? qvRatingValue.toFixed(1) : "0.0"} Star Rating
                </Typography>
                {isFiniteNumber(qvRatingCount) && qvRatingCount > 0 ? (
                  <Typography sx={{ color: MUTED, fontSize: 12 }}>
                    ({qvRatingCount.toLocaleString()} user feedback)
                  </Typography>
                ) : null}
              </Box>

              <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.35, color: DARK, mb: 0.75 }}>
                {product.title}
              </Typography>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", color: MUTED, fontSize: 12, mb: 1 }}>
                {product.sku && <Typography><strong>SKU:</strong> {product.sku}</Typography>}
                {product.brand && <Typography><strong>Brand:</strong> {product.brand}</Typography>}
                {product.stock != null && (
                  <Typography sx={{ color: product.stock > 0 ? GREEN : "#ff4d4f" }}>
                    {product.stock > 0 ? "In Stock" : "Out of Stock"}
                  </Typography>
                )}
                {product.category && <Typography><strong>Category:</strong> {product.category}</Typography>}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Typography sx={{ color: BLUE, fontWeight: 800, fontSize: 24 }}>{price}</Typography>
                {oldDisplay && (
                  <Typography sx={{ color: MUTED, textDecoration: "line-through", fontSize: 14 }}>
                    {oldDisplay}
                  </Typography>
                )}
                {discountPct ? (
                  <Chip
                    label={`${discountPct}% OFF`}
                    size="small"
                    sx={{ bgcolor: "#FFE57C", color: DARK, fontWeight: 800, height: 24 }}
                  />
                ) : null}
              </Box>

              {/* Attributes */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.25,
                  mb: 1.5,
                }}
              >
                {attributes.map((a) => (
                  <Box key={a.key} sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5, color: DARK }}>
                      {a.label}
                      {a.required ? " *" : ""}
                    </Typography>

                    {a.kind === "swatch" ? (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {(a.values || []).slice(0, 6).map((v) => (
                          <Tooltip key={v} title={String(v)}>
                            <Box
                              onClick={() => setSel((s) => ({ ...s, [a.key]: v }))}
                              sx={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                bgcolor: String(v),
                                border:
                                  sel[a.key] === v ? `2px solid ${ORANGE}` : `1px solid ${BORDER}`,
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
                        displayEmpty
                        value={sel[a.key] ?? ""}
                        onChange={(e) => setSel((s) => ({ ...s, [a.key]: e.target.value }))}
                        renderValue={(selected) =>
                          selected ? (
                            (() => {
                              const bump = product?.adjustments?.[a.key]?.[selected];
                              return bump
                                ? `${selected} (+${formatMoney(convert(bump, rates, currency), currency)})`
                                : selected;
                            })()
                          ) : (
                            <Typography component="span" sx={{ color: "#9aa4ab" }}>
                              {`Select ${a.label}`}
                            </Typography>
                          )
                        }
                      >
                        <MenuItem value="" disabled>{`Select ${a.label}`}</MenuItem>
                        {(a.values || []).map((v) => (
                          <MenuItem key={v} value={v}>
                            {(() => {
                              const bump = product?.adjustments?.[a.key]?.[v];
                              return bump
                                ? `${v} (+${formatMoney(convert(bump, rates, currency), currency)})`
                                : v;
                            })()}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </Box>
                ))}
              </Box>

              {/* Quantity + actions */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1.25,
                  alignItems: "center",
                  mb: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 1,
                    overflow: "hidden",
                    height: 40,
                  }}
                >
                  <IconButton onClick={dec} sx={{ borderRight: `1px solid ${BORDER}`, width: 40, height: 40 }}>
                    <RemoveIcon />
                  </IconButton>
                  <Box sx={{ width: 40, textAlign: "center", fontWeight: 700 }}>{qty}</Box>
                  <IconButton onClick={inc} sx={{ borderLeft: `1px solid ${BORDER}`, width: 40, height: 40 }}>
                    <AddIcon />
                  </IconButton>
                </Box>

                <Button
                  onClick={() => addToCart(qty)}
                  startIcon={<AddIcon />}
                  variant="contained"
                  disabled={!canInteract}
                  sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#E7712F" }, fontWeight: 800, height: 44 }}
                >
                  ADD TO CART
                </Button>

                <Button
                  onClick={handleBuyNow}
                  variant="outlined"
                  disabled={!canInteract}
                  sx={{ height: 44, borderColor: BORDER, color: DARK, fontWeight: 800, "&:hover": { borderColor: DARK } }}
                >
                  BUY NOW
                </Button>
              </Box>

              {/* Secondary actions */}
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", color: MUTED, mb: 2, flexWrap: "wrap" }}>
                <Button
                  startIcon={wishAdded ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                  sx={{ color: wishAdded ? "#D14D4D" : MUTED, textTransform: "none" }}
                  onClick={handleAddWishlist}
                >
                  {wishAdded ? "Added to Wishlist" : "Add to Wishlist"}
                </Button>
                <Button
                  startIcon={<ShuffleIcon />}
                  sx={{ color: compAdded ? BLUE : MUTED, textTransform: "none" }}
                  onClick={handleAddCompare}
                >
                  {compAdded ? "Added to Compare" : "Add to Compare"}
                </Button>
                <Button
                  startIcon={<ShareOutlinedIcon />}
                  sx={{ color: MUTED, textTransform: "none" }}
                  onClick={openShare}
                >
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
              <Typography sx={{ color: DARK, fontWeight: 700, fontSize: 12, mb: 0.75 }}>
                100% Guarantee Safe Checkout
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {[
                  "/uploads/payments/visa.png",
                  "/uploads/payments/mastercard.png",
                  "/uploads/payments/amex.png",
                  "/uploads/payments/paypal.png",
                  "/uploads/payments/maestro.png",
                ].map((u) => (
                  <Box
                    key={u}
                    component="img"
                    src={assetUrl(u)}
                    alt="payment"
                    sx={{ height: 18, objectFit: "contain", filter: "grayscale(0.2)" }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* toasts */}
      <Snackbar
        open={compareToast}
        autoHideDuration={1600}
        onClose={() => setCompareToast(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setCompareToast(false)}>
          Added to Compare
        </Alert>
      </Snackbar>

      <Snackbar
        open={copied}
        autoHideDuration={1800}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setCopied(false)}>
          Link copied to clipboard!
        </Alert>
      </Snackbar>

      <Snackbar
        open={needSelectToast}
        autoHideDuration={2000}
        onClose={() => setNeedSelectToast(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setNeedSelectToast(false)}>
          Please select all required options.
        </Alert>
      </Snackbar>
    </>
  );
}
