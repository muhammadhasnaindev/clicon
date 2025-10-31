// src/pages/account/DashboardHome.jsx
/**
 * DashboardHome
 * - Human-friendly polish and safer data handling.
 * - ===== NEW LOGIC: derived counts, resilient images, money formatting guard, empty states, memoized slices =====
 */

import React, { useMemo } from "react";
import { Box, Grid, Paper, Typography, Avatar, Button, Stack, Chip } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CreditCardIcon from "@mui/icons-material/CreditCard";

import {
  useMeQuery,
  useGetPaymentMethodsQuery,
  useGetBrowsingHistoryQuery,
  useGetOrdersQuery,
} from "../../store/api/apiSlice";
import { displayOrderId, fmtMoney } from "../../utils/orders";

const BORDER = "#E5E7EB";
const ORANGE = "#FA8232";
const BLUE = "#1B6392";
const MUTED = "#5F6C72";

const CardShell = ({ title, action, children, sx }) => (
  <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 1, ...sx }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      {action || null}
    </Stack>
    {children}
  </Paper>
);

const StatCard = ({ icon, label, value, to }) => (
  <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 1 }}>
    <Stack direction="row" alignItems="center" spacing={2}>
      <Box sx={{ bgcolor: "#FFF3E8", p: 1.25, borderRadius: 2 }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 12, color: MUTED }}>{label}</Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{value}</Typography>
      </Box>
      {to ? (
        <Button component={RouterLink} to={to} size="small" sx={{ color: BLUE }}>
          View
        </Button>
      ) : null}
    </Stack>
  </Paper>
);

const MoneyCard = ({ amount, last4, name, color = BLUE }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      border: `1px solid ${BORDER}`,
      borderRadius: 1,
      bgcolor: color,
      color: "#fff",
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Typography sx={{ fontWeight: 700 }}>{amount}</Typography>
      <Chip size="small" label="Edit Card" sx={{ bgcolor: "rgba(255,255,255,.2)", color: "#fff" }} />
    </Stack>
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
      <CreditCardIcon />
      <Typography sx={{ fontWeight: 800, letterSpacing: 1 }}>
        **** **** **** {last4 || "0000"}
      </Typography>
    </Stack>
    <Typography sx={{ mt: 0.5, opacity: 0.9 }}>{name}</Typography>
  </Paper>
);

// ===== NEW LOGIC: resilient product image helper =====
const safeImg = (src) => {
  if (!src) return "/uploads/placeholder.png";
  const s = String(src);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return s;
  return `/${s.replace(/^\/+/, "")}`;
};

