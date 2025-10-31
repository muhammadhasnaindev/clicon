// src/components/.../WishlistPopover.jsx
/**
 * Summary:
 * Wishlist mini-panel with mobile drawer fallback.

 */

import React from "react";
import { Popover, Box, Typography, Divider, Button, Grow, Drawer, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

export default function WishlistPopover({
  open,
  anchorEl,
  onClose,
  items = [],
  onViewWishlist,
  onRemoveItem,
  formatMoney,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const fmt = (v) =>
    typeof formatMoney === "function" ? formatMoney(v) : `$${Number(v || 0).toFixed(2)}`;

  const content = (
    <Box sx={{ width: { xs: "100vw", sm: 340 }, display: "flex", flexDirection: "column", height: { xs: "70vh", sm: 360 } }}>
      <Box sx={{ p: 2, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Wishlist ({items.length})
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close wishlist">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": { background: "#ddd", borderRadius: 6 },
        }}
      >
        {items.length ? (
          items.map((it) => (
            <Box
              key={it.id ?? it._id ?? it.slug ?? it.sku}
              sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}
            >
              {it.image ? (
                <img
                  src={it.image}
                  alt={it.title}
                  width={54}
                  height={54}
                  style={{ borderRadius: 6, border: "1px solid #eee", objectFit: "cover", flexShrink: 0 }}
                />
              ) : null}

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontSize={14} sx={{ lineHeight: 1.2 }} noWrap title={it.title}>
                  {it.title}
                </Typography>
                {it.price != null && (
                  <Typography fontSize={13} color="primary">
                    {fmt(it.price)}
                  </Typography>
                )}
              </Box>

              <Typography
                role="button"
                aria-label={`remove ${it.title}`}
                onClick={() => onRemoveItem?.(it.id ?? it._id ?? it.slug ?? it.sku)}
                sx={{ cursor: "pointer", color: "error.main", fontWeight: 700 }}
                title="Remove"
              >
                x
              </Typography>
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No items in wishlist
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 1 }} />
      <Box sx={{ p: 2 }}>
        <Button variant="contained" fullWidth onClick={onViewWishlist} disabled={!items.length} sx={{ height: 44, fontWeight: 700 }}>
          VIEW WISHLIST
        </Button>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { borderTopLeftRadius: 12, borderTopRightRadius: 12 } }}>
        {content}
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      TransitionComponent={Grow}
    >
      {content}
    </Popover>
  );
}
