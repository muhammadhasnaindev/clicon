// src/api/client.js
/**
 * Summary:
 * Thin JSON fetch helper with unified base URL and user-safe errors.
 */

export const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.REACT_APP_API_BASE
    ? process.env.REACT_APP_API_BASE
    : "http://localhost:4000";

/* Logic: JSON client
   Why: Centralize headers, credentials, error surface
   Notes: Non-JSON (e.g., 204) → {} */
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
    throw new Error(j.message || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json().catch(() => ({}));
  }
  return {};
}
