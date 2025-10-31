/**
 * FlashSaleToday
 * Summary: Four compact columns of product teasers (flash, best sellers, top rated, new).

 */

import React from "react";
import { Box, Grid, Typography, Stack, Skeleton } from "@mui/material";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";
import { assetUrl } from "../../utils/asset";

const BLUE = "#2DA5F3";
const DARK = "#191C1F";
const BORDER = "#E5E7EB";
const SKELETON_ROWS = 3;

const toId   = (p) => p?._id || p?.id || p?.slug || p?.sku;
const imgOf  = (p) => assetUrl(p?.image || p?.images?.[0] || "/uploads/placeholder.png");
const priceOf= (p) => Number(p?.price?.current ?? p?.discountPrice ?? p?.price ?? 0);

/**
 * @param {{ loading?: boolean, groups?: Record<string, any[]> }} props
 */
export default function FlashSaleToday({ loading = false, groups = {} }) {
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const fmt = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Normalize input groups to avoid optional chaining all over the map.
   */
  const columns = [
    { title: "FLASH SALE TODAY", list: Array.isArray(groups?.flashSale) ? groups.flashSale : [] },
    { title: "BEST SELLERS",    list: Array.isArray(groups?.bestSellers) ? groups.bestSellers : [] },
    { title: "TOP RATED",       list: Array.isArray(groups?.topRated) ? groups.topRated : [] },
    { title: "NEW ARRIVAL",     list: Array.isArray(groups?.newArrival) ? groups.newArrival : [] },
  ];

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 0 }, maxWidth: 1320, mx: "auto" }}>
      <Grid container spacing={4}>
        {columns.map((col, ci) => (
          <Grid item xs={12} sm={6} md={3} key={ci}>
            <Typography sx={{ fontWeight: 900, fontSize: 14, letterSpacing: 0.4, color: DARK, mb: 2 }}>
              {col.title}
            </Typography>

            <Stack spacing={1.25}>
              {(loading ? Array.from({ length: SKELETON_ROWS }) : (col.list || []).slice(0, SKELETON_ROWS)).map((p, i) => {
                if (loading) {
                  return (
                    <Box
                      key={`sk-${ci}-${i}`}
                      sx={{ display: "flex", gap: 1.5, p: 1.25, border: `1px solid ${BORDER}`, borderRadius: 1 }}
                    >
                      <Skeleton variant="rounded" width={48} height={48} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Skeleton height={14} width="90%" sx={{ mb: 0.5 }} />
                        <Skeleton height={14} width="40%" />
                      </Box>
                    </Box>
                  );
                }

                /* ========================= NEW/REVISED LOGIC =========================
                 * PRO: Guard against malformed product objects; fallback to safe values.
                 */
                const id = toId(p) || `${ci}-${i}`;
                const slug = p?.slug || p?._id || id;
                const img = imgOf(p);
                const title = p?.title || "Untitled";
                const price = fmt(priceOf(p));

                return (
                  <Link key={id} to={`/product/${slug}`} style={{ textDecoration: "none" }} aria-label={`Open ${title}`}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.25,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 1,
                        transition: "all .15s ease",
                        bgcolor: "#fff",
                        "&:hover": { borderColor: BLUE, boxShadow: "0 8px 20px rgba(0,0,0,.06)" },
                      }}
                    >
                      <Box
                        component="img"
                        src={img}
                        alt={title}
                        loading="lazy"
                        sx={{ width: 48, height: 48, objectFit: "contain", flexShrink: 0 }}
                      />

                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography
                          title={title}
                          sx={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: DARK,
                            lineHeight: 1.35,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            mb: 0.25,
                          }}
                        >
                          {title}
                        </Typography>

                        <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: BLUE }}>
                          {price}
                        </Typography>
                      </Box>
                    </Box>
                  </Link>
                );
              })}
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
