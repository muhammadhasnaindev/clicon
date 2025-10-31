/**
 * CheckoutPage
 * Short: Collects billing + payment choice, shows order summary, calls demo checkout.
 
 */

import React, { useMemo, useState } from "react";
import {
  Grid, Box, Typography, TextField, MenuItem, Checkbox, FormControlLabel,
  Button, Avatar, Divider, Paper, Alert, RadioGroup, FormControl, FormLabel
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import PaymentsIcon from "@mui/icons-material/Payments";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import { useSelector } from "react-redux";
import {
  selectCartItemsNormalized,
  selectCartTotalsBase
} from "../store/slices/cartSlice";
import { useDemoCheckoutMutation, useGetPaymentMethodsQuery } from "../store/api/apiSlice";
import { selectCurrency, selectRates } from "../store/slices/settingsSlice";
import { formatCurrency } from "../utils/money";
import { absUrl } from "../utils/media";

const BORDER  = "#E5E7EB";
const DARK    = "#191C1F";
const MUTED   = "#5F6C72";
const ORANGE  = "#FA8232";

function VisaBadge() {
  return (
    <Box sx={{ px: 1, py: 0.25, fontWeight: 800, fontSize: 11, borderRadius: 0.75, bgcolor: "#1434CB", color: "#fff", lineHeight: 1 }}>
      VISA
    </Box>
  );
}
function McBadge() {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#EA001B" }} />
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#FF5F00", ml: -0.8 }} />
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: DARK, ml: 0.25 }}>Mastercard</Typography>
    </Box>
  );
}

