/**
 * IntroDoubleBanner
 * Summary: Two side-by-side hero banners with CTA and optional price badge.
 
 */

import React from "react";
import { Box, Grid, Typography, Button, Chip } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";
import { assetUrl } from "../../utils/asset";

const ORANGE = "#FA8232";
const BLUE = "#2DA5F3";
const DARK = "#191C1F";

export default function IntroDoubleBanner({
  left = {
    tag: "INTRODUCING",
    title: "New Apple Homepod Mini",
    copy: "Jam-packed with innovation,\nHomePod mini delivers unexpectedly.",
    ctaText: "SHOP NOW",
    href: "/shop?category=Audio",
    img: "/uploads/homepod_mini.png",
    bg: "#F2F4F5",
  },
  right = {
    tag: "INTRODUCING NEW",
    title: "Xiaomi Mi 11 Ultra\n12GB+256GB",
    subcopy: "*Data provided by internal\nlaboratories. Industry measurement.",
    ctaText: "SHOP NOW",
    href: "/shop?category=SmartPhone",
    img: "/uploads/mi11_ultra.png",
    bg: "#0F1720",
    price: 590,
    badgeColor: BLUE,
  },
}) {
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const fmt = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  const rightHasPrice = Number.isFinite(Number(right?.price));

  return (
    <Box sx={{ px: { xs: 2, md: 0 }, py: { xs: 3, md: 4 }, maxWidth: 1320, mx: "auto" }}>
      <Grid container spacing={3}>
        {/* LEFT */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              minHeight: 212,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: left.bg,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1.1fr 1fr" },
              alignItems: "center",
              px: { xs: 2, md: 3 },
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Chip
                label={left.tag}
                size="small"
                sx={{
                  width: "fit-content",
                  bgcolor: BLUE,
                  color: "#fff",
                  borderRadius: "3px",
                  height: 22,
                  fontWeight: 800,
                  letterSpacing: 0.2,
                }}
              />
              <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2, color: DARK, whiteSpace: "pre-line" }}>
                {left.title}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "#5F6C72", whiteSpace: "pre-line" }}>
                {left.copy}
              </Typography>

              <Button
                component={Link}
                to={left.href}
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  mt: 0.5,
                  width: "fit-content",
                  px: 2.5,
                  bgcolor: ORANGE,
                  fontWeight: 800,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#E7712F" },
                }}
                aria-label="Shop HomePod Mini"
              >
                {left.ctaText}
              </Button>
            </Box>

            <Box
              component="img"
              alt="Apple HomePod mini"
              src={assetUrl(left.img)}
              loading="lazy"
              sx={{
                justifySelf: { xs: "center", sm: "end" },
                height: { xs: 120, sm: 150 },
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          </Box>
        </Grid>

        {/* RIGHT */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              minHeight: 212,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: right.bg,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1.1fr 1fr" },
              alignItems: "center",
              px: { xs: 2, md: 3 },
              gap: 2,
              position: "relative",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Chip
                label={right.tag}
                size="small"
                sx={{
                  width: "fit-content",
                  bgcolor: "#EBC80C",
                  color: "#000",
                  borderRadius: "3px",
                  height: 22,
                  fontWeight: 900,
                  letterSpacing: 0.2,
                }}
              />
              <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2, color: "#fff", whiteSpace: "pre-line" }}>
                {right.title}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", whiteSpace: "pre-line" }}>
                {right.subcopy}
              </Typography>

              <Button
                component={Link}
                to={right.href}
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  mt: 0.5,
                  width: "fit-content",
                  px: 2.5,
                  bgcolor: ORANGE,
                  fontWeight: 800,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#E7712F" },
                }}
                aria-label="Shop Xiaomi Mi 11 Ultra"
              >
                {right.ctaText}
              </Button>
            </Box>

            <Box
              component="img"
              alt="Xiaomi Mi 11 Ultra"
              src={assetUrl(right.img)}
              loading="lazy"
              sx={{
                justifySelf: { xs: "center", sm: "end" },
                height: { xs: 130, sm: 170 },
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />

            {/* ========================= NEW/REVISED LOGIC =========================
               PRO: Hide badge if price is not a finite number to avoid confusing UI. */}
            {rightHasPrice && (
              <Box
                sx={{
                  position: "absolute",
                  right: 18,
                  top: 14,
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  bgcolor: right.badgeColor || BLUE,
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 13,
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 24px rgba(0,0,0,.15)",
                  border: "4px solid rgba(255,255,255,.9)",
                }}
                title="Price"
                aria-label={`Price ${fmt(right.price)}`}
              >
                {fmt(right.price)}
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
