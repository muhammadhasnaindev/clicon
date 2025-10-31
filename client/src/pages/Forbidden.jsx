
import React from "react";
import { Box, Paper, Typography } from "@mui/material";

/**
 * Forbidden
 * Displays a 403 "Not authorized" message.
 */
export default function Forbidden() {
  return (
    <Box sx={{ minHeight: "40vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>403 — Not authorized</Typography>
        <Typography sx={{ color: "text.secondary" }}>
          You don't have permission to view this section. If you think this is a mistake, contact an administrator.
        </Typography>
      </Paper>
    </Box>
  );
}
