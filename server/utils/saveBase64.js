// server/utils/saveBase64.js
// Summary: Save base64 data URLs to /uploads; sync and async APIs.

/*
[PRO] Purpose: Accept data URLs from the client and persist them to disk.
Context: Used for avatars, post media, etc. Project expects a web path back.
Edge cases: Non-base64 or bad MIME → null; creates dirs recursively.
Notes: Async API writes under CWD/<folder>; sync writes under server/uploads.
*/
import path from "node:path";
import fs from "node:fs";
import { v4 as uuid } from "uuid";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

/** Parse a data URL -> { mime, base64 } or null */
function parseDataUrl(dataUrl) {
  const s = String(dataUrl || "");
  const m = s.match(/^data:([^;]+);base64,(.+)$/) || s.match(/^data:([^,]+),(.+)$/);
  if (!m) return null;
  return { mime: m[1] || "application/octet-stream", base64: m[2] };
}

/** Clean extension from MIME (image/svg+xml -> svg, image/jpeg -> jpg) */
function extFromMime(mime) {
  const raw = (mime || "application/octet-stream").split("/")[1] || "bin";
  const clean = raw.split("+")[0].split(";")[0].toLowerCase();
  if (clean === "jpeg") return "jpg";
  return clean || "bin";
}

/* ===============================
 * 1) ORIGINAL API (sync)
 * Save into server/uploads[/subdir] and return "/uploads/…"
 * =============================== */
export function saveBase64File(dataUrl, subdir = "") {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;

  const { mime, base64 } = parsed;
  const buf = Buffer.from(base64, "base64");
  const ext = extFromMime(mime);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uploadsRoot = path.join(__dirname, "..", "uploads");
  const dir = path.join(uploadsRoot, subdir || "");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `${uuid()}.${ext}`;
  const abs = path.join(dir, filename);
  const rel = path.posix.join("/uploads", subdir || "", filename);

  fs.writeFileSync(abs, buf);
  return rel;
}

/* ===============================
 * 2) NEW API (async)
 * Save into <folder> (default "uploads" under CWD) and return "/uploads/…"
 * =============================== */
export async function saveBase64AsFile(dataUrl, folder = "uploads") {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;

  const { mime, base64 } = parsed;
  const ext = extFromMime(mime) || "png";
  const buf = Buffer.from(base64, "base64");

  const dir = path.isAbsolute(folder) ? folder : path.join(process.cwd(), folder);
  await fs.promises.mkdir(dir, { recursive: true });

  const name = `${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`;
  const absPath = path.join(dir, name);
  await fs.promises.writeFile(absPath, buf);

  const posixDir = dir.split(path.sep).join("/");
  const uploadsIdx = posixDir.toLowerCase().lastIndexOf("/uploads");
  const webBase = uploadsIdx >= 0 ? posixDir.slice(uploadsIdx) : "/uploads";

  return path.posix.join(webBase, name);
}

export default saveBase64File;
