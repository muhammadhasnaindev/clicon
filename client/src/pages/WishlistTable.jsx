/**
 * WishlistTable
 * Short: Basic wishlist table with price, stock, and quick actions.

 */

import React from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  Avatar,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CloseIcon from "@mui/icons-material/Close";

/* tokens */
const GREEN = "#4CAF50";
const RED   = "#F44336";
const ORANGE = "#FF7A00";
const DISABLED = "#B0BEC5";
const BORDER_RADIUS = 4;

/** format dollars quickly; guard non-numbers */
const fmtUSD = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "-";
};

/**
 * WishlistTable
 * @param {{ wishlist?: Array<{ id: string|number, image?: string, name?: string, title?: string, price?: number, originalPrice?: number, stock?: string }> }} props
 * Renders a simple wishlist table. Caller handles actions (add to cart/remove) externally.
 */
export default function WishlistTable({ wishlist = [] }) {
  // === [NEW LOGIC - 2025-10-25]: small guards & fallbacks
  // PRO: Prevent broken images/text. Keeps UI stable when upstream data is partial.
  const isInStock = (s) => String(s || "").toUpperCase() === "IN STOCK";

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Wishlist
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>PRODUCTS</TableCell>
            <TableCell>PRICE</TableCell>
            <TableCell>STOCK STATUS</TableCell>
            <TableCell>ACTIONS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.isArray(wishlist) && wishlist.map((item) => {
            const name = item.name || item.title || "Untitled";
            const inStock = isInStock(item.stock);
            const imgSrc = item.image || "/uploads/placeholder.png";

            return (
              <TableRow key={item.id}>
                {/* Product */}
                <TableCell sx={{ display: "flex", alignItems: "center" }}>
                  <Avatar
                    variant="square"
                    src={imgSrc}
                    onError={(e) => { e.currentTarget.src = "/uploads/placeholder.png"; }}
                    sx={{
                      width: 50,
                      height: 50,
                      mr: 2,
                      borderRadius: `${BORDER_RADIUS}px`,
                    }}
                  />
                  <Typography variant="body2" sx={{ maxWidth: 300 }} title={name}>
                    {name}
                  </Typography>
                </TableCell>

                {/* Price */}
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    {/* === [NEW LOGIC - 2025-10-25]: guard originalPrice before formatting
                        PRO: Avoids calling toFixed on undefined; shows dash when absent. */}
                    {item.originalPrice != null && item.originalPrice !== undefined && (
                      <Typography
                        sx={{
                          textDecoration: "line-through",
                          color: "text.secondary",
                        }}
                      >
                        {fmtUSD(item.originalPrice)}
                      </Typography>
                    )}
                    <Typography fontWeight={600}>
                      {fmtUSD(item.price)}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Stock */}
                <TableCell
                  sx={{
                    color: inStock ? GREEN : RED,
                    fontWeight: 600,
                  }}
                >
                  {item.stock || (inStock ? "IN STOCK" : "OUT OF STOCK")}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button
                      variant="contained"
                      color={inStock ? "warning" : "inherit"}
                      disabled={!inStock}
                      startIcon={<ShoppingCartIcon />}
                      sx={{
                        backgroundColor: inStock ? ORANGE : DISABLED,
                        color: "#fff",
                        "&:hover": {
                          backgroundColor: inStock ? ORANGE : DISABLED,
                        },
                      }}
                    >
                      ADD TO CART
                    </Button>
                    <IconButton color="error" aria-label="Remove from wishlist">
                      <CloseIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
