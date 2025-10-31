/**
 * RequireUser
 * Short: Gate for signed-in, verified end-users. Admin-ish users are routed to /admin.
 
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMeQuery } from "../store/api/apiSlice";
import { hasAnyPermission } from "../utils/acl";

const ADMINISH = new Set(["admin", "manager"]);
const ADMIN_ENTRY_PERMS = [
  "products:*", "products:write",
  "posts:*", "posts:write", "posts:read", "posts:read:own", "posts:write:own",
  "analytics:view",
  "orders:update",
  "users:read", "users:role:set", "users:permission:set",
  "settings:write",
];

export default function RequireUser({ children }) {
  const { data: meRaw, isLoading } = useMeQuery();
  const loc = useLocation();

  if (isLoading) return null;

  //  normalize user shape
  // PRO: Prevents guard misfires if API returns {data} vs raw.
  const me = meRaw?.data ?? meRaw ?? null;

  // Not logged in
  if (!me || !me.email) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: loc.pathname + loc.search + loc.hash }}
      />
    );
  }

  // Not verified
  if (me.emailVerified === false) {
    return <Navigate to="/verify-email" replace state={{ from: loc.pathname }} />;
  }

  // Anyone "admin-ish" by role OR by perms should NOT enter user area
  const role = String(me.role || "").toLowerCase();
  if (ADMINISH.has(role) || hasAnyPermission(me, ADMIN_ENTRY_PERMS)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
