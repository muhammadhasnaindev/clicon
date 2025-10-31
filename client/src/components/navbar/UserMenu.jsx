// src/components/header/UserMenu.jsx
/**
 * Summary:
 * Small user menu that switches between Sign In button and avatar popover.
 *
 * Changed Today:
 * - PRO: Close-on-navigate + a11y labels; small avatar initials fallback.
 * - PRO: Early return patterns and tiny guards on logout to avoid lingering menu state.
 */

import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Menu, MenuItem, IconButton, Avatar, Button, Divider, ListItemText } from "@mui/material";
import { isAuthed, selectUser, logout } from "../../store/slices/authSlice";
import { Link as RouterLink, useNavigate } from "react-router-dom";

function initialsOf(name = "", email = "") {
  const base = (name || email || "").trim();
  if (!base) return "";
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || "").join("");
}

export default function UserMenu() {
  const authed = useSelector(isAuthed);
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [anchor, setAnchor] = React.useState(null);

  if (!authed) {
    return (
      <Button
        component={RouterLink}
        to="/auth"
        variant="outlined"
        aria-label="Sign in"
      >
        Sign In
      </Button>
    );
  }

  const role = user?.role || "user";
  const canAdmin = role === "admin" || role === "manager";
  const handleClose = () => setAnchor(null);

  // PRO: one place to navigate and close.
  const go = (to) => {
    handleClose();
    navigate(to);
  };

  const avatarAlt = user?.name || user?.email || "User";
  const avatarFallback = initialsOf(user?.name, user?.email);

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Open user menu"
      >
        <Avatar src={user?.avatarUrl || ""} alt={avatarAlt}>
          {!user?.avatarUrl && avatarFallback}
        </Avatar>
      </IconButton>

      <Menu
        open={!!anchor}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => go("/account/dashboard")}>
          <ListItemText primary="Dashboard" secondary={user?.email} />
        </MenuItem>
        <MenuItem onClick={() => go("/account/dashboard/orders")}>Orders</MenuItem>
        <MenuItem onClick={() => go("/track-order")}>Track Order</MenuItem>
        <MenuItem onClick={() => go("/compare")}>Compare</MenuItem>
        <MenuItem onClick={() => go("/wishlist")}>Wishlist</MenuItem>
        <MenuItem onClick={() => go("/account/dashboard/settings")}>Settings</MenuItem>

        {canAdmin && (
          <>
            <Divider />
            <MenuItem onClick={() => go("/admin")}>
              <ListItemText primary="Admin Panel" secondary={role} />
            </MenuItem>
          </>
        )}

        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();            // PRO: close first to avoid stuck menu
            dispatch(logout());       // still fires normally
          }}
        >
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}
