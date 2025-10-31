// src/pages/auth/ResetPassword.jsx
/**
 * ResetPassword — direct reset page when user has email+code query params.

 */

import React, { useState } from "react";
import {
  Box, Paper, Typography, TextField, Button, InputAdornment, IconButton, Alert, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { ORANGE, BORDER, DARK, MUTED } from "../../theme/tokens";
import { AuthAPI } from "../../api/authApi";
import { useNavigate, useSearchParams } from "react-router-dom";

const PASSWORD_MIN = 8;
const REDIRECT_DELAY_MS = 800;

/**
 * ResetPassword screen
 * @returns {JSX.Element}
 */
export default function ResetPassword() {
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(sp.get("email") || "");
  const [code, setCode] = useState(sp.get("code") || "");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const submit = async () => {
    setErr(""); setMsg("");
    if (pwd.length < PASSWORD_MIN) return setErr(`Password must be at least ${PASSWORD_MIN} characters`);
    if (pwd !== pwd2) return setErr("Passwords do not match");
    try {
      await AuthAPI.reset(email, code, pwd);
      setMsg("Password updated!");
      setTimeout(()=>nav("/auth"), REDIRECT_DELAY_MS);
    } catch(e) {
      setErr(e.message || "Reset failed");
    }
  };

  return (
    <Box sx={{ minHeight:"60vh", display:"grid", placeItems:"center", p:{ xs:1.5, sm:2 } }}>
      <Paper variant="outlined" sx={{ width: "100%", maxWidth: 480, borderColor: BORDER, borderRadius: { xs: 2, sm: 2 } }}>
        <Box sx={{ p:{ xs:2, sm:3 } }}>
          <Typography sx={{ fontWeight:800, fontSize:{ xs:18, sm:20 }, color:DARK, mb:1 }}>
            Reset Password
          </Typography>
          <Typography sx={{ color: MUTED, fontSize:{ xs:13, sm:14 }, mb:2 }}>
            Enter the code you received and your new password.
          </Typography>

          {msg && <Alert severity="success" sx={{ mb: 1 }}>{msg}</Alert>}
          {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}

          <TextField label="Email Address" fullWidth size="small" sx={{ mb:1.25 }}
            value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" inputMode="email" type="email" />
          <TextField label="Verification Code" fullWidth size="small" sx={{ mb:1.25 }}
            value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" />
          <TextField label="Password" fullWidth size="small" sx={{ mb:1.25 }}
            type={show?"text":"password"} value={pwd} onChange={e=>setPwd(e.target.value)} autoComplete="new-password"
            InputProps={{ endAdornment:
              <InputAdornment position="end">
                <IconButton onClick={()=>setShow(s=>!s)} edge="end">
                  {show?<VisibilityOff/>:<Visibility/>}
                </IconButton>
              </InputAdornment>
            }} />
          <TextField label="Confirm Password" fullWidth size="small" sx={{ mb:1 }}
            type={show?"text":"password"} value={pwd2} onChange={e=>setPwd2(e.target.value)} autoComplete="new-password"
            InputProps={{ endAdornment:
              <InputAdornment position="end">
                <IconButton onClick={()=>setShow(s=>!s)} edge="end">
                  {show?<VisibilityOff/>:<Visibility/>}
                </IconButton>
              </InputAdornment>
            }} />

          <Button
            fullWidth variant="contained" onClick={submit}
            disabled={!email || !code || !pwd || !pwd2}
            sx={{ bgcolor: ORANGE, fontWeight:800, height:44, "&:hover":{ bgcolor:"#E7712F" } }}
          >
            RESET PASSWORD →
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
