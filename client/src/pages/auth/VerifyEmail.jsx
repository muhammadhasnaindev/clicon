// src/pages/auth/VerifyEmail.jsx
/**
 * VerifyEmail — enter email (if missing) + 6-digit code to verify.
 
 */

import React, { useMemo, useState } from "react";
import { Box, Paper, Typography, TextField, Button, Link, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ORANGE, BORDER, DARK, MUTED } from "../../theme/tokens";
import { useSelector } from "react-redux";
import { selectPendingEmail } from "../../store/slices/authSlice";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { useVerifyEmailMutation, useResendVerifyMutation } from "../../store/api/apiSlice";

const REDIRECT_DELAY_MS = 800;

/**
 * VerifyEmail screen
 * @returns {JSX.Element}
 */
export default function VerifyEmail() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const nav = useNavigate();
  const loc = useLocation();
  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  const pendingEmail = useSelector(selectPendingEmail) || "";
  const [email, setEmail] = useState(qs.get("email") || pendingEmail || "");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [verifyEmail,  { isLoading: verifying }] = useVerifyEmailMutation();
  const [resendVerify, { isLoading: resending }] = useResendVerifyMutation();

  /* ==== NEW LOGIC: soft email validity ====
     PRO: reduces accidental empty/invalid submissions without blocking rare cases. */
  const emailLooksOk = email.trim() && /.+@.+\..+/.test(email.trim());

  const onVerify = async () => {
    setErr(""); setMsg("");
    try {
      await verifyEmail({ email: email.trim(), code: code.trim() }).unwrap();
      setMsg("Verified! You can sign in now.");
      setTimeout(() => nav("/auth", { replace: true }), REDIRECT_DELAY_MS);
    } catch (e) {
      setErr(e?.data?.message || e?.error || "Verification failed");
    }
  };

  const onResend = async () => {
    setErr(""); setMsg("");
    try {
      await resendVerify(email.trim()).unwrap();
      setMsg("Verification code sent to your email.");
    } catch (e) {
      setErr(e?.data?.message || e?.error || "Failed to resend code");
    }
  };

  const emailMissing = !email.trim();

  return (
    <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center", p: { xs: 1.5, sm: 2 } }}>
      <Paper variant="outlined" sx={{ width: "100%", maxWidth: 480, borderColor: BORDER, borderRadius: { xs: 2, sm: 2 } }}>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, sm: 20 }, color: DARK, mb: 1 }}>
            Verify Your Email Address
          </Typography>
          <Typography sx={{ color: MUTED, fontSize: { xs: 13, sm: 14 }, mb: 2 }}>
            {emailMissing
              ? "Enter your email and the 6-digit code we sent."
              : <>Enter the 6-digit code sent to <b>{email}</b>.</>}
          </Typography>

          <Stack spacing={1.5} sx={{ mb: 1 }}>
            {emailMissing && (
              <TextField
                label="Email"
                fullWidth
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                type="email"
              />
            )}
            <TextField
              label="Verification Code"
              fullWidth
              size="small"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
            />
          </Stack>

          {err && <Typography sx={{ mt: 0.5, color: "#d32f2f" }}>{err}</Typography>}
          {msg && <Typography sx={{ mt: 0.5, color: "#1AAE55" }}>{msg}</Typography>}

          <Button
            fullWidth
            variant="contained"
            onClick={onVerify}
            disabled={verifying || !code.trim() || !emailLooksOk}
            sx={{ mt: 1.5, bgcolor: ORANGE, fontWeight: 800, height: 44, "&:hover": { bgcolor: "#E7712F" } }}
          >
            {verifying ? "Verifying…" : "VERIFY ME →"}
          </Button>

          <Typography sx={{ mt: 1.5, fontSize: { xs: 13, sm: 14 } }}>
            Didn’t receive?{" "}
            <Link onClick={onResend} sx={{ cursor: resending ? "not-allowed" : "pointer", pointerEvents: resending ? "none" : "auto" }}>
              {resending ? "Sending…" : "Resend Code"}
            </Link>
          </Typography>

          <Typography sx={{ mt: 2, color: MUTED, fontSize: 13 }}>
            Already verified?{" "}
            <Link component={RouterLink} to="/auth">
              Sign In
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
