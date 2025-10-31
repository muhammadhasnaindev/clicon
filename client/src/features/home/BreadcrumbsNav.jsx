/**
 * BreadcrumbsNav
 * Summary: Simple breadcrumbs driven by `category` query param.

 */

import React from "react";
import { Breadcrumbs, Typography, Link, Box } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useLocation, useNavigate } from "react-router-dom";

const categoriesMap = {
  electronics: "Electronics Devices",
  "computer-laptop": "Computer & Laptop",
  "computer-accessories": "Computer Accessories",
  smartphone: "Smartphone",
  headphone: "Headphone",
  "mobile-accessories": "Mobile Accessories",
  "gaming-console": "Gaming Console",
  "camera-photo": "Camera & Photo",
  "tv-home": "TV & Home Appliances",
  "watches-accessories": "Watches & Accessories",
  "gps-navigation": "GPS & Navigation",
  "wearable-technology": "Wearable Technology",
};

/**
 * Render breadcrumbs for /shop?category=...
 */
export default function BreadcrumbsNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Tiny guard if search is empty; keeps behavior same.
  const searchParams = new URLSearchParams(location.search || "");
  const rawCategory = searchParams.get("category");
  const category = rawCategory ? decodeURIComponent(rawCategory) : null;

  const currentCategory = category ? categoriesMap[category] || category : "All Products";
  const go = (path) => navigate(path);

  return (
    <Box sx={{ backgroundColor: "#F5F6F9", py: 1.5, px: { xs: 2, md: 4 }, width: "100%" }}>
      <Breadcrumbs
        separator={<NavigateNextIcon sx={{ fontSize: 16, color: "#9EA3AE" }} />}
        aria-label="breadcrumb"
      >
        <Link
          onClick={() => go("/")}
          sx={{
            display: "flex",
            alignItems: "center",
            color: "#191C1F",
            fontSize: 14,
            textDecoration: "none",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <HomeOutlinedIcon sx={{ mr: 0.5, fontSize: 18 }} />
          Home
        </Link>

        <Link
          onClick={() => go("/shop")}
          sx={{
            color: "#191C1F",
            fontSize: 14,
            textDecoration: "none",
            fontWeight: 500,
            "&:hover": { textDecoration: "underline" },
            cursor: "pointer",
          }}
        >
          Shop
        </Link>

        <Typography sx={{ color: "#1B6392", fontSize: 14, fontWeight: 600 }}>
          {currentCategory}
        </Typography>
      </Breadcrumbs>
    </Box>
  );
}
