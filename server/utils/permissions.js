// server/utils/permissionDefaults.js

/*
[PRO] Purpose: Canonical permission catalog and role default sets used across the app.
Context: Previous duplication of PERMISSIONS/ROLE_DEFAULTS in multiple files risked drift.
Edge cases: Unknown role → empty set; `apply=false` preserves any custom/legacy permissions.
Notes: Keep IDs stable (UI and APIs depend on exact strings); add new perms only by appending.
*/
export const PERMISSIONS = [
  // Catalog
  "products:read",
  "products:write",

  // Posts / blog
  "posts:read",
  "posts:write",

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
];

/*
[PRO] Purpose: Opinionated defaults per role for quick, consistent setup.
Context: Centralizes role baselines so admin tools can “apply defaults” reliably.
Edge cases: Roles outside this map resolve to []; callers may merge custom grants.
Notes: Admin inherits full PERMISSIONS; manager is a curated subset for operations.
*/
export const ROLE_DEFAULTS = {
  user: [],
  manager: [
    "products:read",
    "products:write",
    "posts:read",
    "posts:write",
    "analytics:view",
    "orders:update",
  ],
  admin: [...PERMISSIONS],
};

/*
[PRO] Purpose: Merge role defaults with existing permissions on demand.
Context: Admin UI “Apply role defaults” button calls this to reset grants cleanly.
Edge cases: apply=false returns a de-duped copy of current to avoid dupes.
Notes: Keeps insertion order unimportant; Set() ensures uniqueness.
*/
export function rolePermissions(role, apply = true, current = []) {
  if (!apply) return [...new Set(current)];
  const base = ROLE_DEFAULTS[role] || [];
  return [...new Set(base)];
}
