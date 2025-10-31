// src/pages/account/TrackPane.jsx
import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import TrackOrder from "../TrackOrder";

const TrackPane = () => (
  <Box>
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 1, mb: 2 }}>
      <Typography sx={{ fontWeight: 800 }}>Track Order</Typography>
    </Paper>
    <TrackOrder />
  </Box>
);

export default TrackPane;
