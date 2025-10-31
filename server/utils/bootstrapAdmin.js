// server/utils/bootstrapAdmin.js
// Summary: Ensure a development admin account exists (idempotent).


/*
[PRO] Purpose: Guarantee a usable admin in dev without manual seeding.
Context: Sometimes dev DBs reset; this avoids “locked out” situations.
Edge cases: Missing envs → safe no-op with warning; existing user → refresh.
Notes: Never auto-creates outside of the explicit call; logs are dev-facing only.
*/
import User from "../models/User.js";
import { rolePermissions } from "../utils/permissionMatch.js";

/**
 * Ensure an admin exists in dev. If it exists, refresh role/verify/password.
 * Called from server.js when DEV_BOOTSTRAP_ADMIN=true.
 */
export async function bootstrapAdmin({ email, password, autoVerify = true }) {
  if (!email || !password) {
    console.warn(" bootstrapAdmin: ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping.");
    return;
  }

  const em = String(email).trim().toLowerCase();
  let u = await User.findOne({ email: em });

  if (!u) {
    u = new User({
      name: "Admin",
      email: em,
      role: "admin",
      emailVerified: !!autoVerify,
      permissions: rolePermissions("admin", true, []),
    });
    await u.setPassword(password);
    await u.save();
    console.log(` Created dev admin: ${em}`);
    return;
  }

  // Refresh role / perms / verify / password each boot for convenience
  u.role = "admin";
  u.emailVerified = !!autoVerify;
  u.permissions = rolePermissions("admin", true, u.permissions || []);
  await u.setPassword(password);
  await u.save();
  console.log(`Ensured dev admin exists and password refreshed: ${em}`);
}
