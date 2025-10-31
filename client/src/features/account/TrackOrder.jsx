// src/pages/TrackOrder.jsx
/**
 * Summary:
 * Simple Track Order form with a server call or parent-provided handler.

 */

import React, { useState } from "react";
import {
  Box, Typography, Grid, TextField, Button, Alert, CircularProgress, Stack, Divider, IconButton,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";

const ORANGE = "#FA8232";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";

const isEmail = (v = "") => /\S+@\S+\.\S+/.test(v.trim());

export default function TrackOrder({ onTrack }) {
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  const canSubmit = orderId.trim().length > 0 && isEmail(email);

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setErr("");
    setResult(null);

    const payload = {
      orderId: orderId.trim(),
      email: email.trim().toLowerCase(),
    };

    setLoading(true);
    try {
      if (typeof onTrack === "function") {
        // PRO: Allow parent to fully control tracking (SSR, adapter, etc.)
        const data = await onTrack(payload);
        setResult(data || null);
      } else {
        const res = await fetch("/api/orders/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          let msg = "Order not found. Check your details.";
          try {
            const j = await res.json();
            if (j?.message) msg = j.message;
          } catch {}
          throw new Error(msg);
        }
        const data = await res.json().catch(() => ({}));
        setResult(data || null);
      }
    } catch (e) {
      setErr(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnter = (e) => { if (e.key === "Enter") handleSubmit(); };

  const goToOrder = () => {
    const id = result?.id || orderId.trim();
    if (!id) return;
    navigate(`/account/orders/${encodeURIComponent(id)}`);
  };

  return (
    <Box sx={{ py: 6, px: 2 }}>
      <Box sx={{ maxWidth: 1320, mx: "auto" }}>
        {/* Title */}
        <Typography sx={{ fontWeight: 700, fontSize: 24, color: DARK, mb: 1 }}>
          Track Order
        </Typography>

        {/* Description */}
        <Typography sx={{ color: MUTED, maxWidth: 720, mb: 3, lineHeight: 1.55 }}>
          To track your order please enter your order ID in the input field below and press the
          “Track Order” button. This was given to you on your receipt and in the confirmation
          email you should have received.
        </Typography>

        {/* Inputs */}
        <Grid container spacing={1.5} sx={{ maxWidth: 720 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Order ID"
              placeholder="ID..."
              size="small"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={handleEnter}
              inputProps={{ "aria-label": "Order ID" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Billing Email"
              placeholder="Email address"
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleEnter}
              error={!!email && !isEmail(email)}
              helperText={email && !isEmail(email) ? "Please enter a valid email." : " "}
              inputProps={{ "aria-label": "Billing email" }}
            />
          </Grid>
        </Grid>

        {/* Info note */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: MUTED }}>
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden
          >
            <InfoOutlinedIcon sx={{ fontSize: 12, color: MUTED }} />
          </Box>
          <Typography sx={{ fontSize: 12 }}>
            Order ID that we sent to you in your email address.
          </Typography>
        </Stack>

        {/* CTA + error */}
        <Box sx={{ mt: 3 }}>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            variant="contained"
            endIcon={loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <ArrowForwardIcon />}
            sx={{
              bgcolor: ORANGE,
              color: "#fff",
              fontWeight: 800,
              px: 3,
              py: 1.25,
              borderRadius: 1,
              textTransform: "uppercase",
              "&:hover": { bgcolor: "#E7712F" },
            }}
          >
            Track Order
          </Button>

          {err ? (
            <Alert severity="error" sx={{ mt: 2, maxWidth: 720 }}>
              {err}
            </Alert>
          ) : null}
        </Box>

        {/* Success summary */}
        {result && (
          <Box
            sx={{
              mt: 3,
              maxWidth: 720,
              border: `1px solid ${BORDER}`,
              borderRadius: 1,
              p: 2,
              bgcolor: "#fff",
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 0.5, color: DARK }}>
              Order #{result.number || orderId}
            </Typography>
            <Typography sx={{ color: MUTED, mb: 1 }}>
              Status: <b style={{ color: DARK }}>{result.status || "Processing"}</b>
              {result.eta ? ` • ETA: ${result.eta}` : ""}
            </Typography>

            {result.lastUpdate ? (
              <Typography sx={{ color: MUTED, fontSize: 13, mb: 1 }}>
                Last update: {result.lastUpdate}
              </Typography>
            ) : null}

            <Divider sx={{ my: 1.25 }} />

            <Stack direction="row" spacing={1}>
              <Button
                onClick={goToOrder}
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                sx={{
                  borderColor: BORDER,
                  color: DARK,
                  fontWeight: 700,
                  "&:hover": { borderColor: DARK },
                }}
              >
                View order
              </Button>
              <IconButton size="small" onClick={() => setResult(null)} sx={{ ml: "auto" }} aria-label="Hide summary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" stroke={MUTED} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </IconButton>
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}
