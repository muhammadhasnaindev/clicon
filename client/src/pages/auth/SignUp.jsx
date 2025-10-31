// src/pages/auth/SignUp.jsx
/**
 * SignUp — standalone sign-up view (UI-only scaffold).

 */

import React, { useState } from "react";
import {
  Box, Tabs, Tab, TextField, Button, Divider, Typography, IconButton,
  InputAdornment, Checkbox, FormControlLabel, Link, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import GoogleIcon from "@mui/icons-material/Google";
import AppleIcon from "@mui/icons-material/Apple";

const SignUp = () => {
  const [tab, setTab] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(true);

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

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
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab label="Sign In" />
        <Tab label="Sign Up" />
      </Tabs>

      {tab === 1 && (
        <Box sx={{ mt: 3 }}>
          <TextField label="Name" fullWidth size="small" sx={{ mb: 2 }} />
          <TextField label="Email Address" fullWidth size="small" sx={{ mb: 2 }} inputMode="email" autoComplete="email" type="email" />
          <TextField
            label="Password" type={showPassword ? "text" : "password"} fullWidth size="small"
            placeholder="8+ characters" sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end" aria-label="toggle password">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirm Password" type={showConfirm ? "text" : "password"} fullWidth size="small" sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowConfirm(!showConfirm)} edge="end" aria-label="toggle confirm password">
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                sx={{ color: "#FF7A00", "&.Mui-checked": { color: "#FF7A00" } }}
              />
            }
            label={
              <Typography variant="body2">
                Are you agree to Clicon{" "}
                <Link href="#" sx={{ color: "#1B6392", fontWeight: 500 }}>Terms of Condition</Link>{" "}
                and{" "}
                <Link href="#" sx={{ color: "#1B6392", fontWeight: 500 }}>Privacy Policy</Link>.
              </Typography>
            }
            sx={{ alignItems: "flex-start", mb: 3 }}
          />

          <Button
            variant="contained"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ backgroundColor: "#FF7A00", color: "#fff", fontWeight: 700, height: 44, mb: 2, "&:hover": { backgroundColor: "#FF7A00" } }}
            disabled={!agree}
          >
            SIGN UP
          </Button>

          <Divider sx={{ my: 2 }}>or</Divider>

          <Button variant="outlined" fullWidth startIcon={<GoogleIcon />} sx={{ mb: 1, textTransform: "none", height: 44 }}>
            Sign up with Google
          </Button>

          <Button variant="outlined" fullWidth startIcon={<AppleIcon />} sx={{ textTransform: "none", height: 44 }}>
            Sign up with Apple
          </Button>
        </Box>
      )}

      {tab === 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2">Sign In form goes here…</Typography>
        </Box>
      )}
    </Box>
  );
};

export default SignUp;
