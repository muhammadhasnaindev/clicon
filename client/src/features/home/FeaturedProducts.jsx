/**
 * FeaturedProducts
 * Summary: Promo left rail + tab-filtered product grid on the right.

 */

import React, { useMemo, useState } from "react";
import { Box, Typography, Button, Grid, Tabs, Tab, Skeleton } from "@mui/material";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";
import { assetUrl } from "../../utils/asset";
import ProductCardGrid from "../shop/ProductCardGrid";

const BLUE = "#2DA5F3";
const ORANGE = "#FA8232";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";

const getId = (p) => p?._id ?? p?.id ?? p?.slug ?? p?.sku;
const eq = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

/**
 * Render Featured Products section.
 * @param {{ loading?: boolean, items?: any[] }} props
 */
export default function FeaturedProducts({ loading, items = [] }) {
  const [tab, setTab] = useState(0);
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const fmt = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  const baseList = loading ? Array.from({ length: 8 }, (_, i) => ({ _sk: i })) : items;

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Clear comment on tab filters; keep comparisons case-insensitive.
   * 0=All, 1=SmartPhone, 2=Laptop(+title contains 'laptop'), 3=Computer Accessories + Headphone, 4=TV
   */
  const filtered = useMemo(() => {
    if (loading) return baseList;
    return baseList.filter((p) => {
      if (!p || tab === 0) return true;
      if (tab === 1) return eq(p.category, "SmartPhone");
      if (tab === 2) return eq(p.category, "Computer & Laptop") || /laptop/i.test(p?.title ?? "");
      if (tab === 3) return eq(p.category, "Computer Accessories") && eq(p.subcategory, "Headphone");
      if (tab === 4) return eq(p.category, "TV");
      return true;
    });
  }, [baseList, tab, loading]);

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 0 }, maxWidth: 1320, mx: "auto" }}>
      <Grid container spacing={3} alignItems="stretch">
        {/* LEFT PROMO */}
        <Grid item xs={12} md={3}>
          <Box
            sx={{
              height: "100%",
              borderRadius: 1,
              overflow: "hidden",
              border: `1px solid ${BORDER}`,
              display: "flex",
              flexDirection: "column",
              bgcolor: "#F3DE6D",
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 800, mb: 0.5 }}>
                COMPUTER & ACCESSORIES
              </Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 900, color: DARK, mb: 1 }}>
                32% Discount
              </Typography>
              <Typography sx={{ fontSize: 13, color: MUTED, mb: 1.5 }}>
                For all electronics products
              </Typography>

              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
                <Typography sx={{ fontSize: 12, color: DARK, px: 1, py: 0.5 }}>
                  Offer ends in:
                </Typography>
                <Box
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: DARK,
                    bgcolor: "#FFF",
                    border: `1px solid ${BORDER}`,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  ENDS OF CHRISTMAS
                </Box>
              </Box>

              <Button
                component={Link}
                to="/shop?category=Computer%20Accessories"
                variant="contained"
                sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#E7712F" }, fontWeight: 800, textTransform: "none" }}
              >
                SHOP NOW
              </Button>
            </Box>

            <Box
              component="img"
              src={assetUrl("/uploads/promo_computer_accessories.png")}
              alt="Promo"
              sx={{ mt: "auto", width: "100%", height: 220, objectFit: "cover" }}
            />
          </Box>
        </Grid>

        {/* RIGHT */}
        <Grid item xs={12} md={9}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 900, color: DARK, mr: 2 }}>
              Featured Products
            </Typography>

            <Tabs
              value={tab}
              onChange={(_e, v) => setTab(v)}
              sx={{
                minHeight: 36,
                "& .MuiTabs-indicator": { background: BLUE },
                "& .MuiTab-root": {
                  minHeight: 36,
                  textTransform: "none",
                  minWidth: "auto",
                  fontSize: 14,
                  fontWeight: 700,
                  color: MUTED,
                  px: 1.25,
                  "&.Mui-selected": { color: BLUE },
                },
              }}
              aria-label="Featured Products filter tabs"
            >
              <Tab label="All Product" />
              <Tab label="Smart Phone" />
              <Tab label="Laptop" />
              <Tab label="Headphone" />
              <Tab label="TV" />
            </Tabs>

            <Box sx={{ flex: 1 }} />
            <Button
              component={Link}
              to="/shop"
              variant="text"
              sx={{ color: BLUE, fontWeight: 700, textTransform: "none" }}
            >
              {/* ========================= NEW/REVISED LOGIC =========================
                 PRO: Copy polish. */}
              Browse All Products →
            </Button>
          </Box>

          <Grid container spacing={2.5}>
            {(loading ? Array.from({ length: 8 }) : filtered).map((p, idx) => (
              <Grid item xs={12} sm={6} md={4} key={getId(p) ?? `sk-${idx}`}>
                {loading ? (
                  <Box sx={{ border: "1px solid #E0E0E0", borderRadius: 1, p: 2 }}>
                    <Skeleton variant="rectangular" height={150} sx={{ mb: 1.5 }} />
                    <Skeleton width="90%" />
                    <Skeleton width="70%" />
                    <Skeleton width="40%" />
                  </Box>
                ) : (
                  <ProductCardGrid product={p} />
                )}
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
