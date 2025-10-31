/**
 * RequireAdmin
 * Short: Gate admin area — allow admin/manager roles or users with admin-area perms.

 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMeQuery } from "../store/api/apiSlice";
import { hasAnyPermission } from "../utils/acl";

/**
 * Admin area gate:
 *  - allow role "admin" or "manager"
 *  - also allow role "user" IF they have at least one admin-area permission
 *  - require verified email
 */
export default function RequireAdmin({ children }) {
  const { data: meRaw, isLoading } = useMeQuery();
  const loc = useLocation();

  if (isLoading) return null;

  //  normalize user shape
  // PRO: The /auth/me endpoint can be {data: user} or user directly.
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

  // Email not verified
  if (me.emailVerified === false) {
    return <Navigate to="/verify-email" replace state={{ from: loc.pathname }} />;
  }

  // Role-based allow (lowercase to avoid case mismatches)
  const role = String(me.role || "").toLowerCase();
  const isAdminOrManager = role === "admin" || role === "manager";

  // Permission-based allow (for "permission users" with role=user)
  // Define the union of permissions that indicate access to the admin area.
  const ADMIN_AREA_PERMS = [
    "analytics:view",
    "products:read",
    "products:write",
    "products:*",
    "posts:read",
    "posts:write",
    "posts:*",
    "orders:update",
    "users:read",
    "users:role:set",
    "users:permission:set",
    "billing:view",
    "settings:write",
  ];
  const hasAdminAreaPerm = hasAnyPermission(me, ADMIN_AREA_PERMS);

  if (isAdminOrManager || hasAdminAreaPerm) {
    return children;
  }

  // Otherwise push them to the user dashboard (safe default)
  return <Navigate to="/account/dashboard" replace />;
}
