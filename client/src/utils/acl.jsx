// src/utils/acl.js
export function hasRole(user, roles) {
  if (!roles) return true;
  /* ===================== NEW LOGIC =====================
   * - Accept string or array
   * - Case-insensitive compare
   * - Graceful on missing user/role
   * ==================================================== */
  const wanted = (Array.isArray(roles) ? roles : [roles]).map((r) => String(r || "").toLowerCase());
  const mine = String(user?.role || "").toLowerCase();
  return wanted.includes(mine);
}

export function matchPermission(granted, needed) {
  if (!granted || !needed) return false;
  /* ===================== NEW LOGIC =====================
   * - Normalize to strings
   * - Support simple wildcard suffix: "products:*"
   * ==================================================== */
  const g = String(granted);
  const n = String(needed);
  if (g === n) return true;
  if (g.endsWith("*")) return n.startsWith(g.slice(0, -1));
  return false;
}

export function hasAnyPermission(user, neededPerms = []) {
  /* ===================== NEW LOGIC =====================
   * - Accept user.permissions as array of strings
   * - Ignore falsy/empty
   * - Fast-exit if neededPerms empty
   * ==================================================== */
  const need = (neededPerms || []).filter(Boolean);
  if (!need.length) return true;
  const mine = Array.isArray(user?.permissions) ? user.permissions.filter(Boolean) : [];
  return need.some((req) => mine.some((g) => matchPermission(g, req)));
}
