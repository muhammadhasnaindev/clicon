import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..");
const uploadsDir = path.join(root, "uploads");

function ensureUploads() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

function extFromMime(mime = "") {
  const m = String(mime).toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("gif")) return ".gif";
  if (m.includes("webp")) return ".webp";
  if (m.includes("mp4")) return ".mp4";
  if (m.includes("quicktime")) return ".mov";
  return "";
}

/**
 * Accepts either:
 *  - Data URL (data:<mime>;base64,<data>)
 *  - Raw base64 (with known mime argument)
 * Returns: public path like `/uploads/<file>`
 */
export function saveBase64AsFile(dataOrDataUrl, mimeHint) {
  ensureUploads();

  let base64 = dataOrDataUrl;
  let mime = mimeHint || "";

  const isDataUrl = String(dataOrDataUrl).startsWith("data:");
  if (isDataUrl) {
    const [meta, b64] = String(dataOrDataUrl).split(",");
    base64 = b64;
    const match = /data:(.+);base64/i.exec(meta || "");
    mime = match?.[1] || "";
  }

  const buf = Buffer.from(base64, "base64");
  const ext = extFromMime(mime) || ".bin";
  const filename = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buf);
  return `/uploads/${filename}`;
}
