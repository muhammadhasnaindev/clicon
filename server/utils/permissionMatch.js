// server/utils/permissionMatch.js
// Summary: Permission matching helpers + canonical defaults per role.

/*
[PRO] Purpose: Centralize permission matching and role defaults.
Context: Multiple duplicates caused confusion; deduped here.
Edge cases: Wildcard "feature:*" matches "feature:read" etc.
Notes: Keep strings stable; UI depends on these ids.
*/
export function matchPermission(granted, needed) {
  if (!granted || !needed) return false;
  if (granted === needed) return true;
  if (granted.endsWith("*")) return needed.startsWith(granted.slice(0, -1));
  return false;
}

export function hasAnyPermission(user, neededPerms = []) {
  const mine = Array.isArray(user?.permissions) ? user.permissions : [];
  return neededPerms.some((need) => mine.some((g) => matchPermission(g, need)));
}

export function canWriteCategory(user, category) {
  if (!category) return false;
  if (hasAnyPermission(user, ["products:write", "products:*"])) return true;
  const mine = Array.isArray(user?.permissions) ? user.permissions : [];
  return mine.some((p) => p === `products:write:category:${category}`);
}

// ---- Canonical sets ----
export const PERMISSIONS = [
  // Catalog
  "products:read",
  "products:write",
  "products:*",

  // Posts / blog
  "posts:read",
  "posts:write",
  "posts:*",
  "posts:read:own",
  "posts:write:own",

  // Orders / ops
  "orders:update",

  // Analytics & billing
  "analytics:view",
  "billing:view",

  // User admin
  "users:read",
  "users:role:set",
  "users:permission:set",

  // Settings
  "settings:write",

  // Support & FAQs
  "support:read",
  "support:reply",
  "support:*",
  "faqs:read",
  "faqs:write",
  "faqs:*",
];

export const ROLE_DEFAULTS = {
  user: [
    // normal users do not get admin perms
  ],
  manager: [
    "products:read",
    "products:write",
    "posts:read",
    "posts:write",
    "analytics:view",
    "orders:update",
    "support:read",
    "support:reply",
    "faqs:read",
    "faqs:write",
  ],
  admin: [...PERMISSIONS],
};

/** Merge role defaults. If apply=true, return the role defaults; else keep current. */
export function rolePermissions(role, apply = true, current = []) {
  if (!apply) return [...new Set(current)];
  const base = ROLE_DEFAULTS[role] || [];
  return [...new Set(base)];
}
