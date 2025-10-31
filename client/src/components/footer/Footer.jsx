// src/components/layout/Footer.jsx
/**
 * Summary:
 * Marketing footer with quick links, app badges, and tags.

 */

import React from "react";
import {
  Box,
  Typography,
  Link as MLink,
  Grid,
  Button,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import GoogleIcon from "@mui/icons-material/Google";
import AppleIcon from "@mui/icons-material/Apple";
import { Link as RouterLink } from "react-router-dom";

const BG = "#191C1F";
const BG_DARK = "#111418";
const LINE = "#2A3034";
const FG = "#F5F7F9";
const MUTED = "#929FA5";
const ORANGE = "#FA8232";
const ACCENT = "#FFC94D";
const CARD = "#303639";

const RowLink = ({ to, children, active = false }) => (
  <MLink
    component={RouterLink}
    to={to}
    underline="none"
    sx={{
      display: "flex",
      alignItems: "center",
      color: active ? FG : MUTED,
      fontSize: 13,
      lineHeight: "24px",
      fontWeight: active ? 700 : 500,
      "&:hover": { color: FG },
    }}
  >
    {active && (
      <Box
        sx={{ width: 12, height: 2, bgcolor: ACCENT, borderRadius: 999, mr: 1 }}
      />
    )}
    {children}
  </MLink>
);

export default function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: BG }}>
      <Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 0 }, py: { xs: 4, md: 6 } }}>
        <Grid container spacing={{ xs: 3, md: 6 }}>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: ORANGE,
                  mr: 1.25,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "3px solid #fff",
                  }}
                />
              </Box>
              <Typography sx={{ color: FG, fontWeight: 800, fontSize: 20 }}>
                CLICON
              </Typography>
            </Box>

            <Typography sx={{ color: MUTED, fontSize: 12, mb: 0.5 }}>
              Customer Supports:
            </Typography>
            <Typography
              sx={{ color: FG, fontWeight: 800, fontSize: 16, mb: 1 }}
            >
              (629) 555-0129
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: 13, mb: 1.25 }}>
              4517 Washington Ave.
              <br />
              Manchester, Kentucky 39495
            </Typography>
            <MLink
              href="mailto:info@kinbo.com"
              underline="none"
              sx={{ color: FG, fontSize: 13, fontWeight: 700 }}
            >
              info@kinbo.com
            </MLink>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography
              sx={{
                color: FG,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 0.8,
                mb: 1.25,
              }}
            >
              TOP CATEGORY
            </Typography>
            <RowLink to="/shop?category=Computer%20%26%20Laptop">
              Computer & Laptop
            </RowLink>
            <RowLink to="/shop?category=SmartPhone">SmartPhone</RowLink>
            <RowLink to="/shop?category=Computer%20Accessories&subcategory=Headphone">
              Headphone
            </RowLink>
            <RowLink to="/shop?category=Computer%20Accessories" active>
              Accessories
            </RowLink>
            <RowLink to="/shop?category=Camera%20%26%20Photo">
              Camera & Photo
            </RowLink>
            <RowLink to="/shop?category=TV">TV & Homes</RowLink>
            <MLink
              component={RouterLink}
              to="/shop"
              underline="none"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                mt: 1,
                color: ACCENT,
                fontSize: 13,
                fontWeight: 800,
                "& svg": {
                  ml: 0.75,
                  fontSize: 16,
                  transition: "transform .15s ease",
                },
                "&:hover svg": { transform: "translateX(2px)" },
              }}
            >
              Browse All Product <ArrowForwardIcon />
            </MLink>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography
              sx={{
                color: FG,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 0.8,
                mb: 1.25,
              }}
            >
              QUICK LINKS
            </Typography>
            <RowLink to="/shop">Shop Product</RowLink>
            <RowLink to="/shopping-cart">Shopping Cart</RowLink>
            <RowLink to="/wishlist">Wishlist</RowLink>
            <RowLink to="/compare">Compare</RowLink>
            <RowLink to="/track-order">Track Order</RowLink>
            <RowLink to="/help-center">Customer Help</RowLink>
            <RowLink to="/about-us">About Us</RowLink>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography
              sx={{
                color: FG,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 0.8,
                mb: 1.25,
              }}
            >
              DOWNLOAD APP
            </Typography>

            <Button
              fullWidth
              variant="contained"
              startIcon={<GoogleIcon />}
              sx={{
                mb: 1,
                height: 56,
                textTransform: "none",
                justifyContent: "flex-start",
                bgcolor: CARD,
                color: FG,
                borderRadius: 1,
                px: 1.25,
                "&:hover": { bgcolor: "#383E44" },
              }}
            >
              <Stack spacing={0} alignItems="flex-start">
                <Typography sx={{ fontSize: 10, opacity: 0.9 }}>
                  Get it now
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1 }}>
                  Google Play
                </Typography>
              </Stack>
            </Button>

            <Button
              fullWidth
              variant="contained"
              startIcon={<AppleIcon />}
              sx={{
                height: 56,
                textTransform: "none",
                justifyContent: "flex-start",
                bgcolor: CARD,
                color: FG,
                borderRadius: 1,
                px: 1.25,
                "&:hover": { bgcolor: "#383E44" },
              }}
            >
              <Stack spacing={0} alignItems="flex-start">
                <Typography sx={{ fontSize: 10, opacity: 0.9 }}>
                  Get it now
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1 }}>
                  App Store
                </Typography>
              </Stack>
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography
              sx={{
                color: FG,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 0.8,
                mb: 1.25,
              }}
            >
              POPULAR TAG
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {[
                "Game",
                "iPhone",
                "TV",
                "Asus Laptops",
                "Macbook",
                "SSD",
                "Graphics Card",
                "Power Bank",
                "Smart TV",
                "Speaker",
                "Tablet",
                "Microwave",
                "Samsung",
              ].map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  variant="outlined"
                  sx={{
                    borderColor: LINE,
                    color: FG,
                    height: 28,
                    borderRadius: 1,
                    "& .MuiChip-label": { px: 1, fontSize: 12, fontWeight: 600 },
                    "&:hover": { bgcolor: CARD, borderColor: CARD },
                  }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ mt: { xs: 4, md: 5 }, borderColor: LINE }} />
      </Box>

      <Box sx={{ bgcolor: BG_DARK, borderTop: `1px solid ${LINE}` }}>
        <Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 0 }, py: 2.25 }}>
          <Typography sx={{ textAlign: "center", color: MUTED, fontSize: 12 }}>
            Kinbo - eCommerce Template © 2021. Design by Templatecookie
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
