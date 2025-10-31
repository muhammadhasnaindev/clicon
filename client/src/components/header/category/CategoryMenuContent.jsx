// src/components/.../CategoryMenuContent.jsx
/**
 * Summary:
 * Subcategory tabs, small product list, and a promo card with best discount.

 */

import React, { useMemo, useState, useEffect } from "react";
import { Box, List, ListItemButton, Typography, Button, Grid, Skeleton } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrency, selectRates } from "../../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../../utils/money";
import { useGetProductsQuery } from "../../../store/api/apiSlice";
import { openQuickView } from "../../../store/slices/quickViewSlice";
import { assetUrl } from "../../../utils/asset";

const discountPctOf = (p) => {
  const old = p?.price?.old;
  const curr = p?.price?.current;
  if (typeof old === "number" && old > 0 && typeof curr === "number" && curr < old) {
    return Math.round(((old - curr) / old) * 100);
  }
  const m = String(p?.discountText || "").match(/(\d+)\s*%/);
  return m ? Number(m[1]) : 0;
};

const pickPromoProduct = (list) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  let best = list[0],
    bestPct = discountPctOf(best);
  for (let i = 1; i < list.length; i++) {
    const pct = discountPctOf(list[i]);
    if (pct > bestPct) {
      best = list[i];
      bestPct = pct;
    }
  }
  return best;
};

export default function CategoryMenuContent({ category, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const subTabs = useMemo(() => {
    const names = (category?.subcategories || []).map((s) => s?.name).filter(Boolean);
    return ["All", ...Array.from(new Set(names))];
  }, [category]);

  const [selectedSub, setSelectedSub] = useState("All");
  useEffect(() => setSelectedSub("All"), [category?.name]);

  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const fmt = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  const queryParams = useMemo(() => {
    const base = { category: category?.name, limit: 12, page: 1, sort: "rating" };
    if (selectedSub !== "All") base.subcategory = selectedSub;
    return base;
  }, [category?.name, selectedSub]);

  const { data, isFetching } = useGetProductsQuery(queryParams, { skip: !category?.name });
  const products = Array.isArray(data) ? data : data?.data || [];

  const promo = useMemo(() => pickPromoProduct(products), [products]);
  const promoPct = discountPctOf(promo || {});
  const promoImg = assetUrl(
    (Array.isArray(promo?.images) && promo.images[0]) ||
      promo?.image ||
      category?.image ||
      "/uploads/placeholder.png"
  );
  const promoPrice = typeof promo?.price?.current === "number" ? promo.price.current : null;
  const promoLine = promo?.title
    ? promo.title.length > 62
      ? promo.title.slice(0, 59) + "..."
      : promo.title
    : `Top pick in ${category?.name || "Category"}`;

  const goToShop = () => {
    const params = new URLSearchParams({ category: category?.name || "" });
    if (selectedSub !== "All") params.set("subcategory", selectedSub);
    onClose?.();
    navigate(`/shop?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        p: 2,
        borderRadius: 1,
        minWidth: { xs: "100%", md: 700 },
        flexDirection: { xs: "column", md: "row" },
      }}
    >
      {/* Subcategories (sticky on mobile for better UX) */}
      <List
        sx={{
          position: { xs: "sticky", md: "static" },
          top: { xs: 0, md: "auto" },
          zIndex: { xs: 1, md: "auto" },
          backgroundColor: { xs: "#fff", md: "transparent" },
          width: { xs: "100%", md: 160 },
          borderRight: { xs: 0, md: "1px solid #eee" },
          borderBottom: { xs: "1px solid #eee", md: 0 },
          display: "flex",
          flexDirection: { xs: "row", md: "column" },
          overflowX: { xs: "auto", md: "hidden" },
          gap: { xs: 1, md: 0 },
          pb: { xs: 1, md: 0 },
        }}
      >
        {subTabs.map((sub) => (
          <ListItemButton
            key={sub}
            selected={selectedSub === sub}
            onClick={() => setSelectedSub(sub)}
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: { xs: 1, md: 0 },
              flex: { xs: "0 0 auto", md: "initial" },
              "&.Mui-selected": { backgroundColor: "#F7F8FA", fontWeight: "bold" },
              "&:hover": { backgroundColor: "#F7F8FA" },
            }}
          >
            <Typography fontSize={14} noWrap title={sub}>
              {sub}
            </Typography>
          </ListItemButton>
        ))}
      </List>

      {/* Products */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          {String(category?.name || "").toLowerCase().includes("phone")
            ? "FEATURED PHONES"
            : "FEATURED PRODUCTS"}
        </Typography>

        <Grid container spacing={1.5}>
          {isFetching
            ? Array.from({ length: 8 }).map((_, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Skeleton variant="rectangular" width={60} height={60} sx={{ borderRadius: 1 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="40%" />
                    </Box>
                  </Box>
                </Grid>
              ))
            : products.map((p) => {
                const id = p._id || p.id || p.slug || p.sku;
                const img = assetUrl(
                  Array.isArray(p.images) && p.images.length ? p.images[0] : p.image || "/uploads/placeholder.png"
                );
                const price = p?.price?.current;

                return (
                  <Grid item xs={12} sm={6} key={id}>
                    <Box
                      onClick={() => dispatch(openQuickView(id))}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        cursor: "pointer",
                        border: "1px solid #EEF2F5",
                        borderRadius: 1,
                        p: 1,
                        "&:hover": { backgroundColor: "#FAFBFC" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                        <Box
                          component="img"
                          src={img}
                          alt={p.title || "Product"}
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 1,
                            border: "1px solid #eee",
                            objectFit: "cover",
                            background: "#fff",
                          }}
                          loading="lazy"
                        />
                        <Typography fontSize={14} noWrap title={p.title}>
                          {p.title || "Untitled"}
                        </Typography>
                      </Box>

                      {typeof price === "number" && (
                        <Typography fontSize={14} color="primary" sx={{ flexShrink: 0 }}>
                          {fmt(price)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
        </Grid>

        <Box sx={{ mt: 1.5, display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" onClick={goToShop} aria-label="View all products in category">
            View all
          </Button>
        </Box>
      </Box>

      {/* Promo (hidden on phones for a cleaner look) */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          width: 180,
          p: 2,
          bgcolor: "#FFF9E6",
          textAlign: "center",
          borderRadius: 1,
          border: "1px solid #FDE9C8",
          alignSelf: { xs: "stretch", md: "auto" },
        }}
      >
        <Box
          component="img"
          src={promoImg}
          alt={promo?.title || category?.name || "Promo"}
          onClick={() => promo && dispatch(openQuickView(promo._id || promo.id || promo.slug))}
          sx={{ width: "100%", height: 84, objectFit: "contain", mb: 1, cursor: promo ? "pointer" : "default" }}
          loading="lazy"
        />
        <Typography variant="h6" fontWeight={600} mb={1}>
          {promoPct > 0 ? `${promoPct}% Discount` : "HOT DEAL"}
        </Typography>
        <Typography variant="body2" mb={2}>
          {promoLine}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "inline-block",
            bgcolor: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: "6px",
            px: 1,
            py: 0.5,
            mb: 1.5,
          }}
        >
          Starting price: {promoPrice != null ? fmt(promoPrice) : "—"}
        </Typography>
        <Button
          variant="contained"
          fullWidth
          sx={{ bgcolor: "#FF7F2A", "&:hover": { bgcolor: "#E65A00" } }}
          onClick={goToShop}
        >
          SHOP NOW
        </Button>
      </Box>
    </Box>
  );
}
