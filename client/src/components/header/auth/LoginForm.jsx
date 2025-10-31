// src/components/auth/LoginForm.jsx
/**
 * Summary:
 * Sign in / Register toggle form with basic validation and friendly errors.
 */

import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Link as MuiLink,
  IconButton,
  InputAdornment,
  Alert,
  Stack,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useLoginMutation, useRegisterMutation } from "../../../store/api/apiSlice";

/* Logic: small helpers for clean input handling */
const trimmed = (s = "") => String(s).trim();

export default function LoginForm({ onDone }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errs, setErrs] = useState({});
  const [submitErr, setSubmitErr] = useState("");

  const [
    login,
    { isLoading: isLogIn, error: loginErr, isSuccess: loginOk },
  ] = useLoginMutation();
  const [
    register,
    { isLoading: isReg, error: regErr, isSuccess: regOk },
  ] = useRegisterMutation();

  useEffect(() => {
    if (loginOk || regOk) {
      window.dispatchEvent(new CustomEvent("auth:success"));
      onDone?.();
    }
  }, [loginOk, regOk, onDone]);

  const validate = () => {
    const e = {};
    if (isRegister && !trimmed(form.name)) e.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(trimmed(form.email))) e.email = "Valid email required";
    if (!form.password || form.password.length < 6) e.password = "Min 6 characters";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setSubmitErr("");
    if (!validate()) return;

    const payload = {
      name: trimmed(form.name) || "User",
      email: trimmed(form.email),
      password: form.password,
    };

    try {
      if (isRegister) {
        await register({ name: payload.name, email: payload.email, password: payload.password }).unwrap();
      } else {
        await login({ email: payload.email, password: payload.password }).unwrap();
      }
    } catch (e) {
      // user-safe error; RTK error objects vary
      setSubmitErr(e?.data?.message || e?.data?.error || e?.error || "Unable to process request.");
    }
  };

  const isBusy = isLogIn || isReg;

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ textAlign: "center" }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        {isRegister ? "Create an account" : "Sign in to your account"}
      </Typography>

      <Stack spacing={1.5} sx={{ textAlign: "left", mb: 1 }}>
        {isRegister && (
          <TextField
            label="Name"
            fullWidth
            size="small"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={!!errs.name}
            helperText={errs.name || " "}
          />
        )}

        <TextField
          label="Email Address"
          type="email"
          fullWidth
          size="small"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={!!errs.email}
          helperText={errs.email || " "}
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          fullWidth
          size="small"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={!!errs.password}
          helperText={errs.password || " "}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((p) => !p)}
                  edge="end"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      {!isRegister && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <MuiLink href="/auth/forgot" underline="none" sx={{ fontSize: 14, color: "primary.main" }}>
            Forgot Password?
          </MuiLink>
        </Box>
      )}

      {(submitErr || loginErr || regErr) && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {submitErr ||
            loginErr?.data?.message ||
            loginErr?.data?.error ||
            regErr?.data?.message ||
            regErr?.data?.error ||
            "Something went wrong"}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isBusy}
        sx={{ mb: 1.25, backgroundColor: "#FF7F2A", height: 44, fontWeight: 700 }}
      >
        {isRegister ? (isReg ? "Creating..." : "CREATE ACCOUNT") : (isLogIn ? "Logging in..." : "LOGIN →")}
      </Button>

      <Button
        variant="outlined"
        fullWidth
        onClick={() => setIsRegister((v) => !v)}
        disabled={isBusy}
        sx={{ borderColor: "#FF7F2A", color: "#FF7F2A", fontWeight: 700, height: 44 }}
      >
        {isRegister ? "Have an account? SIGN IN" : "CREATE ACCOUNT"}
      </Button>
    </Box>
  );
}
