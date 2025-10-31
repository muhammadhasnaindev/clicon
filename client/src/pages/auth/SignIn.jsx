// src/pages/auth/SignInForm.jsx
/**
 * SignInForm — combined Sign In / Sign Up form with social starters.
 
 */

import React, { useEffect, useState } from "react";
import {
  Box, Tabs, Tab, TextField, Button, Divider, Typography,
  IconButton, InputAdornment, Link, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import GoogleIcon from "@mui/icons-material/Google";
import AppleIcon from "@mui/icons-material/Apple";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useLoginMutation, useRegisterMutation, useMeQuery } from "../../store/api/apiSlice";

/* ==== constants (no magic values) ==== */
const ADMIN_LANDING = "/admin/users";
const USER_LANDING  = "/account/dashboard";
const PASSWORD_MIN  = 8;

const isAdminish = (role) => role === "admin" || role === "manager";
const landByRole  = (role) => (isAdminish(role) ? ADMIN_LANDING : USER_LANDING);

/* OAuth endpoints + callback */
const origin = typeof window !== "undefined" ? window.location.origin : "";
const callbackUrl = `${origin}/auth/callback`;
const GOOGLE_START = import.meta.env.VITE_OAUTH_GOOGLE_URL || "/api/auth/oauth/google";
const APPLE_START  = import.meta.env.VITE_OAUTH_APPLE_URL  || "/api/auth/oauth/apple";

/** Normalize RTKQ error to a user-safe message. */
const parseError = (e) =>
  (typeof e?.data === "string" && e.data) ||
  e?.data?.message ||
  e?.error ||
  e?.message ||
  "Something went wrong";

/**
 * SignInForm component
 * @returns {JSX.Element}
 */
