// src/pages/auth/ForgotPassword.jsx
/**
 * ForgotPassword — 2-step flow: request code → verify & set new password.
 
 */

import React, { useState } from "react";
import {
  Box, Paper, Typography, TextField, Button, InputAdornment, IconButton, Alert, Link, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { ORANGE, BORDER, DARK, MUTED } from "../../theme/tokens";
import { AuthAPI } from "../../api/authApi";
import { Link as RouterLink, useNavigate } from "react-router-dom";

const PASSWORD_MIN = 8;
const REDIRECT_DELAY_MS = 800;

/**
 * ForgotPassword screen
 * @returns {JSX.Element}
 */
export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1=email -> 2=code+password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const emailLooksOk = email.trim() && /.+@.+\..+/.test(email.trim());

  const sendCode = async () => {
    setErr(""); setMsg("");
    try {
      const res = await AuthAPI.forgot(email);
      setMsg("If that email exists, a reset code has been generated.");
      if (res?.code) setMsg((m)=>`${m} (Code: ${res.code})`);
      setStep(2);
    } catch (e) {
      setErr(e.message || "Failed to request code.");
    }
  };

  const reset = async () => {
    setErr(""); setMsg("");
    if (pwd.length < PASSWORD_MIN) return setErr(`Password must be at least ${PASSWORD_MIN} characters`);
    if (pwd !== pwd2) return setErr("Passwords do not match");
    try {
      await AuthAPI.reset(email, code, pwd);
      setMsg("Password reset. Redirecting to sign in…");
      setTimeout(() => nav("/auth"), REDIRECT_DELAY_MS);
    } catch (e) {
      setErr(e.message || "Reset failed");
    }
  };

  return (
    <Box sx={{ minHeight:"60vh", display:"grid", placeItems:"center", p:{ xs:1.5, sm:2 } }}>
      <Paper variant="outlined" sx={{ width: "100%", maxWidth: 480, borderColor: BORDER, borderRadius: { xs: 2, sm: 2 } }}>
        <Box sx={{ p:{ xs:2, sm:3 } }}>
          <Typography sx={{ fontWeight:800, fontSize:{ xs:18, sm:20 }, color:DARK, mb:1 }}>
            {step === 1 ? "Forget Password" : "Verify & Create New Password"}
          </Typography>
          <Typography sx={{ color: MUTED, fontSize:{ xs:13, sm:14 }, mb:2 }}>
            {step === 1
              ? "Enter the email address associated with your Clicon account."
              : "Check your email for the reset code, then set a new password."}
          </Typography>

          {step === 1 && (
            <>
              <TextField
                label="Email Address"
                fullWidth size="small" sx={{ mb:1.5 }}
                value={email} onChange={e=>setEmail(e.target.value)}
                autoComplete="email" inputMode="email" type="email"
              />
              {err && <Alert severity="error" sx={{ mb:1 }}>{err}</Alert>}
              {msg && <Alert severity="success" sx={{ mb:1 }}>{msg}</Alert>}
              <Button
                fullWidth variant="contained" onClick={sendCode} disabled={!emailLooksOk}
                sx={{ bgcolor: ORANGE, fontWeight:800, height:44, "&:hover":{ bgcolor:"#E7712F" } }}
              >
                SEND CODE →
              </Button>

              <Typography sx={{ mt:2, fontSize:{ xs:13, sm:14 }, color:MUTED }}>
                Already have an account? <Link component={RouterLink} to="/auth">Sign In</Link>
              </Typography>
            </>
          )}

          {step === 2 && (
            <>
              <TextField label="Email Address" fullWidth size="small" sx={{ mb:1.25 }} value={email} disabled />
              <TextField label="Verification Code" fullWidth size="small" sx={{ mb:1.25 }} value={code}
                onChange={e=>setCode(e.target.value)} inputMode="numeric" />
              <TextField
                label="New Password" fullWidth size="small" sx={{ mb:1.25 }}
                type={show ? "text" : "password"} value={pwd} onChange={e=>setPwd(e.target.value)}
                autoComplete="new-password"
                InputProps={{ endAdornment:(
                  <InputAdornment position="end">
                    <IconButton onClick={()=>setShow(s=>!s)} edge="end">
                      {show ? <VisibilityOff/> : <Visibility/>}
                    </IconButton>
                  </InputAdornment>
                )}}
              />
              <TextField
                label="Confirm Password" fullWidth size="small" sx={{ mb:1.25 }}
                type={show ? "text" : "password"} value={pwd2} onChange={e=>setPwd2(e.target.value)}
                autoComplete="new-password"
                InputProps={{ endAdornment:(
                  <InputAdornment position="end">
                    <IconButton onClick={()=>setShow(s=>!s)} edge="end">
                      {show ? <VisibilityOff/> : <Visibility/>}
                    </IconButton>
                  </InputAdornment>
                )}}
              />
              {err && <Alert severity="error" sx={{ mb:1 }}>{err}</Alert>}
              {msg && <Alert severity="success" sx={{ mb:1 }}>{msg}</Alert>}
              <Button
                fullWidth variant="contained" onClick={reset}
                disabled={!email || !code || !pwd || !pwd2}
                sx={{ bgcolor: ORANGE, fontWeight:800, height:44, "&:hover":{ bgcolor:"#E7712F" } }}
              >
                SET NEW PASSWORD →
              </Button>

              <Typography sx={{ mt:2, fontSize:{ xs:13, sm:14 }, color:MUTED }}>
                Didn’t get a code? <Link component={RouterLink} to="/forgot">Try again</Link>
              </Typography>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
