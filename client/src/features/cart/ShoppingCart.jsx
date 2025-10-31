// src/pages/ShoppingCart.jsx
/**
 * Summary:
 * Shopping cart table + totals + coupon. Uses Redux by default, can be overridden via props.

 */

import React, { useMemo, useState, useEffect } from "react";
import {
  Box, Grid, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Button, Avatar, Divider, TextField, Paper, Alert, Collapse
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";

import { useDispatch, useSelector } from "react-redux";
import {
  selectCartItemsNormalized,
  selectCartTotalsBase,
  updateQty,
  removeItem,
  refreshCart,
  applyCoupon,
} from "../../store/slices/cartSlice";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { formatCurrency } from "../../utils/money";

const BORDER = "#E5E7EB";
const ORANGE = "#FA8232";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BLUE = "#2DA5F3";

export default function ShoppingCart({
  cartItems,             // optional: override lines
  totals,                // optional: override totals
  formatPrice,           // optional formatter (v) => string
  formatMoney,           // legacy prop
  onQty,
  onRemove,
  onReturnShop,
  onUpdate,
  onCheckout,            // optional: custom checkout handler
  onApplyCoupon,
}) {
  const dispatch    = useDispatch();

  // Redux fallbacks
  const storeLines  = useSelector(selectCartItemsNormalized);
  const storeTotals = useSelector(selectCartTotalsBase);
  const currency    = useSelector(selectCurrency);
  const rates       = useSelector(selectRates);

  // UI state
  const [couponCode, setCouponCode] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showUpdated, setShowUpdated] = useState(false);
  const [lastApplied, setLastApplied] = useState(""); // PRO: remember last applied to ignore no-op re-apply

  // Lines & formatter
  const lines = Array.isArray(cartItems) && cartItems.length ? cartItems : storeLines;
  const fmt = formatPrice || formatMoney || ((v) => formatCurrency(Number(v || 0), rates, currency));

  //  Guard against invalid qty mutations; keep behavior, just safer.
  const saneQty = (q) => {
    const n = Number(q);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  };

  // Safe handlers
  const handleQty = (id, qty) => {
    const next = saneQty(qty);
    if (typeof onQty === "function") onQty(id, next);
    else dispatch(updateQty({ id, qty: next }));
  };

  const handleRemove = (id) => {
    if (typeof onRemove === "function") onRemove(id);
    else dispatch(removeItem(id));
  };

  const handleUpdate = () => {
    if (typeof onUpdate === "function") onUpdate();
    else dispatch(refreshCart());          // keep: recompute totals/lines
    setShowUpdated(true);
  };
  useEffect(() => {
    if (!showUpdated) return;
    const t = setTimeout(() => setShowUpdated(false), 1400);
    return () => clearTimeout(t);
  }, [showUpdated]);

  const handleReturnShop = () => {
    if (typeof onReturnShop === "function") onReturnShop();
    else if (typeof window !== "undefined") window.location.href = "/shop";
  };

  // Normalize + short-circuit when same code reapplied (no server churn).
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code || code === lastApplied) {
      setShowFeedback(true);
      return;
    }
    if (typeof onApplyCoupon === "function") onApplyCoupon(code);
    else dispatch(applyCoupon(code));
    dispatch(refreshCart());
    setLastApplied(code);
    setShowFeedback(true);
  };

  //  Simple, predictable checkout fallback.
  const handleCheckout = () => {
    if (typeof onCheckout === "function") onCheckout();
    else if (typeof window !== "undefined") window.location.href = "/checkout";
  };

  // Totals: prefer prop, else store (if lines), else fallback
  const fallbackTotals = useMemo(() => {
    const subtotal = lines.reduce((s, i) => s + (Number(i.subtotalBase) || 0), 0);
    const discount = 0;
    const shipping = 0;
    const tax      = subtotal > 0 ? 61.99 : 0;
    const total    = Math.max(0, subtotal - discount + shipping + tax);
    return { subtotalBase: subtotal, discountBase: discount, shippingBase: shipping, taxBase: tax, totalBase: total };
  }, [lines]);

  const T = totals ?? (lines.length ? storeTotals : fallbackTotals);

  // Coupon feedback (no code revealed)
  const hasItems     = lines.length > 0;
  const hasCoupon    = !!T.coupon;
  const hasDiscount  = Number(T.discountBase) > 0;
  const pct = T.subtotalBase > 0
    ? Math.round((Number(T.discountBase) / Number(T.subtotalBase)) * 100)
    : 0;

  const showSuccess  = (showFeedback || hasCoupon) && hasDiscount;
  const showInfo     = (showFeedback || hasCoupon) && !hasDiscount && !hasItems; // applied on empty cart
  const showError    = (showFeedback || hasCoupon) && !hasDiscount && hasItems;  // invalid for current cart

  const cartEmpty = lines.length === 0;

  return (
    <Box sx={{ px: { xs: 2, md: 6 }, py: { xs: 2, md: 4 }, maxWidth: 1280, mx: "auto" }}>
      <Grid container spacing={3}>
        {/* Left: table */}
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontWeight: 800, color: DARK }}>Shopping Cart</Typography>
            </Box>

            <Box
              sx={{
                overflowX: "auto",
                ...(lines.length > 6 && { maxHeight: 420, overflowY: "auto" }),
                "&::-webkit-scrollbar": { height: 8, width: 8 },
                "&::-webkit-scrollbar-thumb": { backgroundColor: "#CBD5E1", borderRadius: 8 },
                "&::-webkit-scrollbar-track": { backgroundColor: "#F1F5F9" },
              }}
            >
              <Table size="small" sx={{ minWidth: 680, "& td, & th": { borderColor: BORDER } }}>
                <TableHead>
                  <TableRow>
                    <TableCell width={44} />
                    <TableCell sx={{ color: MUTED, fontWeight: 700 }}>PRODUCTS</TableCell>
                    <TableCell sx={{ color: MUTED, fontWeight: 700 }} align="right">PRICE</TableCell>
                    <TableCell sx={{ color: MUTED, fontWeight: 700 }} align="center">QUANTITY</TableCell>
                    <TableCell sx={{ color: MUTED, fontWeight: 700 }} align="right">SUB TOTAL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/*  explicit empty-row so table doesn't feel broken */}
                  {cartEmpty && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Box sx={{ py: 4, textAlign: "center", color: MUTED }}>
                          Your cart is empty.
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}

                  {!cartEmpty && lines.map((l) => {
                    const key = l.lineId || l.id;
                    const hasCompare =
                      Number(l.compareAtBase) > 0 && Number(l.compareAtBase) > Number(l.priceBase);
                    return (
                      <TableRow key={key} data-lineid={key}>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemove(key)}
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              border: `1px solid ${BORDER}`,
                              color: "#9AA3AF",
                              bgcolor: "#fff",
                              "&:hover": {
                                bgcolor: "#FFF0ED",
                                color: "#E45858",
                                borderColor: "#FFD1C4",
                              },
                            }}
                            aria-label={`Remove ${l.title || "item"}`}
                          >
                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar
                              src={l.image}
                              variant="square"
                              alt={l.title}
                              sx={{ width: 56, height: 56, borderRadius: 1, border: `1px solid ${BORDER}`, bgcolor: "#FFF", flexShrink: 0 }}
                            />
                            <Typography sx={{ fontWeight: 600, color: DARK }} noWrap title={l.title}>
                              {l.title}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell align="right">
                          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                            {hasCompare && (
                              <Typography
                                component="span"
                                sx={{ color: MUTED, textDecoration: "line-through", fontWeight: 600, fontSize: 13 }}
                              >
                                {fmt(l.compareAtBase)}
                              </Typography>
                            )}
                            <Typography component="span" sx={{ fontWeight: 800, color: DARK }}>
                              {fmt(l.priceBase)}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              border: `1px solid ${BORDER}`,
                              borderRadius: 1,
                              height: 36,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleQty(key, Math.max(1, (l.qty || 1) - 1))}
                              sx={{ width: 36, height: 36 }}
                              aria-label={`Decrease quantity for ${l.title || "item"}`}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Box sx={{ width: 40, textAlign: "center", fontWeight: 800 }} aria-live="polite">
                              {(l.qty ?? 1).toString().padStart(2, "0")}
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleQty(key, (l.qty || 1) + 1)}
                              sx={{ width: 36, height: 36 }}
                              aria-label={`Increase quantity for ${l.title || "item"}`}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>

                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 800, color: DARK }}>
                            {fmt(l.subtotalBase)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                justifyContent: "space-between",
                px: 2,
                py: 1.5,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleReturnShop}
                sx={{
                  textTransform: "none",
                  borderColor: BORDER,
                  color: DARK,
                  "&:hover": { borderColor: DARK },
                  minWidth: 180,
                }}
              >
                RETURN TO SHOP
              </Button>
              <Button
                variant="outlined"
                onClick={handleUpdate}
                sx={{
                  textTransform: "none",
                  borderColor: BORDER,
                  color: DARK,
                  "&:hover": { borderColor: DARK },
                  minWidth: 160,
                }}
              >
                UPDATE CART
              </Button>
            </Box>

            {/* Update confirmation */}
            <Collapse in={showUpdated}>
              <Alert severity="success" sx={{ mx: 2, mb: 2 }}>
                Cart updated.
              </Alert>
            </Collapse>
          </Paper>
        </Grid>

        {/* Right: totals + coupon */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2, mb: 3, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontWeight: 800, color: DARK }}>Cart Totals</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Row label="Sub-total" value={fmt(T.subtotalBase)} />
              <Row label="Shipping" value="Free" />
              <Row label="Discount" value={T.discountBase ? `-${fmt(T.discountBase)}` : fmt(0)} />
              <Row label="Tax" value={fmt(T.taxBase)} />
              <Divider sx={{ my: 1.5 }} />
              <Row label={<b>Total</b>} value={<b style={{ color: ORANGE }}>{fmt(T.totalBase)}</b>} />
              <Button
                fullWidth
                variant="contained"
                endIcon={<ArrowRightAltIcon />}
                onClick={handleCheckout}
                disabled={cartEmpty}           //  avoid checkout with empty cart
                sx={{
                  mt: 1.5,
                  bgcolor: ORANGE,
                  fontWeight: 800,
                  textTransform: "none",
                  height: 44,
                  "&:hover": { bgcolor: "#E7712F" },
                }}
              >
                PROCEED TO CHECKOUT
              </Button>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontWeight: 800, color: DARK }}>Coupon Code</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <TextField
                placeholder="Enter your coupon"
                size="small"
                fullWidth
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value); setShowFeedback(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
                sx={{ mb: 1.5 }}
                inputProps={{ "aria-label": "Coupon code" }}
              />
              <Button
                onClick={handleApplyCoupon}
                fullWidth
                variant="contained"
                sx={{
                  textTransform: "none",
                  bgcolor: BLUE,
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#1f92dd" },
                  height: 40,
                }}
              >
                APPLY COUPON
              </Button>

              {/* Professional, code-free feedback */}
              <Collapse in={showFeedback || hasCoupon} unmountOnExit>
                {showSuccess && (
                  <Alert severity="success" sx={{ mt: 1.25 }}>
                    Discount applied. You saved {fmt(T.discountBase)}{pct ? ` (${pct}% off)` : ""}.
                  </Alert>
                )}
                {showInfo && (
                  <Alert severity="info" sx={{ mt: 1.25 }}>
                    Your discount will apply when items are added to the cart.
                  </Alert>
                )}
                {showError && (
                  <Alert severity="error" sx={{ mt: 1.25 }}>
                    This coupon isn’t valid.
                  </Alert>
                )}
              </Collapse>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
      <Typography sx={{ color: MUTED }}>{label}</Typography>
      <Typography sx={{ color: DARK }}>{value}</Typography>
    </Box>
  );
}
