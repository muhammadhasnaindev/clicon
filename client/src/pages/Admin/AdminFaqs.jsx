// src/pages/account/AdminFaqs.jsx
/**
 * AdminFaqs
 * Summary: Create/edit/delete simple FAQ entries.
 
 */

import React, { useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Switch, FormControlLabel,
  Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Stack, Snackbar, Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import {
  useAdminFaqListQuery,
  useAdminFaqCreateMutation,
  useAdminFaqUpdateMutation,
  useAdminFaqDeleteMutation
} from "../../store/api/helpApi";

/** ======================= NEW/REVISED LOGIC =======================
 * PRO: Small helpers keep onSave lean and human-readable.
 */
const clean = (f) => ({
  question: String(f.question || "").trim(),
  answer: String(f.answer || "").trim(),
  order: Number.isFinite(Number(f.order)) ? Number(f.order) : 0,
  published: !!f.published,
});

export default function AdminFaqs() {
  const { data, refetch, isFetching } = useAdminFaqListQuery();
  const rowsRaw = data?.data || [];

  /** ======================= NEW/REVISED LOGIC =======================
   * PRO: Stable order for a friendlier admin UX.
   */
  const rows = useMemo(
    () => [...rowsRaw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.question).localeCompare(String(b.question))),
    [rowsRaw]
  );

  const [createFaq, { isLoading: creating }] = useAdminFaqCreateMutation();
  const [updateFaq, { isLoading: updating }] = useAdminFaqUpdateMutation();
  const [deleteFaq, { isLoading: deleting }] = useAdminFaqDeleteMutation();

  const [dlgOpen, setDlgOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ question: "", answer: "", order: 0, published: true });

  const [toast, setToast] = useState({ type: "success", msg: "" });

  const openNew = () => { setEdit(null); setForm({ question:"", answer:"", order:0, published:true }); setDlgOpen(true); };
  const openEdit = (row) => { setEdit(row); setForm({ question: row.question ?? "", answer: row.answer ?? "", order: row.order ?? 0, published: !!row.published }); setDlgOpen(true); };

  /** ======================= NEW/REVISED LOGIC =======================
   * PRO: Validate + show helpful messages; disable Save during mutation.
   */
  const onSave = async () => {
    const payload = clean(form);
    if (!payload.question || !payload.answer) {
      setToast({ type: "error", msg: "Please provide both a question and an answer." });
      return;
    }
    try {
      if (edit) {
        await updateFaq({ id: edit._id, ...payload }).unwrap();
        setToast({ type: "success", msg: "FAQ updated." });
      } else {
        await createFaq(payload).unwrap();
        setToast({ type: "success", msg: "FAQ created." });
      }
      setDlgOpen(false);
      refetch();
    } catch (e) {
      setToast({ type: "error", msg: e?.data?.message || e?.message || "Save failed." });
    }
  };

  const onDelete = async (row) => {
    if (!row?._id) return;
    // soft confirm (native is fine here)
    // eslint-disable-next-line no-alert
    if (!confirm(`Delete FAQ: "${row.question}"?`)) return;
    try {
      await deleteFaq(row._id).unwrap();
      setToast({ type: "success", msg: "FAQ deleted." });
      refetch();
    } catch (e) {
      setToast({ type: "error", msg: e?.data?.message || e?.message || "Delete failed." });
    }
  };

  const busy = creating || updating || deleting;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">FAQs</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openNew} disabled={busy}>Add FAQ</Button>
      </Stack>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Question</TableCell>
                <TableCell>Published</TableCell>
                <TableCell width={140}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r)=>(
                <TableRow key={r._id} hover>
                  <TableCell>{r.order}</TableCell>
                  <TableCell>{r.question}</TableCell>
                  <TableCell>{r.published ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <IconButton aria-label="edit faq" onClick={()=>openEdit(r)} size="small" disabled={busy}><EditIcon/></IconButton>
                    <IconButton aria-label="delete faq" color="error" size="small" disabled={busy} onClick={()=>onDelete(r)}>
                      <DeleteForeverIcon/>
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!isFetching && rows.length === 0 && (
                <TableRow><TableCell colSpan={4}>No FAQs.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{edit ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Question"
            fullWidth
            sx={{ mb: 2 }}
            value={form.question}
            onChange={(e)=>setForm((f)=>({ ...f, question: e.target.value }))}
          />
          <TextField
            label="Answer"
            fullWidth
            multiline
            minRows={4}
            sx={{ mb: 2 }}
            value={form.answer}
            onChange={(e)=>setForm((f)=>({ ...f, answer: e.target.value }))}
          />
          <TextField
            label="Order"
            type="number"
            sx={{ mb: 2, maxWidth: 160 }}
            value={form.order}
            onChange={(e)=>setForm((f)=>({ ...f, order: Number(e.target.value ?? 0) }))}
            inputProps={{ step: 1, min: 0 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!form.published}
                onChange={(e)=>setForm((f)=>({ ...f, published: e.target.checked }))}
              />
            }
            label="Published"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDlgOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast.msg}
        autoHideDuration={1800}
        onClose={()=>setToast({ type:"success", msg:"" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.type} variant="filled" onClose={()=>setToast({ type:"success", msg:"" })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
