/**
 * Newsletter
 * Summary: Email capture with API fallback; brands row + toast feedback.
 */

import React, { useState } from "react";
import { Box, Typography, TextField, Button, Grid, InputAdornment, Snackbar, Alert } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const BG = "#22628E";
const ORANGE = "#FA8232";
const WHITE = "#FFFFFF";
const TOAST_MS = 1600;
const INPUT_HEIGHT = 48;

const brands = ["Google", "Amazon", "PHILIPS", "TOSHIBA", "SAMSUNG"];

const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

/**
 * @param {{ onSubscribe?: (email: string) => Promise<void> }} props
 */
export default function Newsletter({ onSubscribe }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" });

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Guard submit with lightweight email validation; keep server error messages user-safe.
   */
  const submit = async (e) => {
    e.preventDefault();
    const em = email.trim();
    if (!emailOk(em)) {
      setToast({ msg: "Please enter a valid email address.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      if (onSubscribe) {
        await onSubscribe(em);
      } else {
        const r = await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: em }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.message || "We couldn’t subscribe you right now. Please try again.");
        }
      }
      setEmail("");
      setToast({ msg: "Thanks! You’re subscribed.", type: "success" });
    } catch (err) {
      setToast({ msg: err.message || "Something went wrong. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: BG, color: WHITE, py: { xs: 6, md: 10 }, px: { xs: 2, md: 0 } }}>
      <Box sx={{ maxWidth: 900, mx: "auto", textAlign: "center" }}>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 24 }, mb: 1.5, color: "white", letterSpacing: 0.2 }}>
          Subscribe to our newsletter
        </Typography>

        <Typography
          sx={{
            maxWidth: 660,
            mx: "auto",
            color: "rgba(255,255,255,.85)",
            fontSize: 13.5,
            lineHeight: 1.65,
            mb: 3,
          }}
        >
          Praesent fringilla erat a lacinia egestas. Donec vehicula tempor libero et cursus. Donec non quam urna.
          Quisque vitae porta ipsum.
        </Typography>

        <Box
          component="form"
          onSubmit={submit}
          sx={{
            maxWidth: 640,
            mx: "auto",
            width: "100%",
            mb: 3.5,
            borderRadius: 1,
            overflow: "hidden",
            boxShadow: "0 6px 16px rgba(0,0,0,.12)",
            display: "flex",
            alignItems: "stretch",
            bgcolor: WHITE,
          }}
          aria-label="Newsletter subscription form"
        >
          <TextField
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            fullWidth
            variant="outlined"
            InputProps={{
              sx: {
                bgcolor: WHITE,
                "& fieldset": { border: "none" },
                px: 1.5,
                height: INPUT_HEIGHT,
              },
              endAdornment: (
                <InputAdornment position="end" sx={{ p: 0 }}>
                  <Button
                    type="submit"
                    disabled={loading || !emailOk(email)}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      height: INPUT_HEIGHT,
                      borderRadius: 0,
                      px: 3,
                      bgcolor: ORANGE,
                      color: WHITE,
                      fontWeight: 900,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      "&:hover": { bgcolor: "#E7712F" },
                    }}
                    aria-label="Subscribe to newsletter"
                  >
                    Subscribe
                  </Button>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ maxWidth: 640, mx: "auto", height: 1, bgcolor: "rgba(255,255,255,.25)", mb: { xs: 3, md: 4 } }} />

        <Grid container spacing={{ xs: 2, md: 4 }} justifyContent="center" sx={{ opacity: 0.85 }}>
          {brands.map((b) => (
            <Grid item key={b}>
              <Typography sx={{ color: WHITE, fontWeight: 800, fontSize: { xs: 12, md: 13 }, letterSpacing: 1.5 }}>
                {b}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Snackbar
          open={!!toast.msg}
          autoHideDuration={TOAST_MS}
          onClose={() => setToast({ msg: "", type: "success" })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={toast.type} variant="filled" onClose={() => setToast({ msg: "", type: "success" })}>
            {toast.msg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
