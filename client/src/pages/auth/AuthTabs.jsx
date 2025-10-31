// src/pages/auth/AuthTabs.jsx
/**
 * AuthTabs — Sign In / Sign Up tabs with email/password and optional social kick-off.

 */

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Tabs, Tab, TextField, Button, Typography,
  InputAdornment, IconButton, Divider, Stack, Link, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import GoogleIcon from "@mui/icons-material/Google";
import AppleIcon from "@mui/icons-material/Apple";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { ORANGE, MUTED, BORDER } from "../../theme/tokens";
import { useLoginMutation, useRegisterMutation, useMeQuery } from "../../store/api/apiSlice";
import { hasAnyPermission } from "../../utils/acl";

/* ==== constants (no magic strings) ==== */
const PASSWORD_MIN = 8;
const ADMIN_LANDING = "/admin";
const USER_LANDING  = "/account/dashboard";

const isAdminish = (r) => r === "admin" || r === "manager";
const ADMIN_ENTRY_PERMS = [
  "products:*", "products:write",
  "posts:*", "posts:write", "posts:read", "posts:read:own", "posts:write:own",
  "analytics:view",
  "orders:update",
  "users:read", "users:role:set", "users:permission:set",
  "settings:write",
];
const landByUser = (u) =>
  isAdminish(u?.role) || hasAnyPermission(u, ADMIN_ENTRY_PERMS) ? ADMIN_LANDING : USER_LANDING;

/* OAuth endpoints + callback */
const origin = typeof window !== "undefined" ? window.location.origin : "";
const callbackUrl = `${origin}/auth/callback`;
const GOOGLE_START = import.meta.env.VITE_OAUTH_GOOGLE_URL || "/api/auth/oauth/google";
const APPLE_START  = import.meta.env.VITE_OAUTH_APPLE_URL  || "/api/auth/oauth/apple";

/** Normalize RTK Query error to user-safe text. */
const parseError = (e) => {
  const status = e?.status ?? e?.originalStatus;
  const text =
    (typeof e?.data === "string" && e.data) ||
    e?.data?.message ||
    e?.error ||
    e?.message ||
    "";
  if (status === 404) return "Not Found (check /auth/signin route)";
  if (status === 401 || status === 400) return text || "Invalid credentials";
  if (status === 403) return text || "Email not verified";
  if (status === "FETCH_ERROR") return "Network error (VITE_API_URL/proxy).";
  return text || "Something went wrong";
};

/**
 * AuthTabs component
 * @returns {JSX.Element}
 */
