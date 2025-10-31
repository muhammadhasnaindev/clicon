// src/components/billing/EditCardDialog.jsx
/**
 * Summary:
 * Edit-card dialog; keeps fields minimal, adds light validation.
 */

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Alert,
} from "@mui/material";
import { useUpdatePaymentMethodMutation } from "../../store/api/apiSlice";

const asInt = (v) => Number.parseInt(String(v), 10);

export default function EditCardDialog({ open, value, onClose }) {
  const [form, setForm] = useState({ id: "", name: "", expMonth: "", expYear: "" });
  const [err, setErr] = useState("");
  const [updateCard, { isLoading }] = useUpdatePaymentMethodMutation();

  useEffect(() => {
    if (!value) return;
    setForm({
      id: value.id || value._id || "",
      name: value.name || "",
      expMonth: value.expMonth || "",
      expYear: value.expYear || "",
    });
  }, [value]);

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setErr("");
    if (!form.id) return setErr("Missing payment method id.");

    const m = asInt(form.expMonth);
    const y = asInt(form.expYear);
    const thisYear = new Date().getFullYear();
    if (Number.isNaN(m) || m < 1 || m > 12) return setErr("Month must be 1–12.");
    if (Number.isNaN(y) || y < thisYear || y > thisYear + 15)
      return setErr(`Year must be between ${thisYear} and ${thisYear + 15}.`);

    try {
      await updateCard({
        id: form.id,
        name: form.name,
        expMonth: m,
        expYear: y,
      }).unwrap();
      onClose?.(true);
    } catch (e) {
      setErr(e?.data?.message || e?.error || "Failed to update card.");
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose?.(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Card</DialogTitle>
      <DialogContent dividers>
        {err && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {err}
          </Alert>
        )}
        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <TextField
              label="Name on Card"
              fullWidth
              size="small"
              value={form.name}
              onChange={set("name")}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Exp. Month"
              placeholder="MM"
              fullWidth
              size="small"
              value={form.expMonth}
              onChange={set("expMonth")}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Exp. Year"
              placeholder="YYYY"
              fullWidth
              size="small"
              value={form.expYear}
              onChange={set("expYear")}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose?.(false)}>Cancel</Button>
        <Button onClick={save} disabled={isLoading} variant="contained">
          {isLoading ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
