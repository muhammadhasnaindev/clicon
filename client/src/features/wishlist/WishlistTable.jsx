// src/features/wishlist/WishlistTable.jsx
/**
 * WishlistTable
 * Summary: Responsive wishlist view (table on desktop, cards on mobile) with cart/quickview/remove actions.
 
 */

import React from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Divider,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../../store/slices/cartSlice";
import {
  removeFromWishlist,
  clearWishlist,
  // If you already export a selector, prefer that:
  // selectWishlist
} from "../../store/slices/wishlistSlice";
import { openQuickView } from "../../store/slices/quickViewSlice";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";
import { assetUrl } from "../../utils/asset";

const BLUE = "#1B6392";
const ORANGE = "#FA8232";
const GREEN = "#1AAE55";
const RED = "#E45858";
const BORDER = "#E5E7EB";
const DARK = "#191C1F";
const MUTED = "#5F6C72";

// ========================= NEW/REVISED LOGIC =========================
// PRO: Centralize the grid template so headers and rows never diverge.
const GRID_COLS = "minmax(380px,1fr) 160px 140px 220px 72px";

const idOf = (p) => p?._id || p?.id || p?.slug || p?.sku;
const imgOf = (p) =>
  assetUrl(p?.image || p?.images?.[0] || "/uploads/placeholder.png");
const nowPrice = (p) =>
  Number(p?.price?.current ?? p?.discountPrice ?? p?.price ?? 0);
const oldPrice = (p) => p?.price?.old ?? p?.oldPrice ?? null;

/**
 * Wishlist table/cards with actions.
 */
