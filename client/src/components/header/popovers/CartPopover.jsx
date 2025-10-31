// src/components/.../CartPopover.jsx
/**
 * Summary:
 * Cart mini-panel with mobile drawer fallback and simple totals.
 
 */

import React from "react";
import { Popover, Box, Typography, Divider, Button, Grow, Drawer, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

export default function CartPopover({
  open,
  anchorEl,
  onClose,
  items = [],
  subtotal = 0,
  onRemoveItem,
  onViewProduct,
  onCheckout,
  onViewCart,
  formatMoney = (v) => v,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const content = (
    <Box sx={{ width: { xs: "100vw", sm: 340 }, display: "flex", flexDirection: "column", height: { xs: "70vh", sm: 420 } }}>
      <Box sx={{ p: 2, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Shopping Cart ({items.length})
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close cart">
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
          items.map((it) => {
            const id = it.id || it._id || it.sku || it.slug;
            const title = it.title || it.name;
            const image = it.image || it.img || it.images?.[0];
            const unit = formatMoney(it.price || 0);
            return (
              <Box key={id} sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}>
                {image ? (
                  <img
                    src={image}
                    alt={title}
                    width={54}
                    height={54}
                    style={{ borderRadius: 6, border: "1px solid #eee", objectFit: "cover" }}
                    onClick={() => onViewProduct?.(it)}
                  />
                ) : null}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontSize={14} sx={{ lineHeight: 1.2, mb: 0.5 }} noWrap title={title}>
                    {title}
                  </Typography>
                  <Typography fontSize={13} color="primary.main">
                    {it.qty} x {unit}
                  </Typography>
                </Box>
                <Typography
                  role="button"
                  onClick={() => onRemoveItem?.(id)}
                  sx={{ cursor: "pointer", color: "error.main", fontWeight: 700 }}
                  aria-label={`remove ${title}`}
                  title="Remove"
                >
                  x
                </Typography>
              </Box>
            );
          })
        ) : (
          <Typography variant="body2" color="text.secondary">
            No items in cart
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 1 }} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography fontWeight={700}>Sub-Total:</Typography>
          <Typography fontWeight={700}>{formatMoney(subtotal)}</Typography>
        </Box>
        <Button variant="contained" fullWidth sx={{ mb: 1, height: 44, fontWeight: 700 }} onClick={onCheckout}>
          CHECKOUT NOW
        </Button>
        <Button variant="outlined" fullWidth sx={{ height: 44, fontWeight: 700 }} onClick={onViewCart}>
          VIEW CART
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
