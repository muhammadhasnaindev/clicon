// src/components/auth/LoginDialog.jsx
/**
 * Summary:
 * Small wrapper dialog rendering the LoginForm, responsive on mobile.

 */

import React from "react";
import { Dialog, DialogContent, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import LoginForm from "./LoginForm";

export default function LoginDialog({ open, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 2,
        },
      }}
    >
      <DialogContent sx={{ width: "100%", p: { xs: 2, sm: 3 } }}>
        <LoginForm onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}
