// src/pages/account/AdminCustomers.jsx
/**
 * AdminCustomers
 * Summary: Admin list/search/filter customers with activity dialog, CSV export, and delete.
 
 */

import React, { useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, IconButton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Pagination,
  MenuItem, Select, FormControl, InputLabel, Tooltip, Alert
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DownloadIcon from "@mui/icons-material/Download";
import { saveAs } from "file-saver";
import {
  useAdminListCustomersQuery,
  useAdminGetUserActivityQuery,
  useAdminExportCustomersCsvMutation,
} from "../../store/api/peopleApi";
import { useAdminDeleteUserMutation } from "../../store/api/apiSlice";
import { useMeQuery } from "../../store/api/apiSlice";

/** Pretty date for table cells */
function NiceDate({ value }) {
  if (!value) return <span>-</span>;
  const d = new Date(value);
  return <span>{d.toLocaleString()}</span>;
}

const DEVICE_OPTIONS = [
  { value: "", label: "Any device" },
  { value: "desktop", label: "Desktop (top)" },
  { value: "mobile",  label: "Mobile (top)"  },
  { value: "tablet",  label: "Tablet (top)"  },
  { value: "other",   label: "Other (top)"   },
];

/** ======================= NEW/REVISED LOGIC =======================
 * PRO: Predictable CSV filename; keeps exports organized by date.
 */
const CSV_NAME = () => {
  const d = new Date();
  const iso = d.toISOString().slice(0, 10);
  return `customers_export_${iso}.csv`;
};

/**
 * Customers list with filters, export, activity dialog, and delete.
 */
export default function AdminCustomers() {
  const { data: meRaw } = useMeQuery();
  const me = meRaw?.data ?? meRaw ?? {};
  const myId = me?._id || me?.id || "";

  // Filters
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [start, setStart] = useState(""); // yyyy-mm-dd
  const [end, setEnd] = useState("");
  const [minOrders, setMinOrders] = useState(1);
  const [deviceTop, setDeviceTop] = useState("");

  const queryArgs = useMemo(
    () => ({ page, limit: 20, q, start: start || undefined, end: end || undefined, minOrders, deviceTop }),
    [page, q, start, end, minOrders, deviceTop]
  );

  const { data, isFetching, refetch } = useAdminListCustomersQuery(queryArgs);
  const rows = data?.data || [];
  const total = Number(data?.meta?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / 20));

  // Activity
  const [actUser, setActUser] = useState(null);
  const { data: actData } = useAdminGetUserActivityQuery(actUser?._id ?? "", { skip: !actUser });

  // CSV export
  const [exportCsv, { isLoading: exporting }] = useAdminExportCustomersCsvMutation();

  // Delete
  const [deleteUser, { isLoading: deleting }] = useAdminDeleteUserMutation();
  const [delTarget, setDelTarget] = useState(null);
  const [pageErr, setPageErr] = useState("");
  const [pageMsg, setPageMsg] = useState("");

  // ======================= NEW/REVISED LOGIC =======================
  // PRO: Wrap export in try/catch with clear feedback; generate dated filename.
  const onExport = async () => {
    try {
      setPageErr("");
      const text = await exportCsv({ q, start: start || undefined, end: end || undefined, minOrders, deviceTop }).unwrap();
      const blob = new Blob([text ?? ""], { type: "text/csv;charset=utf-8" });
      saveAs(blob, CSV_NAME());
    } catch (e) {
      setPageErr(e?.data?.message || e?.error || e?.message || "Export failed");
    }
  };

  const onDelete = async () => {
    if (!delTarget) return;
    setPageErr(""); setPageMsg("");
    try {
      await deleteUser(delTarget._id).unwrap();
      setPageMsg("User deleted.");
      setDelTarget(null);
      refetch();
    } catch (e) {
      setPageErr(e?.data?.message || e?.error || e?.message || "Delete failed");
    }
  };

  /** ======================= NEW/REVISED LOGIC =======================
   * PRO: Centralize delete guard; prevents admin/self deletion reliably.
   */
  const canDelete = (u) => {
    if (!u) return false;
    if ((u.role || "").toLowerCase() === "admin") return false;
    if (String(u._id) === String(myId)) return false;
    return true;
  };

  return (
    <Box className="p-4">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Customers</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Search name/email…"
            value={q}
            onChange={(e)=>{ setQ(e.target.value); setPage(1);} }
            inputProps={{ "aria-label": "Search customers" }}
          />
          <IconButton onClick={() => refetch()} disabled={isFetching} aria-label="Refresh list"><RefreshIcon /></IconButton>
        </Stack>
      </Stack>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-end" }}>
            <TextField
              label="Start date"
              type="date"
              size="small"
              value={start}
              onChange={(e)=>{ setStart(e.target.value); setPage(1);} }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End date"
              type="date"
              size="small"
              value={end}
              onChange={(e)=>{ setEnd(e.target.value); setPage(1);} }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Min orders"
              type="number"
              size="small"
              value={minOrders}
              onChange={(e)=>{ 
                const n = Math.max(1, Number(e.target.value || 1));
                setMinOrders(Number.isFinite(n) ? n : 1);
                setPage(1);
              }}
              inputProps={{ min: 1, step: 1 }}
              sx={{ width: 140 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Top device</InputLabel>
              <Select
                label="Top device"
                value={deviceTop}
                onChange={(e)=>{ setDeviceTop(e.target.value); setPage(1);} }
              >
                {DEVICE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>

            <Box flex={1} />

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={onExport}
              disabled={exporting || isFetching}
            >
              Export CSV
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {(pageErr || pageMsg) && (
        <Alert severity={pageErr ? "error" : "success"} sx={{ mb: 2 }}>
          {pageErr || pageMsg}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell>Last Order</TableCell>
                  <TableCell align="right">Views</TableCell>
                  <TableCell>Last Seen</TableCell>
                  <TableCell>Top Device</TableCell>
                  <TableCell width={120} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={u?.avatarUrl || ""} alt={u?.name || u?.email} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{u?.name || u?.fullName || u?.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{u?.email}</TableCell>
                    <TableCell align="right"><b>{Number(u?.totalOrders || 0)}</b></TableCell>
                    <TableCell><NiceDate value={u?.lastOrderAt} /></TableCell>
                    <TableCell align="right">{Number(u?.totalViews || 0)}</TableCell>
                    <TableCell>
                      <NiceDate value={u?.lastLogin?.createdAt || u?.lastViewAt || u?.lastOrderAt} />
                    </TableCell>
                    <TableCell>
                      {u?.topDevice && <Chip size="small" label={u.topDevice} />}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Activity"><span>
                          <IconButton size="small" onClick={() => setActUser(u)} aria-label="Open activity dialog"><VisibilityIcon /></IconButton>
                        </span></Tooltip>
                        <Tooltip title={canDelete(u) ? "Delete user" : "Cannot delete"}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!canDelete(u) || deleting}
                              onClick={() => setDelTarget(u)}
                              aria-label="Delete user"
                            >
                              <DeleteForeverIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={8}>No customers.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Stack alignItems="flex-end" sx={{ mt: 2 }}>
              <Pagination page={page} count={totalPages} size="small" onChange={(_e, p) => setPage(p)} />
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Activity dialog */}
      <Dialog open={!!actUser} onClose={() => setActUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Activity — {actUser?.email}</DialogTitle>
        <DialogContent dividers>
          {actData?.data ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1}>
                <Chip label={`Orders: ${Number(actData.data.orders?.total || 0)}`} />
                <Chip label={`Views: ${Number(actData.data.views?.total || 0)}`} />
              </Stack>
              <Typography variant="body2">Last login: <NiceDate value={actData.data.lastLogin?.createdAt} /></Typography>
              <Typography variant="body2">Last seen: <NiceDate value={actData.data.lastSeenAt} /></Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Devices</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {(actData.data.devices || []).map((d, idx) => (
                  <Chip key={idx} label={`${d?.device ?? "Unknown"} • ${d?.os ?? "?"} • ${d?.browser ?? "?"} (${Number(d?.count || 0)})`} />
                ))}
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2">Loading…</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActUser(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete user</DialogTitle>
        <DialogContent dividers>
          <Typography>Are you sure you want to permanently delete <b>{delTarget?.email}</b>?</Typography>
          <Typography variant="caption" color="text.secondary">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelTarget(null)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
