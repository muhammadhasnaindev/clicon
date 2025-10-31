// src/pages/account/AdminOrders.jsx
// ============================================================
//  COMMIT: Admin Orders — event logging on status/stage changes,
//            friendlier UX copy, guarded refetches, and clear
//            “NEW LOGIC START” markers across the module.
// ============================================================
import React from "react";
import {
  Box, Paper, Typography, Grid, TextField, MenuItem, Button,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  Chip, Stack, IconButton
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import PermGate from "../../acl/PermGate";
import Forbidden from "../Forbidden";

//  COMMIT (NEW LOGIC START): pulling in optional order-event logging
import {
  useAdminListOrdersQuery,
  useAdminUpdateOrderStatusMutation,
  useAdminUpdateOrderStageMutation,
  useAdminDeleteOrderMutation,
  useAdminAddOrderEventMutation, // 👈 NEW
} from "../../store/api/orders.inject";
import { displayOrderId, fmtMoney, STATUS_OPTIONS, STAGE_OPTIONS } from "../../utils/orders";

const BORDER  = "#E5E7EB";
const DARK    = "#191C1F";
const MUTED   = "#5F6C72";

const STATUS_COLORS = {
  pending: "warning",
  "in progress": "info",
  completed: "success",
  cancelled: "error",
};

export default function AdminOrders() {
  //  COMMIT (NEW LOGIC START): single source of truth filters
  const [filters, setFilters] = React.useState({ q: "", status: "", stage: "", from: "", to: "", page: 0, limit: 20 });

  // COMMIT (NEW LOGIC START): safe refetch options for a snappier feel
  const { data, isFetching, refetch } = useAdminListOrdersQuery(
    { ...filters, page: filters.page + 1, limit: filters.limit },
    { refetchOnFocus: true, refetchOnReconnect: true }
  );
  const rows = data?.data || [];
  const total = data?.meta?.total || 0;

  //  COMMIT (NEW LOGIC START): mutation wires
  const [updateStatus] = useAdminUpdateOrderStatusMutation();
  const [updateStage]  = useAdminUpdateOrderStageMutation();
  const [deleteOrder]  = useAdminDeleteOrderMutation();
  const [addEvent]     = useAdminAddOrderEventMutation(); //  NEW

  const handleChangePage = (_e, p) => setFilters((s) => ({ ...s, page: p }));
  const handleChangeRowsPerPage = (e) => setFilters((s) => ({ ...s, page: 0, limit: parseInt(e.target.value, 10) }));

  //  COMMIT (NEW LOGIC START): “best-effort” event logger, won’t crash if route is missing
  const logEvent = async (id, type, text) => {
    try { await addEvent({ id, type, text }).unwrap(); } catch { /* swallow: optional route */ }
  };

  // COMMIT (NEW LOGIC START): human-friendly status text
  const statusText = (v) => {
    switch ((v || "").toLowerCase()) {
      case "pending":      return "Order marked Pending.";
      case "in progress":  return "Order moved In Progress.";
      case "completed":    return "Order marked Completed.";
      case "cancelled":    return "Order has been Cancelled.";
      default:             return `Status changed to “${v}”.`;
    }
  };
  // COMMIT (NEW LOGIC START): human-friendly stage text
  const stageText = (v) => {
    switch ((v || "").toLowerCase()) {
      case "created":    return "Order has been created.";
      case "packaging":  return "Order is in Packaging.";
      case "shipped":    return "Order has been Shipped.";
      case "delivered":  return "Order has been Delivered.";
      default:           return `Stage changed to “${v}”.`;
    }
  };

  //  COMMIT (NEW LOGIC START): change flows w/ event trail + refresh
  const saveStatus = async (id, status) => {
    try { await updateStatus({ id, status }).unwrap(); await logEvent(id, status, statusText(status)); }
    finally { refetch(); }
  };
  const saveStage  = async (id, stage)  => {
    try { await updateStage({ id, stage }).unwrap(); await logEvent(id, stage, stageText(stage)); }
    finally { refetch(); }
  };
  const remove     = async (id) => {
    if (confirm("Delete this order?")) {
      try { await deleteOrder(id).unwrap(); }
      finally { refetch(); }
    }
  };

  return (
    <PermGate any={["billing:view", "orders:update", "analytics:view"]} fallback={<Forbidden />}>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: DARK }}>Orders</Typography>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={()=>refetch()}
                  sx={{ textTransform: "none", borderColor: BORDER, color: DARK }}>
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </Stack>

        {/*  COMMIT (NEW LOGIC START): filters with instant page reset */}
        <Paper variant="outlined" sx={{ borderColor: BORDER, mb: 2, p: 2, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField label="Search (email or ID)" fullWidth size="small"
                value={filters.q} onChange={(e)=>setFilters(s=>({...s, q: e.target.value, page:0}))}/>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="Status" select fullWidth size="small"
                value={filters.status} onChange={(e)=>setFilters(s=>({...s, status: e.target.value, page:0}))}>
                <MenuItem value="">Any</MenuItem>
                {STATUS_OPTIONS.map((o)=>(<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="Stage" select fullWidth size="small"
                value={filters.stage} onChange={(e)=>setFilters(s=>({...s, stage: e.target.value, page:0}))}>
                <MenuItem value="">Any</MenuItem>
                {STAGE_OPTIONS.map((o)=>(<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="From" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                value={filters.from} onChange={(e)=>setFilters(s=>({...s, from: e.target.value, page:0}))}/>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="To" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                value={filters.to} onChange={(e)=>setFilters(s=>({...s, to: e.target.value, page:0}))}/>
            </Grid>
          </Grid>
        </Paper>

        {/*  COMMIT (NEW LOGIC START): table with safe fallbacks */}
        <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 2, overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell>Created</TableCell>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="right">Items</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell width={170}>Status</TableCell>
                <TableCell width={170}>Stage</TableCell>
                <TableCell width={80}>Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((o) => {
                const did = displayOrderId(o);
                return (
                  <TableRow key={did}>
                    <TableCell>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}</TableCell>
                    <TableCell>{did}</TableCell>
                    <TableCell>{o.customer?.name || "-"}</TableCell>
                    <TableCell>{o.customer?.email || "-"}</TableCell>
                    <TableCell align="right">{o.itemsCount ?? o.items?.length ?? 0}</TableCell>
                    <TableCell align="right">{fmtMoney(o?.totals?.totalBase ?? o.total)}</TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={o.status} color={STATUS_COLORS[o.status] || "default"} />
                        <TextField select size="small" value={o.status || ""} onChange={(e)=>saveStatus(o.id || o._id, e.target.value)}>
                          {STATUS_OPTIONS.map((op)=>(<MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>))}
                        </TextField>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <TextField select size="small" value={o.stage || ""} onChange={(e)=>saveStage(o.id || o._id, e.target.value)} fullWidth>
                        {STAGE_OPTIONS.map((op)=>(<MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>))}
                      </TextField>
                    </TableCell>

                    <TableCell>
                      <IconButton size="small" onClick={()=>remove(o.id || o._id)} aria-label="delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: MUTED }}>
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={filters.page}
            onPageChange={handleChangePage}
            rowsPerPage={filters.limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Paper>
      </Box>
    </PermGate>
  );
}
