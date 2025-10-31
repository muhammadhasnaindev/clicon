// src/pages/account/DashboardLayout.jsx
/**
 * DashboardLayout
 * - Left nav with active highlighting + secure logout.
 * - ===== NEW LOGIC: logout hardening (best-effort clear), subtle a11y trail, keyboard-friendly NavLink =====
 */

import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Box, Grid, Paper, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import { useDispatch } from "react-redux";
import { logout as logoutSlice } from "../../store/slices/authSlice";
import { useLogoutMutation } from "../../store/api/apiSlice";

const nav = [
  { to: ".", text: "Dashboard", icon: <DashboardIcon />, nested: true, end: true },
  { to: "orders", text: "Order History", icon: <ReceiptLongIcon />, nested: true },
  { to: "track", text: "Track Order", icon: <LocalShippingIcon />, nested: true },
  { to: "cart", text: "Shopping Cart", icon: <ShoppingCartIcon />, nested: true },
  { to: "wishlist", text: "Wishlist", icon: <FavoriteBorderIcon />, nested: true },
  { to: "compare", text: "Compare", icon: <CompareArrowsIcon />, nested: true },
  { to: "cards-address", text: "Cards & Address", icon: <CreditCardIcon />, nested: true },
  { to: "browsing", text: "Browsing History", icon: <HistoryIcon />, nested: true },
  { to: "settings", text: "Setting", icon: <SettingsIcon />, nested: true },
];

const ORANGE = "#FA8232";

const DashboardLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logoutApi] = useLogoutMutation();

  const doLogout = async () => {
    // ===== NEW LOGIC: best-effort server + client clearing =====
    try { await logoutApi().unwrap(); } catch {}
    try { dispatch(logoutSlice()); } catch {}
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    navigate("/auth", { replace: true });
  };

  return (
    <Box sx={{ bgcolor: "#f8fafc", py: { xs: 2, md: 4 } }}>
      {/* ===== NEW LOGIC: subtle breadcrumb for orientation ===== */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, mb: 1.5 }} aria-label="Breadcrumb">
        <Typography sx={{ color: "#6b7280", fontSize: 13 }}>
          Home <ArrowRightAltIcon sx={{ fontSize: 16, mx: 0.5, verticalAlign: "middle" }} />
          User Account <ArrowRightAltIcon sx={{ fontSize: 16, mx: 0.5, verticalAlign: "middle" }} />
          <b>Dashboard</b>
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 } }} alignItems="flex-start">
        <Grid item xs={12} md={3} lg={3}>
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <List disablePadding aria-label="Account navigation">
              {nav.map((n) => (
                <ListItemButton
                  key={n.text}
                  component={NavLink}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => (isActive ? "active" : "")}
                  sx={{
                    py: 1.25,
                    borderRadius: 0,
                    "&:hover": { bgcolor: "rgba(250,130,50,.08)" },
                    "& .MuiListItemIcon-root": { color: "#6b7280", minWidth: 36 },
                    "& .MuiListItemText-primary": { fontSize: 14, color: "#374151", fontWeight: 600 },
                    /* ACTIVE = full orange with white text & icons (Figma) */
                    "&.active": { bgcolor: ORANGE },
                    "&.active .MuiListItemIcon-root": { color: "#fff" },
                    "&.active .MuiListItemText-primary": { color: "#fff", fontWeight: 800 },
                  }}
                >
                  <ListItemIcon>{n.icon}</ListItemIcon>
                  <ListItemText primary={n.text} />
                </ListItemButton>
              ))}
              <Divider />
              <ListItemButton
                onClick={doLogout}
                sx={{ py: 1.25, "&:hover": { bgcolor: "rgba(239,68,68,.06)" } }}
                aria-label="Log out"
              >
                <ListItemIcon sx={{ color: "#ef4444", minWidth: 36 }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Log-out"
                  primaryTypographyProps={{ sx: { fontSize: 14, color: "#b91c1c", fontWeight: 600 } }}
                />
              </ListItemButton>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={9} lg={9}>
          <Outlet />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardLayout;
