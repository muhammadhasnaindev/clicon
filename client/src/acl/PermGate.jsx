// src/acl/PermGate.jsx
import React from "react";
import { useSelector } from "react-redux";
import { useMeQuery } from "../store/api/apiSlice";
import { matchPermission } from "../utils/acl";

/**
 * Usage:
 * <PermGate all={['products:write']} any={['analytics:view']} fallback={<div>403</div>}>
 *   ...secure UI...
 * </PermGate>
 *
 * Notes:
 * - Admins bypass granular checks (same as backend requirePermission).
 * - Reads RTK `useMeQuery()` first, falls back to legacy Redux slice if present.
 */
export default function PermGate({
  all = [],               // all of these perms required
  any = [],               // at least one of these perms required
  children,
  fallback = null,
  allowAdminBypass = true // keep in sync with backend middleware
}) {
  const { data: meRTK, isFetching } = useMeQuery();
  const legacy = useSelector((s) => s.auth?.user || null);

  // normalize: RTK me returns the user object directly (already normalized)
  const me = meRTK || legacy || {};
  const granted = Array.isArray(me?.permissions) ? me.permissions : [];

  // Wait for the first me fetch if we have no role yet
  if (isFetching && !me?.role) return null;

  const adminBypass = allowAdminBypass && me?.role === "admin";

  const hasAll = (arr = []) =>
    arr.every((need) => granted.some((g) => matchPermission(g, need)));

  const hasAny = (arr = []) =>
    arr.length === 0 || arr.some((need) => granted.some((g) => matchPermission(g, need)));

  if (adminBypass || (hasAll(all) && hasAny(any))) {
    return <>{children}</>;
  }
  return fallback ?? null;
}