export default function AuthTabs() {
  const [tab, setTab]     = useState(0);
  const [email, setEmail] = useState("");
  const [pwd, setPwd]     = useState("");
  const [name, setName]   = useState("");
  const [pwd2, setPwd2]   = useState("");
  const [show, setShow]   = useState(false);
  const [err, setErr]     = useState("");

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const nav = useNavigate();
  const { data: me } = useMeQuery();

  useEffect(() => {
    const u = me?.data ?? me;
    if (u && (u._id || u.id)) nav(landByUser(u), { replace: true });
  }, [me, nav]);

  const [login,    { isLoading: signingIn }] = useLoginMutation();
  const [register, { isLoading: signingUp }] = useRegisterMutation();

  /* ==== NEW LOGIC: small email sanity check for UX ====
     PRO: catches obvious typos without being strict; prevents empty submits.
     Edge: unusual but valid emails still pass if they have a basic @domain.tld shape. */
  const emailLooksOk = email.trim() && /.+@.+\..+/.test(email.trim());

  const onSignIn = async () => {
    setErr("");
    try {
      const resp = await login({ email: email.trim(), password: pwd }).unwrap();
      const u = resp?.user || {};
      nav(landByUser(u), { replace: true });
    } catch (e) {
      const msg = parseError(e);
      if (msg.toLowerCase().includes("verify")) {
        nav("/verify-email?email=" + encodeURIComponent(email.trim()));
        return;
      }
      setErr(msg || "Invalid credentials");
    }
  };

  const onSignUp = async () => {
    setErr("");
    if (pwd.length < PASSWORD_MIN) return setErr(`Password must be ${PASSWORD_MIN}+ characters`);
    if (pwd !== pwd2) return setErr("Passwords do not match");
    try {
      await register({ name: name.trim(), email: email.trim(), password: pwd }).unwrap();
      nav("/verify-email?email=" + encodeURIComponent(email.trim()));
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const onKeyDown = (e) => { if (e.key === "Enter") (tab === 0 ? onSignIn() : onSignUp()); };

  /* ==== NEW LOGIC: SSR-safe social start + optional params ====
     PRO: avoids crashing in SSR/non-browser envs; pre-fills identity at provider if available.
     Edge: we only append email/name when non-empty to keep URLs clean. */
  const startSocial = (provider) => {
    setErr("");
    if (typeof window === "undefined") return;
    const base = provider === "google" ? GOOGLE_START : APPLE_START;
    const params = new URLSearchParams({ redirect_uri: callbackUrl });
    if (email.trim()) params.set("email", email.trim());
    if (tab === 1 && name.trim()) params.set("name", name.trim());
    window.location.href = `${base}?${params.toString()}`;
  };

  return (
    <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center", p: { xs: 1.5, sm: 2 } }}>
      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 480,
          borderColor: BORDER,
          borderRadius: { xs: 2, sm: 2 },
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Tabs
            value={tab}
            onChange={(_e, v) => { setErr(""); setTab(v); }}
            variant="fullWidth"
            sx={{
              mb: { xs: 1.5, sm: 2 },
              "& .MuiTabs-indicator": { background: ORANGE },
            }}
          >
            <Tab label="Sign In" sx={{ flex: 1 }} />
            <Tab label="Sign Up" sx={{ flex: 1 }} />
          </Tabs>

          {tab === 0 ? (
            <>
              <TextField
                label="Email Address"
                fullWidth size="small" sx={{ mb: 1.5 }}
                value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="email" inputMode="email" type="email"
              />
              <TextField
                label="Password" fullWidth size="small" sx={{ mb: 1 }}
                type={show ? "text" : "password"} value={pwd}
                onChange={e=>setPwd(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="current-password"
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={()=>setShow(s=>!s)} edge="end" aria-label="toggle password">
                      {show ? <VisibilityOff/> : <Visibility/>}
                    </IconButton>
                  </InputAdornment>
                )}}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <Link component={RouterLink} to="/forgot" underline="hover">
                  Forget Password
                </Link>
              </Box>

              {err && <Typography sx={{ color: "#d32f2f", mb: 1 }}>{err}</Typography>}

              <Button
                fullWidth variant="contained" onClick={onSignIn}
                disabled={signingIn || !emailLooksOk || !pwd}
                sx={{ bgcolor: ORANGE, fontWeight: 800, height: 44, "&:hover": { bgcolor: "#E7712F" } }}
              >
                {signingIn ? "SIGNING IN…" : "SIGN IN →"}
              </Button>

              <Divider sx={{ my: 2 }}>or</Divider>
              <Stack spacing={1} direction="column">
                <Button variant="outlined" fullWidth startIcon={<GoogleIcon />} onClick={()=>startSocial("google")} sx={{ height: 44 }}>
                  Login with Google
                </Button>
                <Button variant="outlined" fullWidth startIcon={<AppleIcon />}  onClick={()=>startSocial("apple")} sx={{ height: 44 }}>
                  Login with Apple
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <TextField
                label="Name" fullWidth size="small" sx={{ mb: 1.25 }}
                value={name} onChange={e=>setName(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="name"
              />
              <TextField
                label="Email Address" fullWidth size="small" sx={{ mb: 1.25 }}
                value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="email" inputMode="email" type="email"
              />
              <TextField
                label="Password" placeholder={`${PASSWORD_MIN}+ characters`} fullWidth size="small" sx={{ mb: 1.25 }}
                type={show ? "text" : "password"} value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="new-password"
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={()=>setShow(s=>!s)} edge="end" aria-label="toggle password">
                      {show ? <VisibilityOff/> : <Visibility/>}
                    </IconButton>
                  </InputAdornment>
                )}}
              />
              <TextField
                label="Confirm Password" fullWidth size="small" sx={{ mb: 1 }}
                type={show ? "text" : "password"} value={pwd2} onChange={e=>setPwd2(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="new-password"
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={()=>setShow(s=>!s)} edge="end" aria-label="toggle confirm password">
                      {show ? <VisibilityOff/> : <Visibility/>}
                    </IconButton>
                  </InputAdornment>
                )}}
              />

              <Typography sx={{ color: MUTED, fontSize: 12, mb: 1 }}>
                By signing up you agree to Clicon <b>Terms of Condition</b> and <b>Privacy Policy</b>.
              </Typography>

              {err && <Typography sx={{ color: "#d32f2f", mb: 1 }}>{err}</Typography>}

              <Button
                fullWidth variant="contained" onClick={onSignUp}
                disabled={signingUp || !emailLooksOk || !pwd || !name || !pwd2}
                sx={{ bgcolor: ORANGE, fontWeight: 800, height: 44, "&:hover": { bgcolor: "#E7712F" } }}
              >
                {signingUp ? "SIGNING UP…" : "SIGN UP →"}
              </Button>

              <Divider sx={{ my: 2 }}>or</Divider>
              <Stack spacing={1} direction="column">
                <Button variant="outlined" fullWidth startIcon={<GoogleIcon />} onClick={()=>startSocial("google")} sx={{ height: 44 }}>
                  Sign up with Google
                </Button>
                <Button variant="outlined" fullWidth startIcon={<AppleIcon />}  onClick={()=>startSocial("apple")} sx={{ height: 44 }}>
                  Sign up with Apple
                </Button>
              </Stack>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
