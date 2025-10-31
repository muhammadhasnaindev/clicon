// src/components/billing/AddCardDialog.jsx
/**
 * Summary:
 * Add-card dialog with light validation and friendly errors.
 */

import React, { useState } from "react";
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
import { useAddPaymentMethodMutation } from "../../store/api/apiSlice";

/* Logic: card brand inference
   Why: send brand + last4; never send full PAN */
const brandFromNumber = (n = "") => {
  const s = String(n).replace(/\s|-/g, "");
  if (/^4\d{6,}$/.test(s)) return "visa";
  if (/^(5[1-5]|2[2-7])\d{4,}$/.test(s)) return "mastercard";
  if (/^3[47]\d{5,}$/.test(s)) return "amex";
  return "card";
};

const digitsOnly = (s = "") => String(s).replace(/\D+/g, "");
const asInt = (v) => Number.parseInt(String(v), 10);

export default function AddCardDialog({ open, onClose }) {
  const [form, setForm] = useState({
    name: "",
    number: "",
    expMonth: "",
    expYear: "",
  });
  const [err, setErr] = useState("");
  const [addCard, { isLoading }] = useAddPaymentMethodMutation();

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setErr("");

    const digits = digitsOnly(form.number);
    if (!form.name.trim()) return setErr("Name on card is required.");
    if (digits.length < 4) return setErr("Enter at least last 4 digits.");
    if (!form.expMonth || !form.expYear)
      return setErr("Expiry month and year are required.");

    // Light-range checks (user-safe errors)
    const m = asInt(form.expMonth);
    const y = asInt(form.expYear);
    const now = new Date();
    const thisYear = now.getFullYear();
    if (Number.isNaN(m) || m < 1 || m > 12) return setErr("Month must be 1-12.");
    if (Number.isNaN(y) || y < thisYear || y > thisYear + 15)
      return setErr(`Year must be between ${thisYear} and ${thisYear + 15}.`);

    try {
      await addCard({
        brand: brandFromNumber(digits),
        last4: digits.slice(-4),
        name: form.name.trim(),
        expMonth: m,
        expYear: y,
      }).unwrap();
      onClose?.(true);
    } catch (e) {
      setErr(e?.data?.message || e?.error || "Failed to add card.");
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose?.(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Add Card</DialogTitle>
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
          <Grid item xs={12}>
            <TextField
              label="Card Number"
              fullWidth
              size="small"
              value={form.number}
              onChange={set("number")}
              inputProps={{ inputMode: "numeric" }}
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
