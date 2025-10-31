import React, { useState } from "react";
import { Box, Button, Menu, MenuItem } from "@mui/material";
import { useNavigate } from "react-router-dom";

const routeList = [
  { name: "Home", path: "/" },
  { name: "Product Listing", path: "/shop" },
  { name: "Product Detail", path: "/ProductDetail" },
   { name: "Compare", path: "/compare" },
  { name: "Track Order", path: "/track-order" },
  { name: "Order Tracking", path: "/order-tracking" },
  { name: "Product Compare", path: "/product-compare" },
  { name: "Wishlist Table", path: "/wishlist-table" },
  { name: "Shopping Cart", path: "/shopping-cart" },
  { name: "Checkout", path: "/checkout" },
  { name: "Sign In", path: "/sign-in" },
  { name: "Forget Password", path: "/forget-password" },
  { name: "Reset Password", path: "/reset-password" },
  { name: "Sign Up", path: "/sign-up" },
  { name: "Email Verification", path: "/email-verification" },
  { name: "FAQ", path: "/faq" },
  { name: "Help Center", path: "/help-center" },
  { name: "Blog", path: "/blog" },
  { name: "Blog Detail", path: "/blog-detail" },
  { name: "Blog Grid", path: "/blog-grid" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Order History", path: "/order-history" },
  { name: "Order Details", path: "/order-details" },
  { name: "Cards Address", path: "/cards-address" },
  { name: "Account Settings", path: "/account-settings" },
  { name: "Shopping Cart Card", path: "/shoping-cart-card" }
];

export default function TempRoutesButton() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  return (
    <Box>
      <Button variant="outlined" onClick={(e)=>setAnchorEl(e.currentTarget)} sx={{ textTransform: "none", fontWeight: 600 }}>
        Show All Routes
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={()=>setAnchorEl(null)}>
        {routeList.map((route, idx) => (
          <MenuItem key={idx} onClick={() => { navigate(route.path); setAnchorEl(null); }}>
            {route.name}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
