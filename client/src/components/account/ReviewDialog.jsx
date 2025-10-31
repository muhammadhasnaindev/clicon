// src/components/reviews/ReviewDialog.jsx
/**
 * Summary:
 * Multi-item review dialog; submits ratings/comments for each product.

 */

import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  Typography, TextField, Rating, Avatar, Box, Alert,
} from "@mui/material";
import { useSubmitReviewMutation } from "../../store/api/apiSlice";

export default function ReviewDialog({ open, onClose, orderId, items = [], onSubmitted }) {
  const sanitize = (arr = []) =>
    arr
      .map((it) => ({
        // IMPORTANT: only use actual product ids (prefer populated product._id)
        productId: it.productId || it.product?._id || "", // never fallback to it._id (order line id)
        title: it.title,
        image: it.image || (Array.isArray(it.images) ? it.images[0] : ""),
        rating: 5,
        comment: "",
      }))
      .filter((x) => !!x.productId);

  const [form, setForm] = React.useState(() => sanitize(items));

  React.useEffect(() => {
    if (open) setForm(sanitize(items));
  }, [open, items]);

  const [err, setErr] = React.useState("");
  const [submitReview, { isLoading }] = useSubmitReviewMutation();

  const handleChange = (idx, key, val) => {
    setForm((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  };

  const handleSubmit = async () => {
    setErr("");
    try {
      const payload = {
        orderId,
        items: form
          .filter((f) => f.productId)
          .map((f) => ({
            productId: f.productId,
            rating: Number(f.rating || 5),
            comment: f.comment || "",
          })),
      };
      await submitReview(payload).unwrap();

      onSubmitted?.(payload.items); // so parent can optimistic-merge
      onClose?.();
    } catch (e) {
      setErr(e?.data?.message || e?.error || "Failed to submit reviews.");
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Leave a Rating</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
        <Stack spacing={2}>
          {form.map((f, idx) => (
            <Stack key={`${f.productId}-${idx}`} direction="row" spacing={1.5} alignItems="flex-start">
              <Avatar variant="rounded" src={f.image} sx={{ width: 48, height: 48 }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{f.title}</Typography>
                <Rating
                  value={Number(f.rating || 5)}
                  onChange={(_, v) => handleChange(idx, "rating", v || 5)}
                  precision={1}
                />
                <TextField
                  value={f.comment}
                  onChange={(e) => handleChange(idx, "comment", e.target.value)}
                  placeholder="Write a short comment…"
                  multiline
                  minRows={2}
                  fullWidth
                  sx={{ mt: 1 }}
                />
              </Box>
            </Stack>
          ))}
          {!form.length && <Typography>No products to review.</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Close</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!form.length || isLoading}>
          {isLoading ? "Submitting…" : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
