// src/components/reviews/LeaveRatingDialog.jsx
/**
 * Summary:
 * Single-product rating dialog with friendly error handling.

 */

import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, Box, Typography, Alert,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import { useSubmitReviewMutation } from "../../store/api/apiSlice";

const LeaveRatingDialog = ({ open, onClose, orderId, productId }) => {
  const [rating, setRating] = React.useState(5);
  const [text, setText] = React.useState("");
  const [err, setErr] = React.useState("");
  const [submitReview, { isLoading }] = useSubmitReviewMutation();

  // Send `comment` (not `text`) to align with backend schema.
  const onSubmit = async () => {
    setErr("");
    try {
      await submitReview({ orderId, productId, rating, comment: text }).unwrap();
      onClose?.();
    } catch (e) {
      setErr(e?.data?.message || e?.error || "Failed to publish review.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Leave a Rating</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}

        <TextField
          select label="Rating" fullWidth size="small" sx={{ mt: 1.5 }}
          value={rating} onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5,4,3,2,1].map((r) => (
            <MenuItem key={r} value={r}>
              <Box sx={{ display:"inline-flex", alignItems:"center", gap:0.5 }}>
                {Array.from({ length: r }).map((_, i) => (
                  <StarIcon key={i} sx={{ fontSize: 18, color: "#f59e0b" }} />
                ))}
                <Typography sx={{ ml: 1 }}>{r} Star Rating</Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Feedback"
          placeholder="Write down your feedback about our product & services"
          multiline minRows={4} fullWidth sx={{ mt: 2 }}
          value={text} onChange={(e) => setText(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} variant="text">Cancel</Button>
        <Button
          onClick={onSubmit} variant="contained" disabled={isLoading}
          sx={{ bgcolor: "#ef6c00", "&:hover": { bgcolor: "#d76100" } }}
        >
          {isLoading ? "Publishing…" : "Publish Review"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveRatingDialog;