export default function DashboardHome() {
  const { data: me } = useMeQuery();
  const user = me || {};

  // ===== NEW LOGIC: memoize derived slices for stability and clarity =====
  const { data: ordersData } = useGetOrdersQuery({ page: 1, limit: 8 });
  const orders = useMemo(() => ordersData?.data || [], [ordersData]);
  const pending = useMemo(
    () =>
      orders.filter(
        (o) =>
          String(o.status || "").toLowerCase() === "pending" ||
          String(o.status || "").toLowerCase().includes("progress")
      ).length,
    [orders]
  );
  const completed = useMemo(
    () => orders.filter((o) => String(o.status || "").toLowerCase() === "completed").length,
    [orders]
  );

  const { data: pmData } = useGetPaymentMethodsQuery();
  const cards = pmData?.data || [];

  const { data: hist } = useGetBrowsingHistoryQuery({ page: 1, limit: 8 });
  const browsing = hist?.data || [];

  // ===== NEW LOGIC: defensive money formatting for example totals =====
  const demoAmount = fmtMoney(95640, "USD");

  return (
    <Box>
      {/* Intro */}
      <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
        Hello, {user?.displayName || user?.name || "Guest"}
      </Typography>
      <Typography sx={{ color: MUTED, fontSize: 13, mb: 2 }}>
        From your account dashboard, you can easily check &amp; view your recent orders, manage your{" "}
        <RouterLink to="/account/dashboard/cards-address">Billing Addresses</RouterLink> and{" "}
        <RouterLink to="/account/dashboard/settings">edit your Password and Account Details</RouterLink>.
      </Typography>

      {/* Top row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <CardShell title="Account Info">
            <Stack direction="row" spacing={2} alignItems="center">
              {/* ===== NEW LOGIC: avatar fallback kept safe ===== */}
              <Avatar
                sx={{ width: 56, height: 56 }}
                src={user?.avatarAbs || user?.avatarUrl || ""}
                alt={user?.displayName || user?.name || "User"}
              />
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {user?.displayName || user?.name || "-"}
                </Typography>
                <Typography sx={{ fontSize: 13, color: MUTED }}>{user?.email || "-"}</Typography>
                <Typography sx={{ fontSize: 13, color: MUTED }}>{user?.phone || "-"}</Typography>
              </Box>
            </Stack>
            <Button
              component={RouterLink}
              to="/account/dashboard/settings"
              size="small"
              variant="outlined"
              sx={{ mt: 1.5 }}
            >
              Edit Account
            </Button>
          </CardShell>
        </Grid>

        <Grid item xs={12} md={6}>
          <CardShell title="Billing Address">
            <Typography sx={{ color: "#374151", fontSize: 14 }}>
              {user?.billingAddress?.line1 || "-"}
              {user?.billingAddress?.city ? `, ${user.billingAddress.city}` : ""}
              {user?.billingAddress?.country ? `, ${user.billingAddress.country}` : ""}
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: 13, mt: 0.5 }}>
              Phone: {user?.phone || "-"} • Email: {user?.email || "-"}
            </Typography>
            <Button
              component={RouterLink}
              to="/account/dashboard/cards-address"
              size="small"
              variant="outlined"
              sx={{ mt: 1.5 }}
            >
              Edit Address
            </Button>
          </CardShell>
        </Grid>

        <Grid item xs={12} md={4}>
          <StatCard
            icon={<LocalMallIcon sx={{ color: BLUE }} />}
            label="Total Orders"
            value={ordersData?.meta?.total ?? orders.length ?? 0}
            to="/account/dashboard/orders"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={<PendingActionsIcon sx={{ color: ORANGE }} />}
            label="Pending Orders"
            value={pending}
            to="/account/dashboard/orders"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={<AssignmentTurnedInIcon sx={{ color: "#059669" }} />}
            label="Completed Orders"
            value={completed}
            to="/account/dashboard/orders"
          />
        </Grid>
      </Grid>

      {/* Payment Option */}
      <CardShell
        title="Payment Option"
        sx={{ mt: 2 }}
        action={
          <Button component={RouterLink} to="/account/dashboard/cards-address" size="small">
            Add Card →
          </Button>
        }
      >
        <Grid container spacing={2}>
          {cards.slice(0, 2).map((pm, i) => (
            <Grid key={pm.id || pm._id || i} item xs={12} md={6}>
              <MoneyCard
                amount={demoAmount}
                last4={pm.last4}
                name={pm.name || user?.name || ""}
                color={i === 0 ? BLUE : "#059669"}
              />
            </Grid>
          ))}
          {/* ===== NEW LOGIC: empty state for no cards ===== */}
          {!cards?.length && (
            <Grid item xs={12}>
              <Typography sx={{ color: MUTED, fontSize: 13 }}>
                No saved cards yet. Add one to speed up checkout.
              </Typography>
            </Grid>
          )}
        </Grid>
      </CardShell>

      {/* Recent Orders */}
      <CardShell
        title="Recent Order"
        sx={{ mt: 2 }}
        action={
          <Button component={RouterLink} to="/account/dashboard/orders" size="small" sx={{ color: BLUE }}>
            View All →
          </Button>
        }
      >
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead" sx={{ bgcolor: "#F9FAFB" }}>
              <Box component="tr">
                {["ORDER ID", "STATUS", "DATE", "TOTAL", "ACTION"].map((h) => (
                  <Box
                    key={h}
                    component="th"
                    style={{ textAlign: "left" }}
                    sx={{ p: 1.25, fontSize: 12.5, color: MUTED, borderBottom: `1px solid ${BORDER}` }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {orders.slice(0, 6).map((o) => {
                const did = displayOrderId(o);
                const status = String(o.status || "-").toUpperCase();
                const chipProps =
                  status === "COMPLETED"
                    ? { color: "success", variant: "filled" }
                    : status === "IN PROGRESS"
                    ? { color: "warning", variant: "filled" }
                    : status === "CANCELLED"
                    ? { color: "error", variant: "outlined" }
                    : { variant: "outlined" };

                return (
                  <Box key={o.id || o._id || did} component="tr">
                    <Box component="td" sx={{ p: 1.25, borderBottom: "1px solid #F1F5F9", fontWeight: 600 }}>
                      #{did}
                    </Box>
                    <Box component="td" sx={{ p: 1.25, borderBottom: "1px solid #F1F5F9" }}>
                      <Chip size="small" label={status} {...chipProps} />
                    </Box>
                    <Box component="td" sx={{ p: 1.25, borderBottom: "1px solid #F1F5F9", color: MUTED }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}
                    </Box>
                    <Box component="td" sx={{ p: 1.25, borderBottom: "1px solid #F1F5F9" }}>
                      {fmtMoney(o?.totals?.totalBase ?? o.total, o?.currency || "USD")}
                      {o.items?.length ? `  (${o.items.length} Products)` : ""}
                    </Box>
                    <Box component="td" sx={{ p: 1.25, borderBottom: "1px solid #F1F5F9" }}>
                      <Button
                        component={RouterLink}
                        to={`/account/dashboard/orders/${o.id || o._id}`}
                        size="small"
                      >
                        View Details →
                      </Button>
                    </Box>
                  </Box>
                );
              })}
              {/* ===== NEW LOGIC: empty state ===== */}
              {!orders.length && (
                <Box component="tr">
                  <Box component="td" colSpan={5} sx={{ p: 2, color: MUTED }}>
                    No orders yet.
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </CardShell>

      {/* Browsing History thumbnails */}
      <CardShell
        title="Browsing History"
        sx={{ mt: 2 }}
        action={
          <Button component={RouterLink} to="/account/dashboard/browsing" size="small" sx={{ color: BLUE }}>
            View All →
          </Button>
        }
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {browsing.map((p, i) => {
            // ===== NEW LOGIC: resilient src + money guard =====
            const src = safeImg(p.image || p.imageAbs || p.thumbnail || p.img || "");
            const price =
              typeof p.price === "number" ? fmtMoney(p.price, p.currency || "USD") : p.price || "";
            return (
              <Grid item xs={12} sm={6} md={3} key={p._id || p.id || p.slug || i}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                  <Box
                    component="img"
                    src={src}
                    onError={(e) => { e.currentTarget.src = "/uploads/placeholder.png"; }}
                    alt={p.title}
                    sx={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: "#F3F4F6",
                    }}
                  />
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={p.title}>
                      {p.title}
                    </Typography>
                    {p.tag ? <Chip size="small" label={p.tag} color="primary" variant="outlined" /> : null}
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5, color: "#6b7280" }}>
                    {price}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
          {!browsing.length && (
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                No browsing yet.
              </Typography>
            </Grid>
          )}
        </Grid>
      </CardShell>
    </Box>
  );
}
