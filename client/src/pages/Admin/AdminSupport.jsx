// src/pages/account/AdminSupport.jsx
/**
 * AdminSupport — Ticket list + single ticket dialog with reply, status change, and safe delete.

 */

import React, { useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Select, MenuItem, Button,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Stack, Alert, CircularProgress
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import {
  useAdminSupportListQuery,
  useAdminSupportGetQuery,
  useAdminSupportReplyMutation,
  useAdminSupportSetStatusMutation,
  useAdminSupportDeleteMutation,
} from "../../store/api/helpApi";

const ORANGE = "#FA8232";
const EMPTY_TICKETS = "No tickets.";

/** Small safe date helper to keep rendering consistent. */
const formatDate = (v) => (v ? new Date(v).toLocaleString() : "-");

/**
 * Admin support tickets list and detail dialog.
 * @returns {JSX.Element}
 */
export default function AdminSupport() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [doDelete] = useAdminSupportDeleteMutation();
  const { data, isFetching, refetch } = useAdminSupportListQuery({ status, q, page, limit: 20 });
  const rows = data?.data || [];

  // selection
  const [openId, setOpenId] = useState(null);
  const { data: one } = useAdminSupportGetQuery(openId, { skip: !openId });
  const ticket = one?.data || null;

  const [reply, setReply] = useState("");
  const [send, { isLoading: sending }] = useAdminSupportReplyMutation();
  const [setStatusReq] = useAdminSupportSetStatusMutation();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const doReply = async (closeAfter = false) => {
    setErr(""); setMsg("");
    try {
      await send({ id: ticket._id, message: reply, close: closeAfter }).unwrap();
      setReply("");
      setMsg(closeAfter ? "Reply sent and ticket closed." : "Reply sent.");
      refetch();
    } catch (e) {
      setErr(e?.data?.message || "Failed to send reply");
    }
  };

  const setTicketStatus = async (st) => {
    setErr(""); setMsg("");
    try {
      await setStatusReq({ id: ticket._id, status: st }).unwrap();
      setMsg("Status updated.");
      refetch();
    } catch (e) {
      setErr(e?.data?.message || "Failed to update status");
    }
  };

  /* ==== NEW LOGIC: Confirm + safe delete for tickets ====
     PRO: Prevents accidental deletions; shows user-safe feedback on failure.
     Edge cases: dialog can be open while deleting; we close it on success and refetch. */
  const onDeleteTicket = async () => {
    if (!ticket) return;
    const ok = window.confirm("Delete this ticket permanently?");
    if (!ok) return;
    setErr(""); setMsg("");
    try {
      await doDelete(ticket._id).unwrap();
      setOpenId(null);
      refetch();
    } catch (e) {
      setErr(e?.data?.message || "Failed to delete ticket");
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Support Tickets</Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            label="Search"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            sx={{ width: 300 }}
          />
          <Select size="small" value={status} onChange={(e)=>setStatus(e.target.value)} sx={{ width: 160 }}>
            <MenuItem value="">all</MenuItem>
            <MenuItem value="open">open</MenuItem>
            <MenuItem value="answered">answered</MenuItem>
            <MenuItem value="closed">closed</MenuItem>
          </Select>
          <Button onClick={()=>refetch()} startIcon={<RefreshIcon />}>Refresh</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isFetching ? (
            <CircularProgress size={22} />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell width={120}>Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r)=>(
                  <TableRow key={r._id}>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.status}
                        color={r.status === "closed" ? "default" : r.status === "answered" ? "success" : "warning"}
                      />
                    </TableCell>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                    <TableCell>{formatDate(r.updatedAt)}</TableCell>
                    <TableCell>
                      <Button variant="outlined" size="small" onClick={()=>setOpenId(r._id)}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6}>{EMPTY_TICKETS}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ticket dialog */}
      <Dialog open={!!openId} onClose={()=>setOpenId(null)} maxWidth="md" fullWidth>
        <DialogTitle>Ticket</DialogTitle>
        <DialogContent dividers>
          {ticket ? (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{ticket.subject}</Typography>
                <Chip size="small" label={ticket.status} />
              </Stack>
              <Typography variant="body2" sx={{ color: "#6b7280", mb: 1 }}>
                {ticket.email} • opened {formatDate(ticket.createdAt)}
              </Typography>

              {/* thread */}
              <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 1, p: 1.5, mb: 2, bgcolor: "#f9fafb" }}>
                {ticket.message && (
                  <Box sx={{ mb: 1.5 }}>
                    <Chip size="small" label="User" sx={{ mr: 1, bgcolor: "#FFF2E7", color: "#111" }} />
                    <Typography component="div" sx={{ whiteSpace: "pre-wrap" }}>{ticket.message}</Typography>
                  </Box>
                )}
                {(ticket.replies || []).map((r, idx)=>(
                  <Box key={idx} sx={{ mb: 1.25 }}>
                    <Chip
                      size="small"
                      label={r.from === "admin" ? "Admin" : "User"}
                      sx={{ mr: 1, bgcolor: r.from === "admin" ? ORANGE : "#EEF2FF", color: r.from === "admin" ? "#fff" : "#111" }}
                    />
                    <Typography component="div" sx={{ whiteSpace: "pre-wrap" }}>{r.message}</Typography>
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>
                      {formatDate(r.createdAt)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
              {msg && <Alert severity="success" sx={{ mb: 1 }}>{msg}</Alert>}

              <TextField
                label="Your reply"
                fullWidth
                multiline
                minRows={3}
                value={reply}
                onChange={(e)=>setReply(e.target.value)}
              />
            </Box>
          ) : (
            <Typography>Loading…</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenId(null)} startIcon={<CloseIcon />}>Close</Button>
          <Button onClick={()=>ticket && setTicketStatus(ticket.status === "closed" ? "open" : "closed")}>
            {ticket?.status === "closed" ? "Reopen" : "Close Ticket"}
          </Button>
          <Button
            variant="outlined"
            disabled={!reply.trim() || sending}
            onClick={()=>doReply(false)}
            startIcon={<MarkEmailReadIcon />}
          >
            Send Reply
          </Button>
          <Button
            variant="contained"
            disabled={!reply.trim() || sending}
            onClick={()=>doReply(true)}
            startIcon={<SendIcon />}
            sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#E7712F" } }}
          >
            Send & Close
          </Button>
          {/* ==== NEW LOGIC: Confirmed delete with visible label ====
             PRO: Makes destructive action explicit and reduces accidental clicks. */}
          <Button
            color="error"
            variant="outlined"
            onClick={onDeleteTicket}
            startIcon={<DeleteForeverIcon />}
          >
            Delete Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
