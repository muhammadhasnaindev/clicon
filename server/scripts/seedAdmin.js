/* Seed or promote an admin user.
 * Usage:
 *  MONGO_URI="mongodb://localhost:27017/clicon" \
 *  ADMIN_EMAIL="admin@example.com" \
 *  ADMIN_PASSWORD="StrongPass!123" \
 *  node scripts/seedAdmin.js
 */
import "dotenv/config.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { PERMISSIONS } from "../utils/permissions.js";

async function main() {
  const mongo = process.env.MONGO_URI || "mongodb://localhost:27017/clicon";
  const email = process.env.ADMIN_EMAIL;
  const pwd = process.env.ADMIN_PASSWORD || Math.random().toString(36).slice(2) + "!A9";

  if (!email) {
    console.error("Missing ADMIN_EMAIL");
    process.exit(1);
  }

  await mongoose.connect(mongo);
  let u = await User.findOne({ email });

  if (!u) {
    u = new User({
      name: "Administrator",
      email,
      emailVerified: true,
      role: "admin",
      permissions: PERMISSIONS,
    });

    // Try to set password on most common fields
    const hash = await bcrypt.hash(pwd, 10);
    if ("password" in User.schema.paths) {
      u.password = hash;
    } else if ("passwordHash" in User.schema.paths) {
      u.passwordHash = hash;
    } else {
      // fallback raw (NOT recommended). Expect your model's pre-save to hash.
      u.password = pwd;
    }

    await u.save();
    console.log(`✔ Created admin ${email} with full permissions.`);
    console.log(`  Password: ${pwd}`);
  } else {
    u.role = "admin";
    u.permissions = Array.from(new Set([...(u.permissions || []), ...PERMISSIONS]));
    u.emailVerified = true;
    await u.save();
    console.log(`✔ Promoted ${email} to admin and ensured full permissions.`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