function PaymentOptionCard({ selected, onSelect, icon, label, desc, right, value }) {
  return (
    <Box
      role="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect(value)}
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(value)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        p: 1.25,
        borderRadius: 1.5,
        border: `1px solid ${selected ? ORANGE : BORDER}`,
        outline: "none",
        bgcolor: selected ? "rgba(250,130,50,0.06)" : "#fff",
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s, background-color .15s",
        "&:hover": { borderColor: selected ? ORANGE : "#CBD5E1" },
      }}
    >
      <Box sx={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: selected ? ORANGE : "#F3F4F6", color: selected ? "#fff" : DARK }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, color: DARK, lineHeight: 1.2 }}>{label}</Typography>
        {desc ? <Typography sx={{ color: MUTED, fontSize: 12, mt: 0.25 }} noWrap title={desc}>{desc}</Typography> : null}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {right}
        <Box sx={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected ? ORANGE : "#CBD5E1"}`, bgcolor: selected ? ORANGE : "#fff", color: "#fff", display: "grid", placeItems: "center" }} aria-checked={selected}>
          {selected ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : null}
        </Box>
      </Box>
    </Box>
  );
}

function SummaryRow({ label, value }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
      <Typography sx={{ color: MUTED }}>{label}</Typography>
      <Typography sx={{ color: DARK }}>{value}</Typography>
    </Box>
  );
}

/**
 * CheckoutPage
 * Collects billing info and a payment method; posts a demo checkout payload.
 */
export default function CheckoutPage() {
  // Cart
  const linesBase  = useSelector(selectCartItemsNormalized);
  const totalsBase = useSelector(selectCartTotalsBase);

  // Currency
  const currency = useSelector(selectCurrency);
  const rates    = useSelector(selectRates);
  const fmt      = (v) => formatCurrency(v, rates, currency);

  const totalsUi = useMemo(() => ({
    sub:   fmt(totalsBase.subtotalBase),
    disc:  totalsBase.discountBase ? `-${fmt(totalsBase.discountBase)}` : fmt(0),
    ship:  "Free",
    tax:   fmt(totalsBase.taxBase),
    total: fmt(totalsBase.totalBase),
  }), [totalsBase, fmt]);

  // Payment methods from account (optional quick-pick)
  const { data: paymentMethods } = useGetPaymentMethodsQuery();
  const savedCards = paymentMethods?.data || [];

  // Form
  const [payment, setPayment] = useState("card");
  const [shipDiff, setShipDiff] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", company: "", address: "",
    country: "", state: "", city: "", zip: "",
    email: "", phone: "",
    cardName: "", cardNumber: "", cardExp: "", cardCvc: "",
    notes: "",
  });
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const [error, setError] = useState("");
  const [demoCheckout, { isLoading }] = useDemoCheckoutMutation();

  const copySavedCard = (pm) => {
    setForm((s) => ({
      ...s,
      cardName: pm.name || s.cardName,
      cardNumber: `**** **** **** ${pm.last4 || ""}`,
      cardExp: pm.expMonth && pm.expYear ? `${String(pm.expMonth).padStart(2, "0")}/${pm.expYear}` : s.cardExp,
    }));
  };

  const placeOrder = async () => {
    setError("");

    // === [NEW LOGIC - 2025-10-25]: block checkout on empty cart
    // PRO: Prevents API calls with no items; gives a clear, user-safe message.
    if (!linesBase.length) {
      setError("Your cart is empty. Please add items before checkout.");
      return;
    }

    // required: email always
    if (!form.email.trim()) {
      setError("Email is required for checkout.");
      return;
    }

    // required: if card selected
    if (payment === "card") {
      const digits = String(form.cardNumber || "").replace(/\D+/g, "");
      if (!form.cardName.trim() || digits.length < 4 || !form.cardExp.trim() || !form.cardCvc.trim()) {
        setError("Please complete card details (name, number, expiry, CVC).");
        return;
      }
    }

    const payload = {
      paymentMethod: payment,
      customer: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        company: form.company,
        address: {
          line1: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
      },
      shippingSameAsBilling: !shipDiff,
      card: payment === "card" ? {
        name: form.cardName,
        last4: String(form.cardNumber || "").replace(/\D+/g, "").slice(-4),
      } : undefined,
      lines: linesBase.map((l) => ({
        id: l.id,
        productId: l.productId,
        title: l.title,
        image: l.image,
        qty: l.qty,
        unitPriceBase: l.priceBase,
      })),
      totalsBase,
      notes: form.notes,
    };

    try {
      const res = await demoCheckout(payload).unwrap();
      const id = res?.data?._id || res?.data?.id;
      if (id) window.location.href = `/order-tracking?id=${id}`;
    } catch (err) {
      console.error("Checkout failed:", err);
      setError(err?.data?.message || err?.error || "Checkout failed. Please try again.");
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 6 }, py: { xs: 2, md: 4 }, maxWidth: 1280, mx: "auto" }}>
      <Grid container spacing={3}>
        {/* LEFT */}
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2, mb: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontWeight: 800, color: DARK }}>Billing Information</Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField label="First name" fullWidth size="small" value={form.firstName} onChange={set("firstName")} /></Grid>
                <Grid item xs={12} sm={6}><TextField label="Last name" fullWidth size="small" value={form.lastName} onChange={set("lastName")} /></Grid>
                <Grid item xs={12}><TextField label="Company Name (Optional)" fullWidth size="small" value={form.company} onChange={set("company")} /></Grid>
                <Grid item xs={12}><TextField label="Address" fullWidth size="small" value={form.address} onChange={set("address")} /></Grid>

                <Grid item xs={12} sm={3}>
                  <TextField label="Country" select fullWidth size="small" value={form.country} onChange={set("country")}>
                    <MenuItem value="USA">USA</MenuItem>
                    <MenuItem value="UK">UK</MenuItem>
                    <MenuItem value="PK">Pakistan</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}><TextField label="Region/State" fullWidth size="small" value={form.state} onChange={set("state")} /></Grid>
                <Grid item xs={12} sm={3}><TextField label="City" fullWidth size="small" value={form.city} onChange={set("city")} /></Grid>
                <Grid item xs={12} sm={3}><TextField label="Zip Code" fullWidth size="small" value={form.zip} onChange={set("zip")} /></Grid>

                <Grid item xs={12} sm={6}><TextField label="Email *" required fullWidth size="small" value={form.email} onChange={set("email")} /></Grid>
                <Grid item xs={12} sm={6}><TextField label="Phone Number" fullWidth size="small" value={form.phone} onChange={set("phone")} /></Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox checked={shipDiff} onChange={(e) => setShipDiff(e.target.checked)} />}
                    label="Ship to different address"
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Payment Options */}
          <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2, mb: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontWeight: 800, color: DARK }}>Payment Option</Typography>
            </Box>

            <Box sx={{ p: 2, display: "grid", gap: 1.25 }}>
              <Grid container spacing={1.25}>
                <Grid item xs={12} sm={6}>
                  <PaymentOptionCard value="cod" selected={payment === "cod"} onSelect={setPayment} icon={<LocalAtmIcon fontSize="small" />} label="Cash on Delivery" desc="Pay with cash upon delivery" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <PaymentOptionCard value="venmo" selected={payment === "venmo"} onSelect={setPayment} icon={<PaymentsIcon fontSize="small" />} label="Venmo" desc="Fast wallet payment" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <PaymentOptionCard value="paypal" selected={payment === "paypal"} onSelect={setPayment} icon={<PaymentsIcon fontSize="small" />} label="PayPal" desc="Secure checkout with PayPal" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <PaymentOptionCard value="amazon" selected={payment === "amazon"} onSelect={setPayment} icon={<LocalShippingIcon fontSize="small" />} label="Amazon Pay" desc="Use your Amazon account" />
                </Grid>
                <Grid item xs={12}>
                  <PaymentOptionCard
                    value="card"
                    selected={payment === "card"}
                    onSelect={setPayment}
                    icon={<CreditCardIcon fontSize="small" />}
                    label="Debit / Credit Card"
                    desc="We accept major cards"
                    right={<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><VisaBadge /><McBadge /></Box>}
                  />
                </Grid>
              </Grid>

              {payment === "card" && (
                <>
                  {/* quick pick saved cards (optional) */}
                  {savedCards?.length ? (
                    <FormControl sx={{ mt: 1 }}>
                      <FormLabel sx={{ fontSize: 13, color: MUTED }}>Use saved card</FormLabel>
                      {/* Using buttons for quick fill is fine; RadioGroup kept for visual grouping */}
                      <RadioGroup row>
                        {savedCards.map((pm) => (
                          <Button
                            key={pm._id || pm.id}
                            variant="outlined"
                            size="small"
                            onClick={() => copySavedCard(pm)}
                            sx={{ mr: 1, mb: 1, textTransform: "none" }}
                          >
                            {pm.brand?.toUpperCase() || "CARD"} •••• {pm.last4}
                          </Button>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  ) : null}

                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}><TextField label="Name on Card" placeholder="John A. Doe" fullWidth size="small" value={form.cardName} onChange={set("cardName")} /></Grid>
                    <Grid item xs={12}><TextField label="Card Number" placeholder="4242 4242 4242 4242" fullWidth size="small" inputProps={{ inputMode: "numeric" }} value={form.cardNumber} onChange={set("cardNumber")} /></Grid>
                    <Grid item xs={6} sm={4}><TextField label="Expire Date" placeholder="MM/YY" fullWidth size="small" value={form.cardExp} onChange={set("cardExp")} /></Grid>
                    <Grid item xs={6} sm={4}><TextField label="CVC" placeholder="***" fullWidth size="small" inputProps={{ inputMode: "numeric", maxLength: 4 }} value={form.cardCvc} onChange={set("cardCvc")} /></Grid>
                  </Grid>
                </>
              )}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontWeight: 800, color: DARK }}>Additional Information</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <TextField multiline rows={3} placeholder="Notes about your order, e.g. special notes for delivery" fullWidth size="small" value={form.notes} onChange={set("notes")} />
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT: Summary */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontWeight: 800, color: DARK }}>Order Summary</Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              {linesBase.map((l) => (
                <Box key={l.id} sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar src={absUrl(l.image)} variant="square" sx={{ width: 44, height: 44, mr: 1.5, borderRadius: 1, border: `1px solid ${BORDER}` }} onError={(e) => (e.currentTarget.src = "/uploads/placeholder.png")} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap title={l.title} sx={{ color: DARK, fontWeight: 600 }}>{l.title}</Typography>
                    <Typography variant="caption" sx={{ color: MUTED }}>{l.qty} × {fmt(l.priceBase)}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: DARK }}>{fmt(l.subtotalBase)}</Typography>
                </Box>
              ))}

              <Divider sx={{ my: 1.5 }} />
              <SummaryRow label="Sub-total" value={totalsUi.sub} />
              <SummaryRow label="Shipping" value={totalsUi.ship} />
              <SummaryRow label="Discount" value={totalsUi.disc} />
              <SummaryRow label="Tax" value={totalsUi.tax} />
              <Divider sx={{ my: 1.5 }} />
              <SummaryRow label={<b>Total</b>} value={<b style={{ color: ORANGE }}>{totalsUi.total}</b>} />

              <Button
                variant="contained"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                onClick={placeOrder}
                disabled={!linesBase.length || isLoading}
                sx={{ mt: 2, bgcolor: ORANGE, fontWeight: 800, textTransform: "none", height: 44, "&:hover": { bgcolor: "#E7712F" } }}
              >
                {isLoading ? "PLACING..." : "PLACE ORDER"}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
