/**
 * OrderTracking
 * Short: Public/private order tracking with timeline, stage progress, and activity feed.
 
 */

import React from "react";
import { Box, Typography, Paper, Stack, Divider, Grid, Alert } from "@mui/material";

import TaskAltIcon from "@mui/icons-material/TaskAlt";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

import { useLocation, useParams } from "react-router-dom";
import { useGetOrderQuery, useTrackOrderMutation } from "../store/api/orders.inject";
import { displayOrderId, fmtMoney, stageToIndex } from "../utils/orders";

const ORANGE = "#FA8232";
const BLUE = "#1B6392";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";
const BANNER = "#FFF6E5";
const BANNER_BORDER = "#FFECB8";

const POLL_MS = 10000;

const STEPS = [
  { key: "placed",    label: "Order Placed", icon: <TaskAltIcon sx={{ color: "#4CAF50" }} /> },
  { key: "packaging", label: "Packaging",    icon: <Inventory2OutlinedIcon sx={{ color: ORANGE }} /> },
  { key: "road",      label: "On The Road",  icon: <LocalShippingOutlinedIcon sx={{ color: "#5F6C72" }} /> },
  { key: "delivered", label: "Delivered",    icon: <HandshakeOutlinedIcon sx={{ color: "#5F6C72" }} /> },
];

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  const date = dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const time = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
};
const fmtDateOnly = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-";

const ICON_BY_TYPE = {
  created: <TaskAltIcon sx={{ color: ORANGE }} />,
  placed: <TaskAltIcon sx={{ color: ORANGE }} />,
  verified: <CheckCircleIcon sx={{ color: "#4CAF50" }} />,
  confirmed: <TaskAltIcon sx={{ color: ORANGE }} />,
  packaging: <Inventory2OutlinedIcon sx={{ color: ORANGE }} />,
  packing: <Inventory2OutlinedIcon sx={{ color: ORANGE }} />,
  shipped: <LocalShippingOutlinedIcon sx={{ color: "#5F6C72" }} />,
  road: <LocalShippingOutlinedIcon sx={{ color: "#5F6C72" }} />,
  lastmile: <PlaceOutlinedIcon sx={{ color: "#64B5F6" }} />,
  delivered: <HandshakeOutlinedIcon sx={{ color: "#5F6C72" }} />,
  completed: <HandshakeOutlinedIcon sx={{ color: "#5F6C72" }} />,
  cancelled: <CancelOutlinedIcon sx={{ color: "#EF4444" }} />,
  default: <CheckCircleIcon sx={{ color: "#4CAF50" }} />,
};

function buildActivities(order) {
  const out = [];
  const push = (type, text, at) => {
    const code = String(type || "").toLowerCase();
    out.push({
      icon: ICON_BY_TYPE[code] || ICON_BY_TYPE.default,
      text: text || (code ? `Order ${code}` : "Order update"),
      date: fmtDate(at),
      _at: at ? new Date(at).getTime() : 0,
      _key: `${code}|${text}|${at ? new Date(at).toISOString().slice(0,16) : ""}`, // minute precision
    });
  };

  if (Array.isArray(order?.statusTimeline)) {
    for (const ev of order.statusTimeline) push(ev.code, ev.note, ev.at);
  }
  const others = order?.activities || order?.timeline || order?.history || order?.events || [];
  if (Array.isArray(others)) {
    for (const ev of others) push(ev.type || ev.key || ev.stage || ev.status || ev.label || ev.code, ev.text || ev.message || ev.label || ev.note, ev.date || ev.at || ev.time || ev.createdAt || ev.timestamp);
  }

  if (!out.length) {
    if (order.createdAt) push("created", "Your order has been confirmed.", order.createdAt);
    if (order.deliveredAt || (order.status === "completed" ? order.updatedAt : null))
      push("delivered", "Your order has been delivered. Thank you for shopping!", order.deliveredAt || order.updatedAt);
    if (order.cancelledAt || (order.status === "cancelled" ? order.updatedAt : null))
      push("cancelled", "Your order has been cancelled.", order.cancelledAt || order.updatedAt);
  }

  // sort & de-dupe (remove same _key to avoid “Stage updated by admin” spam)
  const sorted = out.filter(a=>a.date && a.text).sort((a,b)=>(b._at||0)-(a._at||0));
  const uniq = [];
  const seen = new Set();
  for (const a of sorted) {
    if (seen.has(a._key)) continue;
    seen.add(a._key);
    uniq.push(a);
  }
  return uniq;
}

/**
 * OrderTracking
 * Renders progress UI and activities for a given order id (private or email-based).
 */
