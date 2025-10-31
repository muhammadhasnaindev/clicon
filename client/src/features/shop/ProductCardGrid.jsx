/**
 * ProductCardGrid
 * Summary: Card view of a product with wishlist/cart/quickview and passive view logging.
 
 */

import React, { useMemo, useEffect, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Chip, Typography, IconButton, Tooltip, Button } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RatingStars from "../home/components/RatingStars";
import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../../store/slices/cartSlice";
import { addToWishlist } from "../../store/slices/wishlistSlice";
import { openQuickView } from "../../store/slices/quickViewSlice";
import { assetUrl } from "../../utils/asset";
import { convert, formatMoney } from "../../utils/money";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { useLogProductViewMutation } from "../../store/api/apiSlice";

const BLUE = "#1B6392";
const ORANGE = "#FA8232";
const YELLOW = "#EBC80C";
const DARK = "#191C1F";
const BORDER = "#E0E0E0";

/**
 * Product tile with actions. Expects partial product shape; handles fallbacks.
 */
export default function ProductCardGrid({ product }) {
  const dispatch = useDispatch();

  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const fmt = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  const id = String(product?._id || product?.id || product?.slug || ""); // ✅ stable id string
  const slugOrId = product?.slug || id;

  const rawImage = product?.image || (Array.isArray(product?.images) ? product?.images[0] : "");
  const img = assetUrl(rawImage || "/uploads/placeholder.png");

  const cur = product?.price?.current ?? product?.discountPrice ?? product?.price ?? 0;
  const old = product?.price?.old ?? product?.oldPrice ?? null;

  const ratingValue = Number(
    product?.ratingAverage ?? product?.avgRating ?? product?.rating?.average ?? product?.rating ?? 0
  );
  const ratingCount = Number(
    product?.numReviews ?? product?.reviewsCount ?? product?.rating?.count ?? 0
  );

  const [logView] = useLogProductViewMutation();

  const logBody = useMemo(
    () => ({
      productId: product?._id || product?.id || undefined,
      slug: product?.slug || undefined,
      title: product?.title || undefined,
      image: rawImage || undefined,
      price: cur ?? undefined,
      currency: product?.currency ?? undefined,
      source: "card",
    }),
    [product?._id, product?.id, product?.slug, product?.title, rawImage, cur, product?.currency]
  );

  const canLog = !!(logBody.productId || logBody.slug);

  const cardRef = useRef(null);
  const loggedOnceRef = useRef(false);

  useEffect(() => {
    loggedOnceRef.current = false;
  }, [product?._id, product?.id, product?.slug]);

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Passive view tracking when 55%+ of card is visible. Ignore network errors.
   */
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !canLog) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loggedOnceRef.current) {
          loggedOnceRef.current = true;
          try { logView(logBody).catch(() => {}); } catch {}
        }
      },
      { threshold: 0.55 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [logView, logBody, canLog]);

  const openQV = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (canLog) {
      try { logView({ ...logBody, source: "card_quickview_click" }).catch(() => {}); } catch {}
    }
    if (id) dispatch(openQuickView(id));
  };

  const addToCart = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    // minimal payload most slices support
    dispatch(addItem({ id: id || product?.slug, title: product?.title, image: img, price: cur }));
  };

  return (
    <Box
      ref={cardRef}
      sx={{
        border: `1px solid ${BORDER}`,
        borderRadius: "8px",
        p: { xs: 1.5, md: 2 },
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        "&:hover .hover-actions": { opacity: 1, transform: "translateY(0)" },
      }}
    >
      {/* Overlay link (kept below action buttons via zIndex) */}
      <Box
        component={RouterLink}
        to={`/product/${slugOrId}`}
        aria-label={product?.title}
        onClick={() => {
          if (canLog) {
            try { logView({ ...logBody, source: "card_click" }).catch(() => {}); } catch {}
          }
        }}
        sx={{ position: "absolute", inset: 0, zIndex: 1 }}
      />

      {(product?.discountText || product?.label) && (
        <Chip
          label={product.discountText || product.label}
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            bgcolor: product.discountText ? YELLOW : BLUE,
            color: product.discountText ? DARK : "#fff",
            fontWeight: 700,
            zIndex: 3,
          }}
        />
      )}

      <Box
        sx={{
          position: "relative",
          height: { xs: 120, sm: 140 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1,
        }}
      >
        <Box component="img" src={img} alt={product?.title} sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
        <Box
          className="hover-actions"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            opacity: 0,
            transform: "translateY(-6px)",
            transition: "all .18s ease",
            bgcolor: "#fff",
            borderRadius: 999,
            p: 0.5,
            boxShadow: "0 8px 20px rgba(0,0,0,.06)",
            display: { xs: "none", md: "flex" },
            gap: 0.5,
            zIndex: 3,
          }}
        >
          <Tooltip title="Wishlist">
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dispatch(addToWishlist({ id: id || product?.slug, title: product?.title, image: img, price: cur }));
              }}
            >
              <FavoriteBorderIcon sx={{ color: ORANGE, fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add to cart">
            <IconButton
              size="small"
              onClick={addToCart}
              sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#E7712F" } }}
            >
              <ShoppingCartIcon sx={{ color: "#fff", fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Quick view">
            <IconButton size="small" onClick={openQV}>
              <VisibilityIcon sx={{ color: DARK, fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Typography
        sx={{
          fontWeight: 600,
          fontSize: 14,
          color: DARK,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 40,
          zIndex: 2,
        }}
        title={product?.title}
      >
        {product?.title}
      </Typography>

      <RatingStars value={ratingValue} count={ratingCount} />

      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5, mb: 1, zIndex: 2 }}>
        {old != null && (
          <Typography sx={{ fontSize: 13, color: "#8F9FA7", textDecoration: "line-through" }}>
            {fmt(old)}
          </Typography>
        )}
        <Typography sx={{ color: BLUE, fontWeight: 700, fontSize: 16 }}>{fmt(cur)}</Typography>
      </Box>

      <Button
        size="small"
        variant="contained"
        startIcon={<ShoppingCartIcon />}
        onClick={addToCart}
        sx={{
          mt: "auto",
          height: 40,
          fontWeight: 700,
          textTransform: "none",
          bgcolor: ORANGE,
          "&:hover": { bgcolor: "#E7712F" },
          display: { xs: "flex", md: "none" },
          zIndex: 3,
        }}
      >
        Add to Cart
      </Button>
    </Box>
  );
}
