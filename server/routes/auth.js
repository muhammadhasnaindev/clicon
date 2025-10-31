// server/routes/auth.js
// Auth routes: signup, signin, soft/me, password change, verify/resend, forgot/reset, and dev OAuth stubs.
// Summary: Small, surgical hardening + WHY-focused PRO comment blocks. Existing behavior preserved.

import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import LoginLog from "../models/LoginLog.js"; // ✅ NEW
import { signToken, requireAuth, hydrateUser, maybeAuth } from "../middleware/auth.js";
import { sendVerificationEmail, sendTempPassword, sendResetCode } from "../utils/mailer.js";

const router = express.Router();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

/*
[PRO] Purpose: Small helpers for codes/passwords used across flows.
Context: Centralized here to keep route bodies simple and predictable.
Edge cases: Code is zero-padded; password avoids ambiguous characters.
Notes: Keep lengths modest to fit email/UX expectations.
*/
function genCode(len = 6) {
  return String(crypto.randomInt(0, 10 ** len)).padStart(len, "0");
}
function genPassword(len = 12) {
  const src = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  return Array.from({ length: len }, () => src[Math.floor(Math.random() * src.length)]).join("");
}

/*
[PRO] Purpose: Derive device/browser/OS and coarse location from headers.
Context: Avoids adding client-info libraries while still logging useful signals.
Edge cases: Headers may be missing locally; fall back to empty values.
Notes: Best-effort only; never blocks auth flow if parsing fails.
*/
function getClientInfo(req) {
  const ua = String(req.get("user-agent") || "");
  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.ip ||
    "";

  const uaLC = ua.toLowerCase();
  const isMobile = /mobile|iphone|ipod|android(?!.*tablet)/i.test(ua);
  const isTablet = /ipad|tablet|sm-t|kindle|silk/i.test(ua);
  const device = isMobile ? "mobile" : isTablet ? "tablet" : /windows|macintosh|linux|x11/i.test(ua) ? "desktop" : "other";

  let browser = "";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/msie|trident/i.test(ua)) browser = "IE";

  let os = "";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  const country =
    req.headers["cf-ipcountry"] ||
    req.headers["x-vercel-ip-country"] ||
    req.headers["x-country-code"] ||
    "";
  const region =
    req.headers["x-vercel-ip-country-region"] ||
    req.headers["cf-region"] ||
    "";
  const city =
    req.headers["x-vercel-ip-city"] ||
    req.headers["cf-ipcity"] ||
    "";
  const lat = req.headers["x-vercel-ip-latitude"] ? Number(req.headers["x-vercel-ip-latitude"]) : null;
  const lon = req.headers["x-vercel-ip-longitude"] ? Number(req.headers["x-vercel-ip-longitude"]) : null;

  return {
    ip: String(ip || ""),
    ua,
    device,
    browser,
    os,
    location: {
      country: String(country || ""),
      region: String(region || ""),
      city: String(city || ""),
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
    },
  };
}

/* ------------------------- SIGN UP ------------------------- */
/*
[PRO] Purpose: Create user account and send verify + (optional) temp password.
Context: Accepts optional password; if omitted, generates a safe one.
Edge cases: Duplicate email; weak password; demo mode exposes code for QA.
Notes: Email verification required before signin; permissions empty by default.
*/
router.post("/signup", async (req, res) => {
  const { name = "", email = "", password = "" } = req.body || {};
  const em = String(email || "").toLowerCase().trim();
  if (!em) return res.status(400).json({ message: "Email required" });
  if (password && password.length < 8)
    return res.status(400).json({ message: "Password must be at least 8 characters" });

  const exists = await User.findOne({ email: em });
  if (exists) return res.status(400).json({ message: "Email already registered" });

  const pass = password || genPassword();

  const u = new User({
    name: String(name || "").trim(),
    fullName: String(name || "").trim(),
    email: em,
    role: "user",
    emailVerified: false,
    permissions: [],
  });
  await u.setPassword(pass);
  u.verifyCode = genCode(6);
  await u.save();

  await sendVerificationEmail(u.email, u.verifyCode);
  if (!password) await sendTempPassword(u.email, pass);

  res.json({
    ok: true,
    message: "Account created. Please verify your email.",
    ...(process.env.DEMO_MODE !== "false" ? { code: u.verifyCode } : {}),
  });
});

