/**
 * RequirePerm
 * Short: Permit access by permission set (ANY/ALL), optional admin bypass.

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

/**
 * Props:
 * - perms: string[] of needed permissions (ANY by default)
 * - mode: "ANY" | "ALL" (default "ANY")
 * - allowAdmin: boolean (default true) -> admins/managers bypass
 */
export default function RequirePerm({ children, perms = [], mode = "ANY", allowAdmin = true }) {
  const { data: meRaw, isLoading } = useMeQuery();
  const loc = useLocation();

  if (isLoading) return null;

  //  normalize user shape
  // PRO: Supports both {data} and raw object returns.
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

  // admin/manager bypass (role normalized)
  const role = String(me.role || "").toLowerCase();
  if (allowAdmin && ADMINISH.has(role)) return children;

  // match by perms
  const ok =
    mode === "ALL"
      ? perms.every((p) => hasAnyPermission(me, [p]))
      : hasAnyPermission(me, perms);

  if (ok) return children;

  // If they are admin-ish by perms (can enter admin area), send to /admin dashboard
  if (hasAnyPermission(me, ADMIN_ENTRY_PERMS)) {
    return <Navigate to="/admin" replace />;
  }

  // otherwise user area
  return <Navigate to="/account/dashboard" replace />;
}
