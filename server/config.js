// server/config.js
import dotenv from "dotenv";
dotenv.config();

const toBool = (v, def = false) => {
  if (v === undefined || v === null) return def;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
};

export const PORT = Number(process.env.PORT || 4000);
export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/clicon";
export const JWT_SECRET = process.env.JWT_SECRET || "replace-this-with-a-strong-secret";

export const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || process.env.FRONTEND_ORIGIN || "http://localhost:5173";

/** Name of the auth cookie used across the app */
export const COOKIE_NAME = process.env.COOKIE_NAME || "clicon_token";
/** Force secure cookies (true on prod, false in local dev) */
export const COOKIE_SECURE = toBool(process.env.COOKIE_SECURE, false);

// Dev bootstrap admin
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";
export const DEV_BOOTSTRAP_ADMIN = toBool(process.env.DEV_BOOTSTRAP_ADMIN, true);
export const DEV_AUTO_VERIFY = toBool(process.env.DEV_AUTO_VERIFY, true);

// Optional SMTP (used by utils/mailer.js)
export const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const SMTP_SECURE = toBool(process.env.SMTP_SECURE, false);
export const SMTP_PROVIDER = process.env.SMTP_PROVIDER || "gmail";
export const GMAIL_USER = process.env.GMAIL_USER || "";
export const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
export const SMTP_FROM =
  process.env.SMTP_FROM || (GMAIL_USER ? `Clicon <${GMAIL_USER}>` : "Clicon <noreply@example.com>");