export default function OrderTracking() {
  const { id: routeId } = useParams();
  const { search } = useLocation();
  const qs = new URLSearchParams(search);
  const email = qs.get("e") || "";

  const { data, error, isFetching } = useGetOrderQuery(routeId, {
    skip: !routeId,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: POLL_MS,
  });

  const [track, { data: trackData, error: trackErr, isLoading: tracking }] = useTrackOrderMutation();

  React.useEffect(() => {
    // === [NEW LOGIC - 2025-10-25]: only attempt email tracking when needed
    // PRO: Avoid redundant calls when private fetch succeeds or no email present.
    if (!routeId || !email) return;
    const noAuthData = (!data && !isFetching) || (error && (error.status === 401 || error.status === 403));
    if (noAuthData) track({ orderId: routeId, email }).catch(() => {});
  }, [routeId, email, data, error, isFetching, track]);

  const order = (data && (data.data || data)) || (trackData && (trackData.data || trackData)) || {};
  const did = displayOrderId(order) || routeId || "";
  const itemsCount = order?.items?.length || 0;
  const createdLine = order?.createdAt ? `Order Placed in ${fmtDate(order.createdAt)}` : "-";
  const amountText = fmtMoney(order?.totals?.totalBase ?? order?.total, order?.currency || "USD");

  const etaRaw = order?.eta || order?.expectedAt || order?.expectedDelivery || order?.deliveryDate || null;
  const etaText = etaRaw ? fmtDateOnly(etaRaw) : null;

  const status = String(order?.status || "").toLowerCase();
  const stage = String(order?.stage || "").toLowerCase();
  const total = STEPS.length;

  
  // PRO: Protects UI when backend sends unknown stage/status.
  const rawIndex = stageToIndex(stage, status);
  const activeIndex = Math.min(Math.max(rawIndex, 0), total - 1);

  const progressPct = total > 1 ? (activeIndex / (total - 1)) * 100 : 0;

  
  // PRO: Avoids rebuilding arrays on every render; sorts/dedupes once per order change.
  const activities = React.useMemo(() => buildActivities(order), [order]);

  return (
    <Box sx={{ py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 1320, mx: "auto" }}>
        <Paper elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 1, overflow: "hidden" }}>
          {/* banner */}
          <Box
            sx={{
              bgcolor: BANNER,
              borderBottom: `1px solid ${BANNER_BORDER}`,
              px: 2.5, py: 1.75,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 2, flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, color: DARK }}>#{did}</Typography>
              <Typography sx={{ color: MUTED, fontSize: 13 }}>
                {itemsCount} Products • {createdLine}
              </Typography>
            </Box>
            <Typography sx={{ color: BLUE, fontWeight: 800, fontSize: 20 }}>{amountText}</Typography>
          </Box>

          {!!etaText && (
            <Typography sx={{ px: 2.5, pt: 2, color: MUTED, fontSize: 13 }}>
              Order expected arrival <b style={{ color: DARK }}>{etaText}</b>
            </Typography>
          )}

          {/* progress */}
          <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
            <Box sx={{ position: "relative", height: 30, mb: 3 }}>
              <Box sx={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)",
                         height: 4, bgcolor: "#F2F4F5", borderRadius: 999 }} />
              <Box sx={{ position: "absolute", left: 0, width: `${progressPct}%`, top: "50%",
                         transform: "translateY(-50%)", height: 4, bgcolor: ORANGE, borderRadius: 999,
                         transition: "width .2s ease" }} />
              <Box sx={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${total}, 1fr)` }}>
                {STEPS.map((_, i) => {
                  const done = i <= activeIndex;
                  return (
                    <Box key={i} sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Box sx={{
                        position: "absolute", top: "50%", transform: "translateY(-50%)",
                        width: 14, height: 14, borderRadius: "50%",
                        border: `2px solid ${done ? ORANGE : "#D9DFE5"}`,
                        bgcolor: done ? ORANGE : "#fff",
                        boxShadow: done ? "0 0 0 2px #FFF" : "none",
                      }} />
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Grid container>
              {STEPS.map((s, i) => {
                const done = i <= activeIndex;
                return (
                  <Grid key={s.key} item xs={3} sx={{ textAlign: "center" }}>
                    <Box sx={{
                      width: 28, height: 28, mx: "auto", borderRadius: 1,
                      border: `1px solid ${done ? ORANGE : BORDER}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      mb: 0.75, bgcolor: done ? "#FFF3E8" : "#fff",
                    }}>
                      {s.icon}
                    </Box>
                    <Typography sx={{ fontSize: 12, color: done ? DARK : "#9AA7B0" }}>{s.label}</Typography>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Order Activity */}
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: DARK, mb: 1.5 }}>Order Activity</Typography>

            {activities.length === 0 && !(tracking || isFetching) && (
              <Typography sx={{ color: MUTED, fontSize: 13 }}>No activity yet.</Typography>
            )}

            <Stack spacing={1.25}>
              {activities.map((a, idx) => (
                <Stack key={idx} direction="row" spacing={1.25} alignItems="flex-start">
                  <Box sx={{
                    width: 22, height: 22, borderRadius: 1, border: `1px solid ${BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    mt: "2px", bgcolor: "#fff", flexShrink: 0,
                  }}>
                    {a.icon}
                  </Box>
                  <Box sx={{ lineHeight: 1.35 }}>
                    <Typography sx={{ fontSize: 13, color: DARK }}>{a.text}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.25 }}>{a.date}</Typography>
                  </Box>
                </Stack>
              ))}

              {(tracking || isFetching) && (
                <Typography sx={{ color: MUTED, fontSize: 13 }}>Loading…</Typography>
              )}
              {trackErr && !order?.id && !order?._id && (
                <Alert severity="error">
                  {trackErr?.data?.message || trackErr?.error || "Unable to track this order."}
                </Alert>
              )}
              {error && !order?.id && !order?._id && (
                <Alert severity="error">
                  {error?.data?.message || error?.error || "Unable to load this order."}
                </Alert>
              )}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