/* --------------------------- SIGN IN ------------------------------ */
/*
[PRO] Purpose: Authenticate, set cookie, and log device footprint.
Context: Requires verified email; logs are best-effort and never block auth.
Edge cases: Missing email/password → uniform "Invalid credentials".
Notes: Cookie is httpOnly; secure in production; token also returned in body for SPA usage.
*/
router.post("/signin", async (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const em = String(email || "").toLowerCase().trim();
  if (!em || !password) return res.status(401).json({ message: "Invalid credentials" });

  const u = await User.findOne({ email: em });
  if (!u) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await u.checkPassword(password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  if (!u.emailVerified) return res.status(403).json({ message: "Email not verified" });

  const token = signToken(u);
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };

  // ✅ log device/location for this login (non-fatal on error)
  try {
    const info = getClientInfo(req);
    await LoginLog.create({
      userId: u._id,
      ip: info.ip,
      ua: info.ua,
      device: info.device,
      browser: info.browser,
      os: info.os,
      location: info.location,
    });
  } catch (e) {
    // developer-focused log; do not leak details to user
    console.error("LoginLog create failed:", e?.message || e);
  }

  res.cookie("token", token, cookieOpts).json({ user: u, token });
});

/* --------------------------- LOG OUT ------------------------------ */
/*
[PRO] Purpose: Clear auth cookie to sign user out.
Context: Stateless JWT; client typically also clears local token copy.
Edge cases: None—always responds ok=true.
Notes: Keep cookie name aligned with middleware’s readToken logic.
*/
router.post("/logout", (_req, res) => {
  res.clearCookie("token").json({ ok: true });
});

/* ------------------------------ ME (soft) ------------------------- */
/*
[PRO] Purpose: Soft identity probe for client boot (no hard auth).
Context: Returns {guest:true} if missing/invalid token; avoids 401 noise.
Edge cases: User deleted after token issuance → treated as guest.
Notes: Payload shaped for account header + settings prefill.
*/
router.get("/me", maybeAuth, async (req, res) => {
  if (!req.user?._id) return res.json({ guest: true });
  const u = await User.findById(req.user._id).lean();
  if (!u) return res.json({ guest: true });

  res.json({
    _id: u._id,
    name: u.name || u.fullName || "",
    fullName: u.fullName || u.name || "",
    displayName: u.displayName || "",
    username: u.username || "",
    email: u.email,
    secondaryEmail: u.secondaryEmail || "",
    phone: u.phone || "",
    country: u.country || "",
    state: u.state || "",
    city: u.city || "",
    zip: u.zip || "",
    role: u.role,
    permissions: u.permissions || [],
    emailVerified: !!u.emailVerified,
    avatarUrl: u.avatarUrl || "",
    billingAddress: u.billingAddress || {},
    shippingAddress: u.shippingAddress || {},
    defaultPaymentMethod: u.defaultPaymentMethod || "card",
    defaultCard: u.defaultCard || undefined,
    updatedAt: u.updatedAt,
  });
});

/* ---------------------- CHANGE PASSWORD --------------------------- */
/*
[PRO] Purpose: Let authenticated users rotate passwords securely.
Context: Validates current password before setting the new one.
Edge cases: New password length; incorrect current password.
Notes: No extra response data; clients can show a generic success toast.
*/
router.post("/change-password", requireAuth, hydrateUser, async (req, res) => {
  const { currentPassword = "", newPassword = "" } = req.body || {};
  const ok = await req.user.checkPassword(currentPassword);
  if (!ok) return res.status(400).json({ message: "Current password incorrect" });
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ message: "Password must be at least 8 characters" });

  await req.user.setPassword(newPassword);
  await req.user.save();
  res.json({ ok: true });
});

/* -------------------------- EMAIL VERIFY -------------------------- */
/*
[PRO] Purpose: Confirm email with 6-digit code and mark account verified.
Context: Prevents sign-in until verified to reduce spam/abuse.
Edge cases: Wrong code; missing user; trims/lowercases email.
Notes: Clears verifyCode on success to prevent reuse.
*/
router.post("/verify-email", async (req, res) => {
  const { email = "", code = "" } = req.body || {};
  const em = String(email || "").toLowerCase().trim();
  const u = await User.findOne({ email: em });
  if (!u) return res.status(404).json({ message: "User not found" });
  if (String(u.verifyCode) !== String(code))
    return res.status(400).json({ message: "Invalid verification code" });

  u.emailVerified = true;
  u.verifyCode = null;
  await u.save();
  res.json({ ok: true });
});

