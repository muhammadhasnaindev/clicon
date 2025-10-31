// src/pages/account/OrderDetails.jsx
/**
 * OrderDetails
 * - Timeline, actions, items, addresses, and ratings.
 * - NEW: activities normalizer; dual-path cancel/confirm (fallback to admin APIs);
 *        optimistic review merge; guarded buttons; progress dots.
 */

import React, { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Grid, Divider, Chip, Stack, Button, Alert, Avatar,
} from "@mui/material";
import { Link, useParams } from "react-router-dom";
import {
  useGetOrderQuery,
  useGetOrderReviewsQuery,
  useAdminUpdateOrderStatusMutation,
  useAdminUpdateOrderStageMutation,
} from "../../store/api/apiSlice";
import { displayOrderId, fmtMoney, stageToIndex } from "../../utils/orders";
// FIX: correct import path for the dialog (lives in components/reviews)
import ReviewDialog from "../../components/account/ReviewDialog";

const ORANGE = "#FA8232";
const BLUE = "#1B6392";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";
const BANNER = "#FFF6E5";
const BANNER_BORDER = "#FFECB8";

/* Icons */
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

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

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");

// ===== normalize mixed activity/event sources =====
function makeActivities(order) {
  const out = [];
  const push = (type, text, at) => {
    const code = String(type || "").toLowerCase();
    out.push({
      icon: ICON_BY_TYPE[code] || ICON_BY_TYPE.default,
      text: text || `Order ${code}`,
      date: fmtDate(at),
      _at: at ? new Date(at).getTime() : 0,
      _key: `${code}|${text}|${at ? new Date(at).toISOString().slice(0, 16) : ""}`,
    });
  };
  if (Array.isArray(order?.statusTimeline)) for (const ev of order.statusTimeline) push(ev.code, ev.note, ev.at);
  const o2 = order?.activities || order?.timeline || order?.events || [];
  if (Array.isArray(o2)) for (const ev of o2) push(ev.type || ev.code, ev.text || ev.note, ev.date || ev.at);
  if (!out.length && order.createdAt) push("created", "Your order has been confirmed.", order.createdAt);
  const sorted = out.filter((a) => a.date && a.text).sort((a, b) => (b._at || 0) - (a._at || 0));
  const seen = new Set();
  const uniq = [];
  for (const a of sorted) {
    if (seen.has(a._key)) continue;
    seen.add(a._key);
    uniq.push(a);
  }
  return uniq;
}

