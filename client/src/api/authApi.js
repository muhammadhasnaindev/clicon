// src/api/auth.js
/**
  Summary:
  Thin auth API wrapper using local fetch helper.
 */

export const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.REACT_APP_API_BASE
    ? process.env.REACT_APP_API_BASE
    : "http://localhost:4000";

/* Logic: small JSON fetch helper
   Why: centralize headers, errors, credentials
   Notes: returns {} for non-JSON bodies (e.g., 204) */
export async function api(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let j = {};
    try {
      j = await res.json();
    } catch (_) {}
    // user-safe, dev-readable
    throw new Error(j.message || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json().catch(() => ({}));
  }
  return {};
}

export const AuthAPI = {
  me: () => api("/api/auth/me"),
  signin: (email, password) =>
    api("/api/auth/signin", { method: "POST", body: { email, password } }),
  signup: (payload) => api("/api/auth/signup", { method: "POST", body: payload }),
  logout: () => api("/api/auth/logout", { method: "POST" }),
  forgot: (email) => api("/api/auth/forgot", { method: "POST", body: { email } }),
  reset: (email, code, password) =>
    api("/api/auth/reset", { method: "POST", body: { email, code, password } }),
  verifyEmail: (email, code) =>
    api("/api/auth/verify-email", { method: "POST", body: { email, code } }),
  resendVerify: (email) =>
    api("/api/auth/resend-verify", { method: "POST", body: { email } }),
};
