// src/pages/account/Settings.jsx
/**
 * Settings
 * - Profile, addresses, default payment, avatar, password.
 * - ===== NEW LOGIC: hydrate snapshot + dirty detection, cardEdited guard, partial defaultCard submit, resilient avatar, focused error UX =====
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Grid, Paper, Typography, Avatar, TextField, Button, Alert, MenuItem, Stack,
  IconButton, InputAdornment, Divider,
} from "@mui/material";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import PaymentsIcon from "@mui/icons-material/Payments";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useMeQuery, useUpdateMeMutation, useChangePasswordMutation } from "../../store/api/apiSlice";

const BORDER = "#E5E7EB";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const ORANGE = "#FA8232";
const ORANGE_HOVER = "#E7712F";
const COUNTRY_OPTIONS = ["USA", "UK", "Pakistan"];

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

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
      <Box
        sx={{
          width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "50%",
          bgcolor: selected ? ORANGE : "#F3F4F6", color: selected ? "#fff" : DARK,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, color: DARK, lineHeight: 1.2 }}>{label}</Typography>
        {desc ? (
          <Typography sx={{ color: MUTED, fontSize: 12, mt: 0.25 }} noWrap title={desc}>
            {desc}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {right}
        <Box
          sx={{
            width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected ? ORANGE : "#CBD5E1"}`,
            bgcolor: selected ? ORANGE : "#fff", color: "#fff", display: "grid", placeItems: "center",
          }}
          aria-checked={selected}
        >
          {selected ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : null}
        </Box>
      </Box>
    </Box>
  );
}

export default function Settings() {
  const { data: meData, isLoading, isFetching, isSuccess } = useMeQuery();
  const me = useMemo(() => meData ?? {}, [meData]);

  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();
  const [changePwd, { isLoading: cpSaving }] = useChangePasswordMutation();

  const [hydrated, setHydrated] = useState(false);

  const [profile, setProfile] = useState({
    displayName: "",
    username: "",
    fullName: "",
    email: "",
    secondaryEmail: "",
    phone: "",
    country: "USA",
    state: "",
    city: "",
    zip: "",
  });

  const [billing, setBilling] = useState({
    firstName: "",
    lastName: "",
    company: "",
    address: "",
    country: "USA",
    state: "",
    city: "",
    zip: "",
    email: "",
    phone: "",
  });

  const [shipping, setShipping] = useState({
    firstName: "",
    lastName: "",
    company: "",
    address: "",
    country: "USA",
    state: "",
    city: "",
    zip: "",
    email: "",
    phone: "",
  });

  const [payment, setPayment] = useState("card");
  const [card, setCard] = useState({ name: "", number: "", exp: "" });

  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "", show: false });

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  // avatar
  const [avatarPreview, setAvatarPreview] = useState("");
  const fileRef = useRef(null);

  // ===== NEW LOGIC: snapshot of original values for “dirty” checks (profile/billing/shipping/payment) =====
  const originalRef = useRef({
    profile: {},
    billing: {},
    shipping: {},
    defPay: "card",
    defCard: { name: "", last4: "", exp: "" },
  });

  useEffect(() => {
    if (!isSuccess || hydrated) return;

    const b = me.billingAddress || me.billing || {};
    const s = me.shippingAddress || me.shipping || {};
    const defPay = me.defaultPaymentMethod || "card";
    const defCard = me.defaultCard || me.card || {};

    const nextProfile = {
      displayName: me.displayName || "",
      username: me.username || "",
      fullName: me.name || me.fullName || "",
      email: me.email || "",
      secondaryEmail: me.secondaryEmail || "",
      phone: me.phone || "",
      country: me.country || b.country || "USA",
      state: me.state || b.state || "",
      city: me.city || b.city || "",
      zip: me.zip || b.zip || "",
    };
    setProfile(nextProfile);

    const nextBilling = {
      firstName: b.firstName || "",
      lastName: b.lastName || "",
      company: b.company || "",
      address: b.line1 || b.address || "",
      country: b.country || "USA",
      state: b.state || "",
      city: b.city || "",
      zip: b.zip || "",
      email: b.email || me.email || "",
      phone: b.phone || me.phone || "",
    };
    setBilling(nextBilling);

    const nextShipping = {
      firstName: s.firstName || "",
      lastName: s.lastName || "",
      company: s.company || "",
      address: s.line1 || s.address || "",
      country: s.country || "USA",
      state: s.state || "",
      city: s.city || "",
      zip: s.zip || "",
      email: s.email || me.email || "",
      phone: s.phone || me.phone || "",
    };
    setShipping(nextShipping);

    setPayment(defPay);
    setCard({ name: defCard.name || "", number: "", exp: defCard.exp || "" });

    setAvatarPreview(me.avatarAbs || me.avatarUrl || me?.profile?.avatarUrl || "");

    // ===== NEW LOGIC: capture originals for dirty comparison =====
    originalRef.current = {
      profile: nextProfile,
      billing: nextBilling,
      shipping: nextShipping,
      defPay,
      defCard: { name: defCard.name || "", last4: defCard.last4 || "", exp: defCard.exp || "" },
    };
    setHydrated(true);
  }, [isSuccess, hydrated, me]);

  const onPickAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    setAvatarPreview(dataUrl);
  };

  // ===== NEW LOGIC: did user actually edit card block? =====
  const cardEdited = useMemo(() => {
    const digits = String(card.number || "").replace(/\D+/g, "");
    const last4 = digits.slice(-4);
    const orig = originalRef.current;
    return (
      payment !== orig.defPay ||
      (payment === "card" &&
        (card.name.trim() !== (orig.defCard.name || "") ||
          (last4 && last4 !== (orig.defCard.last4 || "")) ||
          card.exp.trim() !== (orig.defCard.exp || "")))
    );
  }, [payment, card]);

  // ===== NEW LOGIC: full “dirty” detection for save button =====
  const isDirty = useMemo(() => {
    const orig = originalRef.current;

    const shallowEq = (a, b) => {
      const ka = Object.keys(a || {});
      const kb = Object.keys(b || {});
      if (ka.length !== kb.length) return true;
      for (const k of ka) if ((a ?? {})[k] !== (b ?? {})[k]) return true;
      return false;
    };

    const profDirty = shallowEq(profile, orig.profile);
    const billDirty = shallowEq(billing, orig.billing);
    const shipDirty = shallowEq(shipping, orig.shipping);
    return profDirty || billDirty || shipDirty || cardEdited || avatarPreview !== (me.avatarAbs || me.avatarUrl || me?.profile?.avatarUrl || "");
  }, [profile, billing, shipping, cardEdited, avatarPreview, me]);

  const doSaveProfile = async () => {
    setMsg("");
    setErr("");

    // ===== NEW LOGIC: validate card only when edited/switching to card =====
    if (payment === "card" && cardEdited) {
      const digits = String(card.number || "").replace(/\D+/g, "");
      const last4 = digits.slice(-4);
      if (card.name.trim().length < 2) {
        setErr("Please enter the card holder name.");
        return;
      }
      if (!last4) {
        setErr("Please enter a valid card number (at least last 4).");
        return;
      }
    }

    const digits = String(card.number || "").replace(/\D+/g, "");
    const last4 = digits.slice(-4);

    const body = {
      profile: {
        displayName: profile.displayName,
        username: profile.username,
        fullName: profile.fullName,
        email: profile.email,
        secondaryEmail: profile.secondaryEmail,
        phone: profile.phone,
        country: profile.country,
        state: profile.state,
        city: profile.city,
        zip: profile.zip,
        avatarUrl: avatarPreview || undefined,
      },
      billingAddress: {
        firstName: billing.firstName,
        lastName: billing.lastName,
        company: billing.company,
        line1: billing.address,
        city: billing.city,
        state: billing.state,
        zip: billing.zip,
        country: billing.country,
        email: billing.email,
        phone: billing.phone,
      },
      shippingAddress: {
        firstName: shipping.firstName,
        lastName: shipping.lastName,
        company: shipping.company,
        line1: shipping.address,
        city: shipping.city,
        state: shipping.state,
        zip: shipping.zip,
        country: shipping.country,
        email: shipping.email,
        phone: shipping.phone,
      },
      defaultPaymentMethod: payment,
      // ===== NEW LOGIC: only send defaultCard if edited/switching to card =====
      ...(payment === "card" && cardEdited
        ? {
            defaultCard: {
              name: card.name || "",
              last4: last4 || undefined,
              exp: card.exp || "",
            },
          }
        : {}),
    };

    try {
      await updateMe(body).unwrap();
      setMsg("Changes saved.");

      // ===== NEW LOGIC: refresh “original” snapshot for next edit round =====
      originalRef.current = {
        profile: body.profile,
        billing: body.billingAddress,
        shipping: body.shippingAddress,
        defPay: body.defaultPaymentMethod,
        defCard: {
          name: (body.defaultCard?.name ?? originalRef.current.defCard.name) || "",
          last4: (body.defaultCard?.last4 ?? originalRef.current.defCard.last4) || "",
          exp: (body.defaultCard?.exp ?? originalRef.current.defCard.exp) || "",
        },
      };
    } catch (e) {
      setErr(e?.data?.message || e?.error || e?.message || "Failed to save changes.");
      console.error("updateMe failed:", e);
    }
  };

  const doChangePassword = async () => {
    setPwdMsg("");
    setPwdErr("");
    if (!pwd.currentPassword || !pwd.newPassword || !pwd.confirmPassword) {
      setPwdErr("Fill all password fields.");
      return;
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdErr("New password and confirm password do not match.");
      return;
    }
    try {
      await changePwd({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      }).unwrap();
      setPwdMsg("Password changed successfully.");
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "", show: false });
    } catch (e) {
      setPwdErr(e?.data?.message || e?.error || e?.message || "Failed to change password.");
      console.error("changePassword failed:", e);
    }
  };

  if (isLoading && !hydrated) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading settings…</Typography>
      </Box>
    );
  }

  const textProps = { size: "small", fullWidth: true };
  const SaveBtn = ({ onClick, disabled, children = "SAVE CHANGES" }) => (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="contained"
      sx={{ mt: 2, bgcolor: ORANGE, fontWeight: 800, "&:hover": { bgcolor: ORANGE_HOVER } }}
    >
      {disabled ? "Saving…" : children}
    </Button>
  );

  return (
    <Box>
      {/* ACCOUNT SETTING */}
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Account Setting</Typography>
          {isFetching && <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Refreshing…</Typography>}
        </Stack>

        {msg && <Alert severity="success" sx={{ mb: 1 }}>{msg}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Box sx={{ position: "relative", width: 96 }}>
              <Avatar
                sx={{ width: 96, height: 96 }}
                src={avatarPreview || me.avatarAbs || me.avatarUrl || ""}
                alt={profile.displayName || profile.fullName || "User"}
              />
              <IconButton
                onClick={() => fileRef.current?.click()}
                sx={{
                  position: "absolute",
                  right: -8,
                  bottom: -8,
                  bgcolor: "#fff",
                  border: "1px solid #e5e7eb",
                  "&:hover": { bgcolor: "#fff" },
                }}
                size="small"
                aria-label="Upload avatar"
              >
                <PhotoCamera fontSize="small" />
              </IconButton>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} hidden />
            </Box>
          </Grid>

          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Display name" {...textProps}
                  value={profile.displayName}
                  onChange={(e) => setProfile((s) => ({ ...s, displayName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Username" {...textProps}
                  value={profile.username}
                  onChange={(e) => setProfile((s) => ({ ...s, username: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Full Name" {...textProps}
                  value={profile.fullName}
                  onChange={(e) => setProfile((s) => ({ ...s, fullName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email" {...textProps}
                  value={profile.email}
                  onChange={(e) => setProfile((s) => ({ ...s, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Secondary Email" {...textProps}
                  value={profile.secondaryEmail}
                  onChange={(e) => setProfile((s) => ({ ...s, secondaryEmail: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone Number" {...textProps}
                  value={profile.phone}
                  onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Country/Region" select {...textProps}
                  value={profile.country}
                  onChange={(e) => setProfile((s) => ({ ...s, country: e.target.value }))}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Region/State" {...textProps}
                  value={profile.state}
                  onChange={(e) => setProfile((s) => ({ ...s, state: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="City" {...textProps}
                  value={profile.city}
                  onChange={(e) => setProfile((s) => ({ ...s, city: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Zip Code" {...textProps}
                  value={profile.zip}
                  onChange={(e) => setProfile((s) => ({ ...s, zip: e.target.value }))}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* ===== NEW LOGIC: disable save unless something changed ===== */}
        <SaveBtn onClick={doSaveProfile} disabled={saving || !isDirty} />
      </Paper>

      {/* BILLING + SHIPPING */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Billing Address</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField label="First Name" {...textProps}
                  value={billing.firstName}
                  onChange={(e) => setBilling((s) => ({ ...s, firstName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Last Name" {...textProps}
                  value={billing.lastName}
                  onChange={(e) => setBilling((s) => ({ ...s, lastName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Company Name (Optional)" {...textProps}
                  value={billing.company}
                  onChange={(e) => setBilling((s) => ({ ...s, company: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Address" {...textProps}
                  value={billing.address}
                  onChange={(e) => setBilling((s) => ({ ...s, address: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField label="Country" select fullWidth size="small"
                  value={billing.country}
                  onChange={(e) => setBilling((s) => ({ ...s, country: e.target.value }))}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="Region/State" {...textProps}
                  value={billing.state}
                  onChange={(e) => setBilling((s) => ({ ...s, state: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="City" {...textProps}
                  value={billing.city}
                  onChange={(e) => setBilling((s) => ({ ...s, city: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="Zip Code" {...textProps}
                  value={billing.zip}
                  onChange={(e) => setBilling((s) => ({ ...s, zip: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="Email" {...textProps}
                  value={billing.email}
                  onChange={(e) => setBilling((s) => ({ ...s, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone Number" {...textProps}
                  value={billing.phone}
                  onChange={(e) => setBilling((s) => ({ ...s, phone: e.target.value }))}
                />
              </Grid>
            </Grid>
            <SaveBtn onClick={doSaveProfile} disabled={saving || !isDirty} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Shipping Address</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField label="First Name" {...textProps}
                  value={shipping.firstName}
                  onChange={(e) => setShipping((s) => ({ ...s, firstName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Last Name" {...textProps}
                  value={shipping.lastName}
                  onChange={(e) => setShipping((s) => ({ ...s, lastName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Company Name (Optional)" {...textProps}
                  value={shipping.company}
                  onChange={(e) => setShipping((s) => ({ ...s, company: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Address" {...textProps}
                  value={shipping.address}
                  onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField label="Country" select fullWidth size="small"
                  value={shipping.country}
                  onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="Region/State" {...textProps}
                  value={shipping.state}
                  onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="City" {...textProps}
                  value={shipping.city}
                  onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="Zip Code" {...textProps}
                  value={shipping.zip}
                  onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="Email" {...textProps}
                  value={shipping.email}
                  onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone Number" {...textProps}
                  value={shipping.phone}
                  onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                />
              </Grid>
            </Grid>
            <SaveBtn onClick={doSaveProfile} disabled={saving || !isDirty} />
          </Paper>
        </Grid>
      </Grid>

      {/* DEFAULT PAYMENT */}
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2, mt: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Default Payment Method</Typography>

        <Grid container spacing={1.25}>
          <Grid item xs={12} sm={6} md={4}>
            <PaymentOptionCard
              value="cod"
              selected={payment === "cod"}
              onSelect={setPayment}
              icon={<LocalAtmIcon fontSize="small" />}
              label="Cash on Delivery"
              desc="Pay with cash upon delivery"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <PaymentOptionCard
              value="venmo"
              selected={payment === "venmo"}
              onSelect={setPayment}
              icon={<PaymentsIcon fontSize="small" />}
              label="Venmo"
              desc="Fast wallet payment"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <PaymentOptionCard
              value="paypal"
              selected={payment === "paypal"}
              onSelect={setPayment}
              icon={<PaymentsIcon fontSize="small" />}
              label="PayPal"
              desc="Secure checkout with PayPal"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <PaymentOptionCard
              value="amazon"
              selected={payment === "amazon"}
              onSelect={setPayment}
              icon={<LocalShippingIcon fontSize="small" />}
              label="Amazon Pay"
              desc="Use your Amazon account"
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <PaymentOptionCard
              value="card"
              selected={payment === "card"}
              onSelect={setPayment}
              icon={<CreditCardIcon fontSize="small" />}
              label="Debit / Credit Card"
              desc="We accept major cards"
              right={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <VisaBadge />
                  <McBadge />
                </Box>
              }
            />
          </Grid>
        </Grid>

        {payment === "card" && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Name on Card"
                  placeholder="John A. Doe"
                  fullWidth
                  size="small"
                  value={card.name}
                  onChange={(e) => setCard((s) => ({ ...s, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Card Number"
                  placeholder="4242 4242 4242 4242"
                  fullWidth
                  size="small"
                  inputProps={{ inputMode: "numeric" }}
                  value={card.number}
                  onChange={(e) => setCard((s) => ({ ...s, number: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Expire Date"
                  placeholder="MM/YY"
                  fullWidth
                  size="small"
                  value={card.exp}
                  onChange={(e) => setCard((s) => ({ ...s, exp: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Only the last 4 digits are saved. CVC is never stored.
                </Alert>
              </Grid>
            </Grid>
          </>
        )}

        <SaveBtn onClick={doSaveProfile} disabled={saving || !isDirty} />
      </Paper>

      {/* CHANGE PASSWORD */}
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2, mt: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Change Password</Typography>

        {pwdMsg && <Alert sx={{ mb: 1 }} severity="success">{pwdMsg}</Alert>}
        {pwdErr && <Alert sx={{ mb: 1 }} severity="error">{pwdErr}</Alert>}

        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Current Password"
              size="small"
              fullWidth
              type={pwd.show ? "text" : "password"}
              value={pwd.currentPassword}
              onChange={(e) => setPwd((s) => ({ ...s, currentPassword: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setPwd((s) => ({ ...s, show: !s.show }))}>
                      {pwd.show ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="New Password"
              size="small"
              fullWidth
              type={pwd.show ? "text" : "password"}
              value={pwd.newPassword}
              onChange={(e) => setPwd((s) => ({ ...s, newPassword: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setPwd((s) => ({ ...s, show: !s.show }))}>
                      {pwd.show ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Confirm Password"
              size="small"
              fullWidth
              type={pwd.show ? "text" : "password"}
              value={pwd.confirmPassword}
              onChange={(e) => setPwd((s) => ({ ...s, confirmPassword: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setPwd((s) => ({ ...s, show: !s.show }))}>
                      {pwd.show ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>

        <Button
          onClick={doChangePassword}
          disabled={cpSaving}
          variant="contained"
          sx={{ mt: 2, bgcolor: ORANGE, fontWeight: 800, "&:hover": { bgcolor: ORANGE_HOVER } }}
        >
          {cpSaving ? "Saving…" : "CHANGE PASSWORD"}
        </Button>
      </Paper>
    </Box>
  );
}
