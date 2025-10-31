/**
 * ComputerAccessories
 * Summary: Home section showing computer accessories with tabbed filtering and two right promo banners.
 */

import React, { useState, useMemo } from "react";
import { Box, Grid, Typography, Button, Tabs, Tab, Skeleton } from "@mui/material";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectCurrency, selectRates, setCurrency } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";
import { assetUrl } from "../../utils/asset";
import ProductCardGrid from "../shop/ProductCardGrid";
import { useGetHomeSectionsQuery } from "../../store/api/apiSlice";

const BLUE  = "#2DA5F3";
const ORANGE = "#FA8232";
const DARK  = "#191C1F";
const MUTED = "#5F6C72";

/** Keep tab keys aligned with tab order. */
const TAB_KEYS = ["all", "keyboardMouse", "headphone", "webcam", "printer"];

/**
 * Render the Computer Accessories block.
 */
export default function ComputerAccessories() {
  const [tab, setTab] = useState(0);
  const dispatch = useDispatch();
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);

  const { data: homeSections, isLoading } = useGetHomeSectionsQuery();

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Guard against undefined API response to avoid optional chaining everywhere.
   */
  const computerAccessories = homeSections?.computerAccessories ?? {
    all: [],
    keyboardMouse: [],
    headphone: [],
    webcam: [],
    printer: [],
  };

  /** Human labels for subcategory filtering. */
  const subcategoryMap = {
    keyboardMouse: "Keyboard & Mouse",
    headphone: "Headphone",
    webcam: "Webcam",
    printer: "Printer",
  };

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Keep filtering stable; early return during loading to avoid flicker.
   * Why: tab state should not cause re-renders while we have no data.
   */
  const productsForTab = useMemo(() => {
    if (isLoading) return [];
    const key = TAB_KEYS[tab] || "all";
    if (key === "all") return computerAccessories.all || [];
    const wanted = subcategoryMap[key];
    return (computerAccessories.all || []).filter((p) => p?.subcategory === wanted);
  }, [computerAccessories, tab, isLoading]);

  const fmt = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Tiny UX helper to demo currency flip; safe no-op beyond USD/PKR.
   */
  const cycleCurrency = () => dispatch(setCurrency(currency === "USD" ? "PKR" : "USD"));

  const SKELETON_COUNT = 8;

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 0 }, maxWidth: 1320, mx: "auto" }}>
      <Grid container spacing={3}>
        {/* LEFT grid */}
        <Grid item xs={12} md={8}>
          <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 800, color: DARK, mb: 1 }}>
            Computer Accessories
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2, flexWrap: "wrap" }}>
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
              aria-label="Computer Accessories filter tabs"
            >
              <Tab label="All Product" />
              <Tab label="Keyboard & Mouse" />
              <Tab label="Headphone" />
              <Tab label="Webcam" />
              <Tab label="Printer" />
            </Tabs>

            <Button
              component={Link}
              to="/shop?category=Computer%20Accessories"
              variant="text"
              sx={{ ml: "auto", color: BLUE, fontWeight: 700, textTransform: "none" }}
            >
              {/* ========================= NEW/REVISED LOGIC =========================
                 PRO: Copy polish. */}
              Browse All Products →
            </Button>
          </Box>

          <Grid container spacing={2.5}>
            {(isLoading ? Array.from({ length: SKELETON_COUNT }, (_, i) => ({ _sk: i })) : productsForTab).map(
              (p, idx) => (
                <Grid item xs={12} sm={6} md={4} key={p?._id || p?.id || p?.slug || p?._sk || idx}>
                  {isLoading ? (
                    <Box sx={{ border: "1px solid #E0E0E0", borderRadius: 1, p: 2 }}>
                      <Skeleton variant="rounded" sx={{ height: 150, mb: 2 }} />
                      <Skeleton width="80%" />
                      <Skeleton width="50%" />
                      <Skeleton width="40%" />
                      <Skeleton variant="rounded" height={36} sx={{ mt: "auto" }} />
                    </Box>
                  ) : (
                    <ProductCardGrid product={p} />
                  )}
                </Grid>
              )
            )}
          </Grid>
        </Grid>

        {/* RIGHT banners */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              mb: 4,
              mt: { xs: 2, md: 8 },
              p: 3,
              borderRadius: 1,
              color: DARK,
              background: "#F7E99E",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              component="img"
              src={assetUrl("/uploads/tz02.png")}
              alt="Xiaomi Earbuds"
              sx={{
                width: { xs: 160, md: 224 },
                height: { xs: 160, md: 224 },
                objectFit: "contain",
                justifySelf: "center",
              }}
            />
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800 }}>
                Xiaomi True <br /> Wireless Earbuds
              </Typography>
              <Typography sx={{ color: MUTED, fontSize: 14, mt: 1 }}>
                Escape the noise, it’s time to hear the magic with Xiaomi Earbuds.
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1.25 }}>
                <Typography sx={{ fontWeight: 800, color: DARK }}>Only for</Typography>
                <Box
                  onClick={cycleCurrency}
                  sx={{
                    cursor: "pointer",
                    border: "1px solid #E5E7EB",
                    bgcolor: "#fff",
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 900,
                    color: DARK,
                    minWidth: 110,
                    textAlign: "center",
                  }}
                  title="Click to switch USD/PKR"
                  aria-label="Toggle currency USD/PKR"
                >
                  {fmt(299)}
                </Box>
              </Box>

              <Button
                component={Link}
                to="/shop?subcategory=Headphone"
                variant="contained"
                sx={{ mt: 1.5, bgcolor: ORANGE, fontWeight: 800, "&:hover": { bgcolor: "#E7712F" } }}
              >
                SHOP NOW →
              </Button>
            </Box>
          </Box>

          <Box sx={{ p: 3, borderRadius: 1, color: "#FFFFFF", bgcolor: "#103B66" }}>
            <Typography sx={{ opacity: 0.8, fontSize: 12, mb: 0.5 }}>SUMMER SALES</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 900, mb: 0.5 }}>37% DISCOUNT</Typography>
            <Typography sx={{ opacity: 0.9, mb: 1 }}>
              only for <span style={{ color: BLUE, fontWeight: 800 }}>SmartPhone</span> product.
            </Typography>
            <Button
              component={Link}
              to="/shop?category=SmartPhone"
              variant="contained"
              sx={{ bgcolor: BLUE, fontWeight: 800, "&:hover": { bgcolor: "#2098E9" } }}
            >
              SHOP NOW →
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
