// server/server.js

/*
[PRO] Purpose: Main HTTP server bootstrap — DB connect, middleware, static, and route mounts.
Context: Adds robust /uploads file serving across multiple candidate roots; consolidates handlers.
Edge cases: Missing uploads file returns SVG placeholder; CORS origin pulled from config.
Notes: Keep route mount order: public → user → admin; central 404 + error handler at end.
*/

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import {
  CLIENT_ORIGIN,
  PORT,
  MONGO_URI,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DEV_BOOTSTRAP_ADMIN,
  DEV_AUTO_VERIFY,
} from "./config.js";

// Dev bootstrap
import { bootstrapAdmin } from "./utils/bootstrapAdmin.js";

// Routers
import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import productsPublic from "./routes/products.public.js";
import postsPublic from "./routes/posts.public.js";
import ordersRoutes from "./routes/orders.js";
import accountRoutes from "./routes/account.js";
import paymentsRoutes from "./routes/payments.js";
import reviewsRoutes from "./routes/reviews.js";
import adminAclRouter from "./routes/admin/acl.js";
import adminProductsRouter from "./routes/admin/products.js";
import adminPostsRouter from "./routes/admin/posts.js";
import adminStatsRouter from "./routes/admin/stats.js";
import adminAuditRouter from "./routes/admin/audit.js";
import adminOrdersRouter from "./routes/admin/orders.js";
import trackRoutes from "./routes/track.js";
import newsletterRouter from "./routes/newsletter.js";
import faqsPublic from "./routes/faqs.public.js";
import supportRoutes from "./routes/support.js";
import adminSupportRoutes from "./routes/admin/support.js";
import adminFaqsRouter from "./routes/admin/faqs.js";
import aboutRoute from "./routes/aboutPublic.js";
import couponsRouter from "./routes/coupons.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  /* ---------------- DB connect + dev admin bootstrap ---------------- */

  /*
  [PRO] Purpose: Establish Mongo connection; optionally seed/refresh a dev admin.
  Context: Local environments often wipe DB; ensures immediate admin access.
  Edge cases: Connect failure → hard exit; bootstrap guarded with try/catch.
  Notes: DEV_BOOTSTRAP_ADMIN gate avoids accidental seeding in hosted envs.
  */
  try {
    await mongoose.connect(MONGO_URI);
    console.log(" Mongo connected");
  } catch (e) {
    console.error(" Mongo error", e);
    process.exit(1);
  }

  if (DEV_BOOTSTRAP_ADMIN) {
    try {
      await bootstrapAdmin({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        autoVerify: DEV_AUTO_VERIFY,
      });
    } catch (e) {
      console.error(" Admin bootstrap failed:", e?.message || e);
    }
  }

  /* ---------------- App & core middleware ---------------- */

  /*
  [PRO] Purpose: Initialize Express with secure, predictable defaults.
  Context: Trust proxy 1 for cloud/CDN IPs; JSON limit sized for media data URLs.
  Edge cases: Large payloads rejected with 413; credentials enabled for cookie auth.
  Notes: morgan=dev for concise logs; disable x-powered-by for minor hardening.
  */
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));
  app.use(cookieParser());
  app.use(morgan("dev"));
  app.use(
    cors({
      origin: CLIENT_ORIGIN,
      credentials: true,
    })
  );

  /* ---------------- Upload roots + static handler ---------------- */

  /*
  [PRO] Purpose: Serve /uploads from several probable locations across monorepo layouts.
  Context: Different build setups (server/public/src) may emit uploads to distinct dirs.
  Edge cases: File missing → SVG placeholder with file path hint (safe-escaped).
  Notes: Creates roots if missing; handler used at /uploads/* and /api/uploads/*.
  */
  const projectRoot = path.resolve(__dirname, "..");
  const candidateRoots = Array.from(
    new Set([
      path.join(__dirname, "uploads"),
      path.join(__dirname, "public", "uploads"),
      path.join(projectRoot, "public", "uploads"),
      path.join(projectRoot, "src", "uploads"),
      path.join(projectRoot, "clicon", "public", "uploads"),
      path.join(projectRoot, "clicon", "src", "uploads"),
      path.join(projectRoot, "frontend", "public", "uploads"),
      path.join(projectRoot, "frontend", "src", "uploads"),
    ])
  );

  for (const d of candidateRoots) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch {
      // ignore mkdir errors; downstream fallback still works
    }
  }

  console.log("Upload search roots:");
  for (const d of candidateRoots) console.log("  •", d);

  function sendUpload(req, res) {
    const rel = req.params[0] || "";
    for (const root of candidateRoots) {
      const filePath = path.join(root, rel);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
      }
    }
    res
      .type("svg")
      .send(
        `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
           <rect width="100%" height="100%" fill="#f3f4f6"/>
           <text x="50%" y="48%" text-anchor="middle" fill="#9ca3af" font-size="20" font-family="Arial">
             Image not found
           </text>
           <text x="50%" y="58%" text-anchor="middle" fill="#9ca3af" font-size="14" font-family="Arial">
             ${(rel || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
           </text>
         </svg>`
      );
  }

  // Consolidated upload handlers (removed duplicate inline variant)
  app.get("/uploads/*", sendUpload);
  app.get("/api/uploads/*", sendUpload); // proxy-friendly alias

  /* ---------------- Health + public routes ---------------- */

  /*
  [PRO] Purpose: Mount public APIs first for faster cold paths and clearer 404s.
  Context: Auth endpoints need to precede routes that rely on cookies.
  Edge cases: Two product routers share base (/api/products); they expose distinct endpoints.
  Notes: Keep order: health → faqs/newsletter/static → auth/products/posts/track.
  */
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/faqs", faqsPublic);
  app.use("/api/newsletter", newsletterRouter);
  app.use("/api/support", supportRoutes);
  app.use("/api/about", aboutRoute);
  app.use("/api/coupons", couponsRouter);

  // Public APIs
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/products", productsPublic);
  app.use("/api/posts", postsPublic);
  app.use("/api/track", trackRoutes); //  mount tracking

  /* ---------------- User-scoped routes ---------------- */

  /*
  [PRO] Purpose: Authenticated user endpoints (orders/account/payments/reviews).
  Context: Mounted after public routes to avoid handler ambiguity.
  Edge cases: Reviews router uses /api prefix and coexists with orders’ review endpoints.
  Notes: Cookie/session handled by middleware inside each router.
  */
  app.use("/api/orders", ordersRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api", reviewsRoutes);

  /* ---------------- Admin routes ---------------- */

  /*
  [PRO] Purpose: Administrative endpoints gated by auth/role/permission middleware.
  Context: Grouped under /api/admin to simplify proxies and RBAC checks.
  Edge cases: Specific routers (orders/stats) enforce fine-grained perms internally.
  Notes: Order of admin router mounts is not critical; paths are distinct.
  */
  app.use("/api/admin", adminAclRouter);
  app.use("/api/admin/products", adminProductsRouter);
  app.use("/api/admin/posts", adminPostsRouter);
  app.use("/api/admin/stats", adminStatsRouter);
  app.use("/api/admin/audit", adminAuditRouter);
  app.use("/api/admin/orders", adminOrdersRouter);
  app.use("/api/admin/support", adminSupportRoutes);
  app.use("/api/admin/faqs", adminFaqsRouter);

  /* ---------------- 404 + error handler ---------------- */

  /*
  [PRO] Purpose: Central not-found & error responses with safe messages.
  Context: Avoids leaking stack traces; logs server-side only.
  Edge cases: Any unhandled route under /api returns JSON 404.
  Notes: Keep error middleware last; signature must include 4 args.
  */
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Server error" });
  });

  /* ---------------- listen ---------------- */

  /*
  [PRO] Purpose: Start HTTP server and print key runtime config to logs.
  Context: Useful during local dev and container logs for quick checks.
  Edge cases: Port collisions surface as throw; rely on process manager.
  Notes: CORS origin echoes to confirm client alignment.
  */
  app.listen(PORT, () => {
    console.log(` API listening on http://localhost:${PORT}`);
    console.log(`CORS origin: ${CLIENT_ORIGIN}`);
  });
}

process.on("unhandledRejection", (e) => console.error("unhandledRejection", e));
process.on("uncaughtException", (e) => console.error("uncaughtException", e));

start();
