// src/pages/account/ComparePane.jsx
/**
 * ComparePane — thin wrapper around ComparePage with consistent page chrome.

 */
import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import Compare from "../ComparePage";

const ComparePane = () => (
  <Box aria-label="Product Compare">
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 1, mb: 2 }}>
      <Typography sx={{ fontWeight: 800 }}>Compare</Typography>
    </Paper>
    <Compare />
  </Box>
);

export default ComparePane;
