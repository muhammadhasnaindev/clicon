// src/pages/account/AdminStaff.jsx
/**
 * AdminStaff — Lightweight staff listing with search, pagination, and safe delete.

 */

import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar, Stack, Chip, Pagination, Tooltip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { useAdminListStaffQuery } from "../../store/api/peopleApi";
import { useAdminDeleteUserMutation, useMeQuery } from "../../store/api/apiSlice";

/* ---------- Small UI constants (avoid magic values) ---------- */
const PAGE_SIZE = 20;
const EMPTY_TEXT = "No staff.";

/** Format a date safely. */
function NiceDate({ value }) {
  if (!value) return <span>-</span>;
  const d = new Date(value);
  // Keep locale-default for admin console; no hard-coded tz.
  return <span>{d.toLocaleString()}</span>;
}

/**
 * Admin staff management table with search, pagination and deletion.
 * @returns {JSX.Element}
 */
export default function AdminStaff() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isFetching, refetch } = useAdminListStaffQuery({ page, limit: PAGE_SIZE, q });
  const rows = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: meRaw } = useMeQuery();
  const me = meRaw?.data ?? meRaw ?? {};
  const myId = me?._id || me?.id || "";

  const [deleteUser, { isLoading: deleting }] = useAdminDeleteUserMutation();
  const [delTarget, setDelTarget] = useState(null);
  const [pageErr, setPageErr] = useState("");
  const [pageMsg, setPageMsg] = useState("");
  const [msgTimer, setMsgTimer] = useState(null);

  const canDelete = (u) => {
    if (!u) return false;
    if ((u.role || "").toLowerCase() === "admin") return false; // backend should also block
    if (String(u._id) === String(myId)) return false;
    return true;
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

  /* ==== NEW LOGIC: Auto-clear success message ====
     PRO: Prevents stale success banners from lingering and confusing the user.
     Edge cases: timer is reset per new message; cleared on unmount. */
  useEffect(() => {
    if (!pageMsg) return;
    if (msgTimer) clearTimeout(msgTimer);
    const t = setTimeout(() => setPageMsg(""), 2500);
    setMsgTimer(t);
    return () => clearTimeout(t);
  }, [pageMsg]);

  return (
    <Box className="p-4">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Staff</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Search name/email…"
            value={q}
            onChange={(e)=>{ setQ(e.target.value); setPage(1); }}
          />
          <IconButton onClick={() => refetch()} disabled={isFetching}><RefreshIcon /></IconButton>
        </Stack>
      </Stack>

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
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell width={120} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={u.avatarUrl || ""} alt={u.name || u.email} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{u.name || u.fullName || u.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Chip size="small" label={u.role || "-"} /></TableCell>
                    <TableCell><NiceDate value={u.lastLogin?.createdAt} /></TableCell>
                    <TableCell>
                      {u.lastLogin?.device && (
                        <Chip size="small" label={`${u.lastLogin.device} • ${u.lastLogin.browser || ""}`} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={canDelete(u) ? "Delete user" : "Cannot delete"}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!canDelete(u) || deleting}
                            onClick={() => setDelTarget(u)}
                          >
                            <DeleteForeverIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6}>{EMPTY_TEXT}</TableCell></TableRow>
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

      {/* Delete confirm */}
      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete user</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to permanently delete <b>{delTarget?.email}</b>?
          </Typography>
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