export default function OrderDetails() {
  const { id } = useParams();

  const { data, refetch, isFetching } = useGetOrderQuery(id, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 10000,
  });

  // fetch and merge reviews for this order
  const { data: rdata, refetch: refetchReviews, isFetching: fetchingReviews } = useGetOrderReviewsQuery(id, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 15000,
  });

  // local optimistic buffer after submit
  const [localReviews, setLocalReviews] = useState([]);

  const order = useMemo(() => data?.data || data || {}, [data]);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [adminUpdateStatus] = useAdminUpdateOrderStatusMutation();
  const [adminUpdateStage] = useAdminUpdateOrderStageMutation();

  const status = String(order.status || "").toLowerCase();
  const stage = String(order.stage || "").toLowerCase();
  const did = displayOrderId(order);

  const canCancel =
    !["cancelled", "completed"].includes(status) &&
    !["shipped", "delivered"].includes(stage);

  const canMarkReceived =
    !["cancelled", "completed"].includes(status) &&
    (["shipped", "delivered"].includes(stage) ||
      status === "in progress" ||
      status === "pending");

  // dual-path cancel with admin fallback + busy guard
  const doCancel = async () => {
    if (busy || !canCancel) return;
    setBusy(true); setMsg(""); setErr("");
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      if (!res.ok) throw new Error("cancel not supported");
      setMsg("Order cancelled.");
    } catch (e) {
      try {
        await adminUpdateStatus({ id, status: "cancelled" }).unwrap();
        setMsg("Order cancelled.");
      } catch (e2) {
        setErr(e2?.data?.message || e2?.error || e2?.message || "Failed to cancel order.");
      }
    } finally {
      setBusy(false);
      refetch();
    }
  };

  // dual-path confirm with admin fallback + busy guard
  const doMarkReceived = async () => {
    if (busy || !canMarkReceived) return;
    setBusy(true); setMsg(""); setErr("");
    try {
      // NOTE: we support /confirm alias in backend now
      const res = await fetch(`/api/orders/${id}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      if (!res.ok) throw new Error("confirm not supported");
      setMsg("Thanks! Order marked as received.");
    } catch (e) {
      try {
        await adminUpdateStatus({ id, status: "completed" }).unwrap();
        await adminUpdateStage({ id, stage: "delivered" }).unwrap();
        setMsg("Thanks! Order marked as received.");
      } catch (e2) {
        setErr(e2?.data?.message || e2?.error || e2?.message || "Failed to update order.");
      }
    } finally {
      setBusy(false);
      refetch();
    }
  };

  const totalAmount = fmtMoney(order?.totals?.totalBase ?? order?.total, order?.currency || "USD");
  const activeIndex = stageToIndex(stage, status);
  const steps = ["Order Placed", "Packaging", "On The Road", "Delivered"];
  const acts = makeActivities(order);

  // merge server reviews + local optimistic ones
  const reviewMap = useMemo(() => {
    const fromServer = rdata?.data || rdata || [];
    const map = new Map();
    for (const r of fromServer) map.set(String(r.productId), r);
    for (const r of localReviews) map.set(String(r.productId), r); // overwrite with fresh
    return map;
  }, [rdata, localReviews]);

  const getReviewFor = (pid) => reviewMap.get(String(pid));

  return (
    <Paper elevation={0} sx={{ border: `1px solid ${BANNER_BORDER}`, borderRadius: 1 }}>
      {/* Header banner */}
      <Box sx={{ p: 2, bgcolor: BANNER, borderBottom: `1px solid ${BANNER_BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, color: "#191C1F" }}>
            #{did || id} {(isFetching || fetchingReviews) ? "…" : ""}
          </Typography>
          <Typography sx={{ color: MUTED, fontSize: 13 }}>
            {(order.items?.length || 0)} Products • Order Placed on {fmtDate(order.createdAt)}
          </Typography>
        </Box>
        <Typography sx={{ color: BLUE, fontWeight: 800, fontSize: 20 }}>{totalAmount}</Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* status + actions */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Chip size="small" label={`Status: ${order.status || "-"}`} />
          <Chip size="small" label={`Stage: ${order.stage || "-"}`} />
          <Box sx={{ flex:1 }} />
          <Button onClick={() => setReviewOpen(true)} variant="text" sx={{ color: BLUE, textTransform: "none" }}>
            Leave a Rating
          </Button>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button onClick={doCancel} disabled={!canCancel || busy} variant="outlined">Cancel Order</Button>
          <Button onClick={doMarkReceived} disabled={!canMarkReceived || busy} variant="contained" sx={{ bgcolor: ORANGE, "&:hover": { bgcolor:"#E7711E" } }}>
            {busy ? "Updating…" : "Mark as Received"}
          </Button>
        </Stack>

        {msg ? <Alert severity="success" sx={{ mt: 1 }}>{msg}</Alert> : null}
        {err ? <Alert severity="error" sx={{ mt: 1 }}>{err}</Alert> : null}

        {/* steps */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ position:"relative", height:30, mb: 2 }}>
            <Box sx={{ position:"absolute", inset: "auto 0 0 0", top:"50%", transform:"translateY(-50%)", height:4, bgcolor:"#F2F4F5", borderRadius: 999 }} />
            <Box sx={{ position:"absolute", inset:0, display:"grid", gridTemplateColumns:`repeat(${steps.length},1fr)` }}>
              {steps.map((_,i)=>(
                <Box key={i} sx={{ position:"relative", display:"flex", justifyContent:"center" }}>
                  <Box sx={{
                    position:"absolute", top:"50%", transform:"translateY(-50%)",
                    width:14, height:14, borderRadius:"50%",
                    border:`2px solid ${i<=activeIndex?ORANGE:"#D9DFE5"}`,
                    bgcolor: i<=activeIndex? ORANGE : "#fff",
                    boxShadow: i<=activeIndex ? "0 0 0 2px #FFF" : "none",
                  }} />
                </Box>
              ))}
            </Box>
          </Box>
          <Grid container>
            {steps.map((s,i)=>(
              <Grid key={s} item xs={3} sx={{ textAlign:"center" }}>
                <Typography sx={{ fontSize:12, color: i<=activeIndex ? "#191C1F" : "#9AA7B0" }}>{s}</Typography>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Activity */}
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Order Activity</Typography>
        <Stack spacing={1.25} sx={{ mb: 2 }}>
          {acts.map((a, i)=>(
            <Stack key={i} direction="row" spacing={1.25}>
              <Box sx={{ width:22, height:22, borderRadius: 1, border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", bgcolor:"#fff", flexShrink:0 }}>{a.icon}</Box>
              <Box>
                <Typography sx={{ fontSize: 13, color:"#191C1F" }}>{a.text}</Typography>
                <Typography sx={{ fontSize: 11.5, color:MUTED, mt:.25 }}>{a.date}</Typography>
              </Box>
            </Stack>
          ))}
          {!acts.length && <Typography sx={{ color:MUTED, fontSize: 13 }}>No activity yet.</Typography>}
        </Stack>

        {/* Items */}
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Products ({order.items?.length || 0})</Typography>
        <Box sx={{ overflowX:"auto", border:`1px solid ${BORDER}`, borderRadius: 1 }}>
          <Box component="table" sx={{ width:"100%", borderCollapse:"collapse" }}>
            <Box component="thead" sx={{ bgcolor:"#F9FAFB" }}>
              <Box component="tr">
                {["Products","Price","Quantity","Sub Total","Review"].map(h=>(
                  <Box key={h} component="th" style={{ textAlign:"left" }} sx={{ p: 1.25, fontSize: 13, color:"#6B7280", borderBottom:`1px solid ${BORDER}` }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {(order.items || []).map((it)=> {
                const subtotal = (it.price||0)*(it.qty||0);
                const r = getReviewFor(it.productId || it.product?._id);
                const linkTo = `/product/${it.slug || it.productId || (it.product?._id) || it._id}`;
                return (
                  <Box key={it.id || it._id} component="tr">
                    <Box component="td" sx={{ p:1.25, borderBottom:`1px solid #F1F5F9` }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar
                          variant="rounded"
                          src={it.image || (Array.isArray(it.images)?it.images[0]:"") || ""}
                          alt={it.title}
                          sx={{ width: 40, height: 40 }}
                        />
                        <Box>
                          <Typography component={Link} to={linkTo} sx={{ color: BLUE, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                            {it.title}
                          </Typography>
                          {it.variant ? <Typography sx={{ fontSize: 12, color: MUTED }}>{it.variant}</Typography> : null}
                        </Box>
                      </Stack>
                    </Box>
                    <Box component="td" sx={{ p:1.25, borderBottom:`1px solid #F1F5F9` }}>{fmtMoney(it.price, order?.currency || "USD")}</Box>
                    <Box component="td" sx={{ p:1.25, borderBottom:`1px solid #F1F5F9` }}>{it.qty}</Box>
                    <Box component="td" sx={{ p:1.25, borderBottom:`1px solid #F1F5F9` }}>{fmtMoney(subtotal, order?.currency || "USD")}</Box>
                    <Box component="td" sx={{ p:1.25, borderBottom:`1px solid #F1F5F9` }}>
                      {r ? (
                        <Typography sx={{ fontSize: 12, color: "#191C1F" }}>
                          ★ {r.rating}/5 — {r.comment || "—"}
                        </Typography>
                      ) : (
                        <Button size="small" onClick={() => setReviewOpen(true)} sx={{ textTransform: "none" }}>
                          Add Review
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
              {!order.items?.length && (
                <Box component="tr"><Box component="td" colSpan={5} sx={{ p:2, color:"#6B7280" }}>No items.</Box></Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Addresses */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, border:`1px solid ${BORDER}`, borderRadius: 1 }}>
              <Typography sx={{ fontWeight: 700, mb: .5 }}>Billing Address</Typography>
              <Typography sx={{ color:"#374151" }}>{order.billingAddress?.line1 || "-"}</Typography>
              <Typography sx={{ color:"#6B7280", fontSize: 13 }}>
                {order.billingAddress?.city || ""} {order.billingAddress?.zip || ""}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, border:`1px solid ${BORDER}`, borderRadius: 1 }}>
              <Typography sx={{ fontWeight: 700, mb: .5 }}>Shipping Address</Typography>
              <Typography sx={{ color:"#374151" }}>{order.shippingAddress?.line1 || "-"}</Typography>
              <Typography sx={{ color:"#6B7280", fontSize: 13 }}>
                {order.shippingAddress?.city || ""} {order.shippingAddress?.zip || ""}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Review Modal */}
      <ReviewDialog
        open={reviewOpen}
        onClose={()=>setReviewOpen(false)}
        orderId={order.id || order._id || id}
        items={order.items || []}
        onSubmitted={(submittedItems) => {
          // optimistic local show + server refetch
          setLocalReviews(
            (submittedItems || []).map((it) => ({
              productId: it.productId,
              rating: it.rating,
              comment: it.comment || "",
            }))
          );
          setReviewOpen(false);
          refetchReviews();
        }}
      />
    </Paper>
  );
}