export default function WishlistTable() {
  const dispatch = useDispatch();
  // If you already have selectWishlist, use it. Fallback below keeps this file drop-in.
  const items =
    useSelector((s) => s.wishlist?.items) /* selectWishlist */ || [];

  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);

  // ========================= NEW/REVISED LOGIC =========================
  // PRO: Defensive formatter—if a value can't be formatted, render "—" instead of "NaN".
  const fmt = (v) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return "—";
    return formatMoney(convert(n, rates, currency), currency);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Empty state
  if (!items || items.length === 0) {
    return (
      <Box sx={{ py: 6, px: 2 }}>
        <Box
          sx={{
            maxWidth: 980,
            mx: "auto",
            p: { xs: 4, md: 6 },
            border: `1px dashed ${BORDER}`,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 22, color: DARK, mb: 1 }}>
            Your wishlist is empty
          </Typography>
          <Typography sx={{ color: MUTED, mb: 3 }}>
            Tap the heart icon on any product to add it here.
          </Typography>
          <Button
            href="/shop"
            variant="contained"
            sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#E7712F" }, fontWeight: 700 }}
          >
            Browse Products
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, px: { xs: 2, md: 8 } }}>
      <Box sx={{ maxWidth: 1320, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2, gap: 1 }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 24, color: DARK }}>
            Wishlist
          </Typography>

          <Button
            startIcon={<DeleteSweepIcon />}
            onClick={() => dispatch(clearWishlist())}
            sx={{ color: "#9A9FA5", textTransform: "none" }}
          >
            Clear all
          </Button>
        </Stack>

        {/* Desktop TABLE */}
        {!isMobile ? (
          <Box
            sx={{
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: GRID_COLS,
                bgcolor: "#F9FAFB",
                color: "#6B7280",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                borderBottom: `1px solid ${BORDER}`,
                p: 2,
              }}
            >
              <Box>Products</Box>
              <Box>Price</Box>
              <Box>Stock Status</Box>
              <Box>Actions</Box>
              <Box />
            </Box>

            {/* Rows */}
            {items.map((p, idx) => {
              const id = idOf(p);
              const hasId = Boolean(id);

              // ========================= NEW/REVISED LOGIC =========================
              // PRO: Treat missing stock as in-stock (legacy backends often omit stock on wishlists).
              const inStock = (p?.stock ?? 1) > 0;

              return (
                <Box
                  key={id || idx}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: GRID_COLS,
                    alignItems: "center",
                    p: 2,
                    borderBottom:
                      idx === items.length - 1 ? "none" : `1px solid ${BORDER}`,
                    columnGap: 2,
                  }}
                >
                  {/* Product cell */}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      component="img"
                      src={imgOf(p)}
                      alt={p?.title}
                      sx={{
                        width: 64,
                        height: 64,
                        objectFit: "contain",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 1,
                        p: 0.5,
                        bgcolor: "#fff",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        color: DARK,
                        fontWeight: 600,
                        lineHeight: 1.35,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                      title={p?.title}
                    >
                      {p?.title}
                    </Typography>
                  </Stack>

                  {/* Price cell */}
                  <Stack spacing={0.5}>
                    {oldPrice(p) ? (
                      <Typography
                        sx={{ color: MUTED, textDecoration: "line-through", fontSize: 13 }}
                      >
                        {fmt(oldPrice(p))}
                      </Typography>
                    ) : null}
                    <Typography sx={{ color: BLUE, fontWeight: 800 }}>
                      {fmt(nowPrice(p))}
                    </Typography>
                  </Stack>

                  {/* Stock cell */}
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: inStock ? GREEN : RED,
                      fontSize: 13,
                    }}
                  >
                    {inStock ? "IN STOCK" : "OUT OF STOCK"}
                  </Typography>

                  {/* Actions cell */}
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCartIcon />}
                    disabled={!inStock}
                    onClick={() =>
                      inStock &&
                      dispatch(
                        addItem({
                          id,
                          title: p?.title,
                          image: imgOf(p),
                          price: nowPrice(p),
                        })
                      )
                    }
                    sx={{
                      width: 160,
                      height: 38,
                      fontWeight: 700,
                      textTransform: "none",
                      bgcolor: inStock ? ORANGE : "#D1D5DB",
                      color: inStock ? "#fff" : "#6B7280",
                      "&:hover": {
                        bgcolor: inStock ? "#E7712F" : "#D1D5DB",
                      },
                    }}
                    aria-label="Add item to cart"
                  >
                    Add to Cart
                  </Button>

                  {/* Right icons */}
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title={hasId ? "Quick view" : "Unavailable"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => hasId && dispatch(openQuickView(id))}
                          disabled={!hasId}
                          sx={{
                            border: `1px solid ${BORDER}`,
                            bgcolor: "#fff",
                            "&:hover": { bgcolor: "#fff" },
                          }}
                          aria-label="Quick view product"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={hasId ? "Remove" : "Unavailable"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => hasId && dispatch(removeFromWishlist(id))}
                          disabled={!hasId}
                          sx={{
                            border: `1px solid ${BORDER}`,
                            bgcolor: "#fff",
                            "&:hover": { bgcolor: "#fff" },
                          }}
                          aria-label="Remove from wishlist"
                        >
                          <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        ) : (
          /* Mobile CARDS */
          <Stack spacing={2}>
            {items.map((p, idx) => {
              const id = idOf(p);
              const hasId = Boolean(id);
              const inStock = (p?.stock ?? 1) > 0;

              return (
                <Box
                  key={id || idx}
                  sx={{
                    border: `1px solid ${BORDER}`,
                    borderRadius: 2,
                    p: 2,
                    bgcolor: "#fff",
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      component="img"
                      src={imgOf(p)}
                      alt={p?.title}
                      sx={{
                        width: 64,
                        height: 64,
                        objectFit: "contain",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 1,
                        p: 0.5,
                        bgcolor: "#fff",
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          color: DARK,
                          fontWeight: 600,
                          lineHeight: 1.35,
                          mb: 0.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                        title={p?.title}
                      >
                        {p?.title}
                      </Typography>

                      <Stack direction="row" spacing={1} alignItems="baseline">
                        {oldPrice(p) ? (
                          <Typography
                            sx={{
                              color: MUTED,
                              textDecoration: "line-through",
                              fontSize: 13,
                            }}
                          >
                            {fmt(oldPrice(p))}
                          </Typography>
                        ) : null}
                        <Typography sx={{ color: BLUE, fontWeight: 800 }}>
                          {fmt(nowPrice(p))}
                        </Typography>
                      </Stack>
                      <Typography
                        sx={{
                          mt: 0.25,
                          fontWeight: 700,
                          color: inStock ? GREEN : RED,
                          fontSize: 12,
                        }}
                      >
                        {inStock ? "IN STOCK" : "OUT OF STOCK"}
                      </Typography>
                    </Box>

                    <Stack spacing={1} alignItems="flex-end">
                      <Tooltip title={hasId ? "Quick view" : "Unavailable"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => hasId && dispatch(openQuickView(id))}
                            disabled={!hasId}
                            sx={{
                              border: `1px solid ${BORDER}`,
                              bgcolor: "#fff",
                              "&:hover": { bgcolor: "#fff" },
                            }}
                            aria-label="Quick view product"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={hasId ? "Remove" : "Unavailable"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => hasId && dispatch(removeFromWishlist(id))}
                            disabled={!hasId}
                            sx={{
                              border: `1px solid ${BORDER}`,
                              bgcolor: "#fff",
                              "&:hover": { bgcolor: "#fff" },
                            }}
                            aria-label="Remove from wishlist"
                          >
                            <CloseRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<ShoppingCartIcon />}
                    disabled={!inStock}
                    onClick={() =>
                      inStock &&
                      dispatch(
                        addItem({
                          id,
                          title: p?.title,
                          image: imgOf(p),
                          price: nowPrice(p),
                        })
                      )
                    }
                    sx={{
                      height: 40,
                      fontWeight: 700,
                      textTransform: "none",
                      bgcolor: inStock ? ORANGE : "#D1D5DB",
                      color: inStock ? "#fff" : "#6B7280",
                      "&:hover": {
                        bgcolor: inStock ? "#E7712F" : "#D1D5DB",
                      },
                    }}
                    aria-label="Add item to cart"
                  >
                    Add to Cart
                  </Button>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