export default function SignInForm() {
  const [tab, setTab] = useState(0);

  const [emailIn, setEmailIn] = useState("");
  const [pwdIn, setPwdIn] = useState("");
  const [showIn, setShowIn] = useState(false);
  const [errIn, setErrIn] = useState("");

  const [nameUp, setNameUp] = useState("");
  const [emailUp, setEmailUp] = useState("");
  const [pwdUp, setPwdUp] = useState("");
  const [pwdUp2, setPwdUp2] = useState("");
  const [showUp, setShowUp] = useState(false);
  const [errUp, setErrUp] = useState("");

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const nav = useNavigate();
  const { data: me } = useMeQuery();

  useEffect(() => {
    const u = me?.data ?? me;
    if (u && (u._id || u.id)) nav(landByRole(u.role), { replace: true });
  }, [me, nav]);

  const [login,    { isLoading: signingIn }] = useLoginMutation();
  const [register, { isLoading: signingUp }] = useRegisterMutation();

  /* ==== NEW LOGIC: light email check ====
     PRO: avoids obvious typos; still permissive for unusual but valid emails. */
  const emailLooksOkIn  = emailIn.trim()  && /.+@.+\..+/.test(emailIn.trim());
  const emailLooksOkUp  = emailUp.trim()  && /.+@.+\..+/.test(emailUp.trim());

  const onSignIn = async () => {
    setErrIn("");
    try {
      const resp = await login({ email: emailIn.trim(), password: pwdIn }).unwrap();
      const role = resp?.user?.role || "user";
      nav(landByRole(role), { replace: true });
    } catch (e) {
      const msg = parseError(e);
      if (String(msg).toLowerCase().includes("verify")) {
        nav("/verify-email?email=" + encodeURIComponent(emailIn.trim()), { replace: true });
        return;
      }
      setErrIn(msg);
    }
  };

  const onSignUp = async () => {
    setErrUp("");
    if (!nameUp.trim()) return setErrUp("Name is required");
    if (!emailLooksOkUp) return setErrUp("Enter a valid email");
    if (pwdUp.length < PASSWORD_MIN) return setErrUp(`Password must be at least ${PASSWORD_MIN} characters`);
    if (pwdUp !== pwdUp2) return setErrUp("Passwords do not match");
    try {
      await register({ name: nameUp.trim(), email: emailUp.trim(), password: pwdUp }).unwrap();
      nav("/verify-email?email=" + encodeURIComponent(emailUp.trim()), { replace: true });
    } catch (e) {
      setErrUp(parseError(e));
    }
  };

  const handleTabChange = (_e, v) => {
    setTab(v);
    setErrIn("");
    setErrUp("");
  };

  /* ==== NEW LOGIC: SSR-safe social start + optional params ====
     PRO: prevents crashes in non-browser envs; sends hints if available. */
  const startGoogle = () => {
    if (typeof window === "undefined") return;
    const u = new URL(GOOGLE_START, window.location.origin);
    u.searchParams.set("redirect_uri", callbackUrl);
    if (tab === 0 && emailLooksOkIn) u.searchParams.set("email", emailIn.trim());
    if (tab === 1 && emailLooksOkUp) u.searchParams.set("email", emailUp.trim());
    if (tab === 1 && nameUp.trim())  u.searchParams.set("name", nameUp.trim());
    window.location.href = u.toString();
  };
  const startApple = () => {
    if (typeof window === "undefined") return;
    const u = new URL(APPLE_START, window.location.origin);
    u.searchParams.set("redirect_uri", callbackUrl);
    if (tab === 0 && emailLooksOkIn) u.searchParams.set("email", emailIn.trim());
    if (tab === 1 && emailLooksOkUp) u.searchParams.set("email", emailUp.trim());
    if (tab === 1 && nameUp.trim())  u.searchParams.set("name", nameUp.trim());
    window.location.href = u.toString();
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 480,
        mx: "auto",
        mt: { xs: 3, sm: 6 },
        p: { xs: 2, sm: 4 },
        border: "1px solid #ddd",
        borderRadius: 2,
        boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
        backgroundColor: "#fff",
      }}
    >
      <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
        <Tab label="Sign In" />
        <Tab label="Sign Up" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ mt: 3 }}>
          <TextField
            label="Email Address"
            fullWidth size="small" sx={{ mb: 2 }}
            value={emailIn} onChange={(e) => setEmailIn(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSignIn()}
            autoComplete="email" inputMode="email" type="email"
          />
          <TextField
            label="Password"
            type={showIn ? "text" : "password"}
            fullWidth size="small" sx={{ mb: 1 }}
            value={pwdIn} onChange={(e) => setPwdIn(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSignIn()}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowIn((s) => !s)} edge="end" aria-label="toggle password">
                    {showIn ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Typography variant="body2" sx={{ textAlign: "right", mb: 2 }}>
            <Link component={RouterLink} to="/forgot" underline="hover">
              Forget Password
            </Link>
          </Typography>

          {errIn && <Typography color="error" sx={{ mb: 1 }}>{errIn}</Typography>}

          <Button
            variant="contained" fullWidth endIcon={<ArrowForwardIcon />}
            onClick={onSignIn} disabled={signingIn || !emailLooksOkIn || !pwdIn}
            sx={{ height: 44 }}
          >
            {signingIn ? "Signing in…" : "SIGN IN"}
          </Button>

          <Divider sx={{ my: 2 }}>or</Divider>
          <Button variant="outlined" fullWidth startIcon={<GoogleIcon />} sx={{ mb: 1, textTransform: "none", height: 44 }} onClick={startGoogle}>
            Login with Google
          </Button>
          <Button variant="outlined" fullWidth startIcon={<AppleIcon />} sx={{ textTransform: "none", height: 44 }} onClick={startApple}>
            Login with Apple
          </Button>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ mt: 3 }}>
          <TextField label="Name" fullWidth size="small" sx={{ mb: 2 }}
            value={nameUp} onChange={(e) => setNameUp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSignUp()} autoComplete="name"
          />
          <TextField label="Email Address" fullWidth size="small" sx={{ mb: 2 }}
            value={emailUp} onChange={(e) => setEmailUp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSignUp()} autoComplete="email" inputMode="email" type="email"
          />
          <TextField label={`Password (${PASSWORD_MIN}+)`} type={showUp ? "text" : "password"} fullWidth size="small" sx={{ mb: 2 }}
            value={pwdUp} onChange={(e) => setPwdUp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSignUp()} autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowUp((s) => !s)} edge="end" aria-label="toggle password">
                    {showUp ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField label="Confirm Password" type={showUp ? "text" : "password"} fullWidth size="small" sx={{ mb: 1 }}
            value={pwdUp2} onChange={(e) => setPwdUp2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSignUp()} autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowUp((s) => !s)} edge="end" aria-label="toggle confirm password">
                    {showUp ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {errUp && <Typography color="error" sx={{ mb: 1 }}>{errUp}</Typography>}

          <Button
            variant="contained" fullWidth endIcon={<ArrowForwardIcon />} onClick={onSignUp}
            disabled={signingUp || !nameUp || !emailLooksOkUp || !pwdUp || !pwdUp2}
            sx={{ height: 44 }}
          >
            {signingUp ? "Signing up…" : "SIGN UP"}
          </Button>

          <Divider sx={{ my: 2 }}>or</Divider>
          <Button variant="outlined" fullWidth startIcon={<GoogleIcon />} sx={{ mb: 1, textTransform: "none", height: 44 }} onClick={startGoogle}>
            Sign up with Google
          </Button>
          <Button variant="outlined" fullWidth startIcon={<AppleIcon />} sx={{ textTransform: "none", height: 44 }} onClick={startApple}>
            Sign up with Apple
          </Button>
        </Box>
      )}
    </Box>
  );
}
