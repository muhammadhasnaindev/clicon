// server/middleware/auth.js
// Auth middleware utilities for JWT + cookies.
// Summary: Small guards, clearer messages, and no magic strings. Behavior preserved.

import jwt from "jsonwebtoken";
import cookie from "cookie";
import mongoose from "mongoose";
import User from "../models/User.js";
import { hasAnyPermission } from "../utils/permissionMatch.js";
import { COOKIE_NAME, JWT_SECRET as CFG_JWT } from "../config.js";

const JWT_SECRET = CFG_JWT || process.env.JWT_SECRET || "dev-secret";

// Avoid magic values in logic below.
const AUTH_HEADER = "authorization";
const BEARER_PREFIX = "bearer ";
const LEGACY_COOKIE_NAME = "token";
const TOKEN_TTL_DAYS = 14;

/*
[PRO] Purpose: Surface a risky configuration early in production.
Context: Secret fell back to a dev default; easy to miss on deploy.
Edge cases: Only logs a warning; does not affect runtime behavior.
Notes: If you prefer failing fast, handle this in app bootstrap.
*/
if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-secret") {
  console.warn("[auth] WARNING: Using default JWT secret in production.");
}

/*
[PRO] Purpose: Centralize how we sign tokens and keep payload minimal.
Context: Replace inline "14d" with constant for policy clarity.
Edge cases: Coerce _id to string; normalize emailVerified to boolean.
Notes: Do not add PII here; token should stay lean.
*/
export function signToken(user) {
  return jwt.sign(
    {
      id: user._id?.toString(),
      role: user.role,
      emailVerified: !!user.emailVerified,
    },
    JWT_SECRET,
    { expiresIn: `${TOKEN_TTL_DAYS}d` }
  );
}

/*
[PRO] Purpose: Normalize token extraction across header and cookies.
Context: Support Authorization: Bearer, raw Cookie header, and cookie-parser.
Edge cases: Missing headers/cookies return an empty string.
Notes: Header check is case-insensitive.
*/
function readToken(req) {
  const rawAuth = req.headers?.[AUTH_HEADER] || "";
  if (typeof rawAuth === "string" && rawAuth.toLowerCase().startsWith(BEARER_PREFIX)) {
    return rawAuth.slice(BEARER_PREFIX.length).trim();
  }

  const rawCookie = req.headers?.cookie;
  if (rawCookie) {
    const parsed = cookie.parse(rawCookie);
    if (parsed[COOKIE_NAME]) return String(parsed[COOKIE_NAME]);
    if (parsed[LEGACY_COOKIE_NAME]) return String(parsed[LEGACY_COOKIE_NAME]);
  }

  if (req.cookies?.[COOKIE_NAME]) return String(req.cookies[COOKIE_NAME]);
  if (req.cookies?.[LEGACY_COOKIE_NAME]) return String(req.cookies[LEGACY_COOKIE_NAME]);

  return "";
}

/*
[PRO] Purpose: Enforce authentication for protected routes.
Context: Adds explicit expired-token branch; previously always generic 401.
Edge cases: Missing token, invalid token, or payload without id.
Notes: Messages are user-safe; avoid leaking debug details.
*/
export async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || typeof payload !== "object" || !payload.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.auth = payload;
    req.user = { _id: payload.id, role: payload.role, emailVerified: payload.emailVerified };
    req.userId = String(payload.id);
    return next();
  } catch (err) {
    if (err && err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ message: "Unauthorized" });
  }
}

/*
[PRO] Purpose: Allow anonymous access but attach identity if token is valid.
Context: Invalid/expired tokens are ignored on purpose.
Edge cases: No token or bad token → proceed as anonymous.
Notes: Keeps logs quiet to avoid noise from soft failures.
*/
export async function maybeAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload && typeof payload === "object" && payload.id) {
      req.auth = payload;
      req.user = { _id: payload.id, role: payload.role, emailVerified: payload.emailVerified };
      req.userId = String(payload.id);
    }
  } catch {
    // Soft auth intentionally ignores token errors.
  }
  return next();
}

/*
[PRO] Purpose: Upgrade minimal auth payload to a full User doc when available.
Context: Guard invalid ObjectId and isolate DB errors.
Edge cases: Deleted user, invalid id, or DB error → keep minimal auth.
Notes: Non-blocking middleware; never throws or sends responses.
*/
export async function hydrateUser(req, _res, next) {
  const id = req.user?._id || req.userId;
  if (!id) return next();

  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return next();
  }

  try {
    const u = await User.findById(id);
    if (u) {
      req.user = u;
      req.userId = u._id.toString();
    }
  } catch {
    // Ignore DB errors here; downstream checks still work with minimal auth.
  }
  return next();
}

/*
[PRO] Purpose: Block actions unless the user is email-verified.
Context: Supports both token-only and hydrated user states.
Edge cases: Legacy snake_case email flag is still recognized.
Notes: 403 is correct for "authenticated but not permitted".
*/
export function requireVerified(req, res, next) {
  const verified =
    req.user?.emailVerified === true ||
    req.auth?.emailVerified === true ||
    req.user?.email_verified === true;

  if (!verified) return res.status(403).json({ message: "Email not verified" });
  return next();
}

/*
[PRO] Purpose: Simple role-based gate.
Context: Empty role list means no restriction (pass-through).
Edge cases: Reads role from either req.user or req.auth.
Notes: Keep the client message generic.
*/
export function requireRole(roles = []) {
  const allow = Array.isArray(roles) ? roles : [roles];
  if (allow.length === 0) {
    return (_req, _res, next) => next();
  }
  return (req, res, next) => {
    const role = req.user?.role || req.auth?.role;
    if (!allow.includes(role)) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
}

/*
[PRO] Purpose: Permission-based gate with admin bypass.
Context: If no permissions are required, just allow.
Edge cases: Missing user or permissions array → only admin bypass passes.
Notes: Remove the admin bypass here if your policy changes.
*/
export function requirePermission(needed) {
  const needs = Array.isArray(needed) ? needed : [needed];
  if (needs.length === 0) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const role = req.user?.role || req.auth?.role;
    if (role === "admin") return next();

    const user = req.user || { permissions: [] };
    if (hasAnyPermission(user, needs)) return next();

    return res.status(403).json({ message: "Forbidden" });
  };
}
