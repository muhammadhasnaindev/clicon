// src/pages/auth/OAuthCapture.jsx
/**
 * OAuthCapture — reads token+role from provider callback and redirects.
 
 */

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TOKEN_KEY = "authToken";
const isAdminish = (r) => r === "admin" || r === "manager";
const landByRole = (r) => (isAdminish(r) ? "/admin" : "/account/dashboard");

/**
 * OAuth callback capture component.
 * @returns {null}
 */
export default function OAuthCapture() {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token") || "";
    const role  = url.searchParams.get("role") || "user";
    const error = url.searchParams.get("error");

    // ==== NEW LOGIC: fail fast if provider returned an error ====
    /* PRO: Bounce users back to /auth cleanly rather than leaving them on a blank page. */
    if (error) {
      navigate("/auth", { replace: true });
      return;
    }

    if (token) {
      try { localStorage.setItem(TOKEN_KEY, token); } catch {}
      navigate(landByRole(role), { replace: true });
    } else {
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  return null;
}