/*
[PRO] Purpose: Re-send verification code for users who lost the first email.
Context: Generates a fresh code every request; last one wins.
Edge cases: Unknown email → 404; email normalized.
Notes: No leakage of current code unless in demo mode elsewhere.
*/
router.post("/resend-verify", async (req, res) => {
  const { email = "" } = req.body || {};
  const em = String(email || "").toLowerCase().trim();
  const u = await User.findOne({ email: em });
  if (!u) return res.status(404).json({ message: "User not found" });
  u.verifyCode = genCode(6);
  await u.save();
  await sendVerificationEmail(u.email, u.verifyCode);
  res.json({ ok: true });
});

/* --------------------------- FORGOT / RESET ----------------------- */
/*
[PRO] Purpose: Start password reset with a 6-digit code sent via email.
Context: Silent success to avoid enumerating valid emails.
Edge cases: If user exists, code stored and emailed; otherwise still ok:true.
Notes: Demo mode may include code in response for quick QA.
*/
router.post("/forgot", async (req, res) => {
  const { email = "" } = req.body || {};
  const em = String(email || "").toLowerCase().trim();
  const u = await User.findOne({ email: em });
  if (u) {
    u.resetCode = genCode(6);
    await u.save();
    await sendResetCode(u.email, u.resetCode);
  }
  res.json({ ok: true, ...(process.env.DEMO_MODE !== "false" ? { code: u?.resetCode } : {}) });
});

/*
[PRO] Purpose: Complete password reset with code + new password.
Context: Matches code, enforces min length, clears code on success.
Edge cases: Missing user; wrong code; short password.
Notes: No token issued here; user must signin after reset.
*/
router.post("/reset", async (req, res) => {
  const { email = "", code = "", password = "" } = req.body || {};
  const em = String(email || "").toLowerCase().trim();
  const u = await User.findOne({ email: em });
  if (!u) return res.status(404).json({ message: "User not found" });
  if (String(u.resetCode) !== String(code))
    return res.status(400).json({ message: "Invalid reset code" });
  if (!password || password.length < 8)
    return res.status(400).json({ message: "Password must be at least 8 characters" });

  await u.setPassword(password);
  u.resetCode = null;
  await u.save();
  res.json({ ok: true });
});

/* ------------------------ DEV OAUTH STUB -------------------------- */
/*
[PRO] Purpose: Local/dev OAuth-style entry without 3P providers.
Context: Accepts redirect_uri; creates or updates a user and returns token in URL.
Edge cases: Admin email explicitly blocked; name synthesized from email if missing.
Notes: For development only; production must use real OAuth flows.
*/
function genDevEmail() {
  const n = Date.now().toString?.() ? Date.now().toString(36) : Date.now().toString();
  const r = Math.floor(Math.random() * 1e6).toString(36);
  return `google_${n}_${r}@dev.local`;
}

/*
[PRO] Purpose: Implement both /oauth/google and /oauth/apple via same handler.
Context: Reduces duplicate logic while keeping endpoints stable for the client.
Edge cases: Missing redirect_uri → 400; any error → redirect with error code.
Notes: Token and role appended as query params for the SPA to consume.
*/
async function devOAuthHandler(req, res) {
  const redirect = String(req.query.redirect_uri || "").trim();
  if (!redirect) return res.status(400).json({ message: "redirect_uri required" });

  try {
    let qEmail = String(req.query.email || "").toLowerCase().trim();
    const qName = String(req.query.name || "").trim();

    if (qEmail === ADMIN_EMAIL) {
      return res.redirect(`${redirect}?error=${encodeURIComponent("admin_email_disallowed")}`);
    }

    if (!qEmail) qEmail = genDevEmail();
    const name = qName || qEmail.split("@")[0].replace(/[._-]+/g, " ");

    let user = await User.findOne({ email: qEmail });
    if (!user) {
      user = new User({
        name,
        fullName: name,
        email: qEmail,
        role: "user",
        emailVerified: true,
        permissions: [],
      });
      await user.setPassword(genPassword());
      await user.save();
    } else {
      if (!user.name) user.name = name;
      if (!user.fullName) user.fullName = name;
      if (!user.emailVerified) user.emailVerified = true;
      await user.save();
    }

    const token = signToken(user);
    return res.redirect(
      `${redirect}?token=${encodeURIComponent(token)}&role=${encodeURIComponent(user.role || "user")}`
    );
  } catch (_e) {
    return res.redirect(`${redirect}?error=${encodeURIComponent("oauth_dev_error")}`);
  }
}

router.get("/oauth/google", devOAuthHandler);
router.get("/oauth/apple", devOAuthHandler);

export default router;
