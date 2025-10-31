/**
 * TrackOrder
 * Short: Public form to look up an order and redirect to the tracking page.

 */

import React, { useState } from "react";
import {
  Box, Typography, Grid, TextField, Button, Alert, CircularProgress, Stack,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
import { useTrackOrderMutation } from "../store/api/orders.inject";
import { displayOrderId } from "../utils/orders";

/* tokens */
const ORANGE = "#FA8232";
const DARK   = "#191C1F";
const MUTED  = "#5F6C72";
const BORDER = "#E5E7EB";
const MAX_W  = 1320;
const FORM_W = 720;

/**
 * TrackOrder
 * Shows two-field form (Order ID + Billing Email), calls /track and redirects to order-tracking page.
 */
export default function TrackOrder() {
  const navigate = useNavigate();
  const [trackOrder, { isLoading }] = useTrackOrderMutation();

  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  const validEmail = (v) => /\S+@\S+\.\S+/.test(v);

  //  trim & sanitize before submit
  // PRO: Prevents accidental spaces and reduces backend validation noise. Keeps UI messages user-safe.
  const handleSubmit = async () => {
    const idTrimmed = (orderId || "").trim();
    const emailTrimmed = (email || "").trim();

    setErr("");
    setResult(null);

    if (!idTrimmed) { setErr("Please enter your Order ID."); return; }
    if (!emailTrimmed || !validEmail(emailTrimmed)) { setErr("Please enter a valid billing email."); return; }

    try {
      const res = await trackOrder({ orderId: idTrimmed, email: emailTrimmed }).unwrap();
      setResult(res || null);

      // Always go to public dynamic tracking page (ID path + email query for fallback)
      const idKey = res?.id || res?._id || idTrimmed;
      navigate(`/order-tracking/${encodeURIComponent(idKey)}?e=${encodeURIComponent(emailTrimmed)}`);
    } catch (e) {
      setErr(e?.data?.message || e?.error || e?.message || "Order not found. Please check the details and try again.");
    }
  };

  return (
    <Box sx={{ py: 6, px: 2 }}>
      <Box sx={{ maxWidth: MAX_W, mx: "auto" }}>
        <Typography sx={{ fontWeight: 700, fontSize: 24, color: DARK, mb: 1 }}>
          Track Order
        </Typography>

        <Typography sx={{ color: MUTED, maxWidth: FORM_W, mb: 3, lineHeight: 1.55 }}>
          Enter your order ID and billing email, then click “Track Order”.
        </Typography>

        <Grid container spacing={1.5} sx={{ maxWidth: FORM_W }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth label="Order ID" placeholder="ID..." size="small"
              value={orderId} onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth label="Billing Email" placeholder="Email address" size="small"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: MUTED }}>
          <Box
            sx={{
              width: 18, height: 18, borderRadius: "50%", border: `1px solid ${BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 12, color: MUTED }} />
          </Box>
          <Typography sx={{ fontSize: 12 }}>
            This ID was sent to your email after purchase.
          </Typography>
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            variant="contained"
            endIcon={isLoading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <ArrowForwardIcon />}
            sx={{
              bgcolor: ORANGE, color: "#fff", fontWeight: 800, px: 3, py: 1.25, borderRadius: 1,
              textTransform: "uppercase", "&:hover": { bgcolor: "#E7712F" },
            }}
          >
            Track Order
          </Button>

          {err ? <Alert severity="error" sx={{ mt: 2, maxWidth: FORM_W }}>{err}</Alert> : null}
        </Box>

        {/* Optional instant preview (not required for redirect) */}
        {result && (
          <Box
            sx={{ mt: 3, maxWidth: FORM_W, border: `1px solid ${BORDER}`, borderRadius: 1, p: 2, bgcolor: "#fff" }}
          >
            <Typography sx={{ fontWeight: 700, mb: 0.5, color: DARK }}>
              Order #{displayOrderId(result) || orderId}
            </Typography>
            <Typography sx={{ color: MUTED }}>
              Status: <b style={{ color: DARK }}>{result.status || "Processing"}</b>
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
