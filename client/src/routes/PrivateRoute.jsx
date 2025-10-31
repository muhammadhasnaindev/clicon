/**
 * PrivateRoute (generic guard)
 * Short: Wraps children with login/verification/role/perm checks.
 
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useMeSafe from "../hooks/useMeSafe";
import { hasAnyPermission, hasRole } from "../utils/acl";

export default function PrivateRoute({
  children,
  requireVerified,
  requireRole,
  requirePermission,
  mode = "ALL", // "ALL" or "ANY"
}) {
  const { data, isFetching } = useMeSafe();
  const location = useLocation();

  if (isFetching) return null;

  //  normalize user object shape
  // PRO: Some hooks return { data }, others return the object directly.
  const meRaw = data ?? null;
  const me = meRaw?.data ?? meRaw ?? null;

  // Not logged in → go to /auth (remember intent)
  if (!me?._id && !me?.id) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  // Require verified email
  if (requireVerified && me?.emailVerified === false) {
    return <Navigate to="/verify-email" replace state={{ from: location.pathname }} />;
  }

  // Role / Permission checks
  const needsRole = !!requireRole;
  const needsPerm = !!requirePermission;

  const roleOK = !needsRole || hasRole(me, requireRole);
  const permOK =
    !needsPerm ||
    hasAnyPermission(me, Array.isArray(requirePermission) ? requirePermission : [requirePermission]);

  if (needsRole && needsPerm) {
    const ok = mode === "ANY" ? roleOK || permOK : roleOK && permOK;
    if (!ok) return <Navigate to="/account/dashboard" replace />;
  } else if (!roleOK || !permOK) {
    return <Navigate to="/account/dashboard" replace />;
  }

  return children;
}
