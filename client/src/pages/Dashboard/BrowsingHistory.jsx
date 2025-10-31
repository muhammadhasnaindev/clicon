// src/pages/account/BrowsingHistory.jsx
/**
 * BrowsingHistory — shows user's viewed products with paging + resilient images.
 
 */

import React from "react";
import { Box, Paper, Typography, Grid, Stack, Chip, Pagination, Rating, Skeleton } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useGetBrowsingHistoryQuery } from "../../store/api/apiSlice";

const BORDER = "#e5e7eb";
const cardBorder = `1px solid ${BORDER}`;
const PAGE_SIZE = 12;

/** Normalize possible image paths/urls into an absolute/known asset. */
const imgSrc = (img) => {
  if (!img) return "/uploads/not-found.svg";
  const s = String(img);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/uploads/")) return s;
  if (s.startsWith("uploads/")) return `/${s}`; // -> "/uploads/…"
  // default: prefix once
  return `/uploads/${s.replace(/^\/+/, "")}`;
};

const fmtMoney = (n) => {
  // ===== NEW LOGIC: Gentle money formatting =====
  const num = Number(n);
  if (!isFinite(num)) return "--";
  return `$${num.toFixed(2)}`;
};

const coerceRating = (v) => {
  // ===== NEW LOGIC: Rating coercion (0–5, halves) =====
  const n = Math.max(0, Math.min(5, Number(v || 0)));
  return Math.round(n * 2) / 2;
};

export default function BrowsingHistory() {
  const [page, setPage] = React.useState(1);
  const { data, isFetching } = useGetBrowsingHistoryQuery({ page, limit: PAGE_SIZE });
  const rows = data?.data || [];
  const total = data?.meta?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Paper elevation={0} sx={{ p: 2, border: cardBorder, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>Browsing History</Typography>
        {isFetching ? <Chip size="small" label="Refreshing…" /> : null}
      </Stack>

      <Grid container spacing={2}>
        {(isFetching && !rows.length ? Array.from({ length: 8 }) : rows).map((r, i) => (
          <Grid key={r?._id || r?.slug || i} item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 1.5, border: cardBorder, borderRadius: 2 }}>
              <Box
                component={RouterLink}
                to={r?.slug ? `/shop/${r.slug}` : "#"}
                sx={{ display: "block", textDecoration: "none", color: "inherit" }}
                aria-label={r?.title || "Product"}
              >
                <Box
                  sx={{
                    height: 140,
                    borderRadius: 1,
                    bgcolor: "#f3f4f6",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 1,
                  }}
                >
                  {isFetching && !rows.length ? (
                    <Skeleton variant="rectangular" width="100%" height="100%" />
                  ) : (
                    <img
                      src={imgSrc(r?.image)}
                      alt={r?.title || ""}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = "/uploads/not-found.svg")}
                    />
                  )}
                </Box>

                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={r?.title || ""}>
                  {r?.title || "-"}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {fmtMoney(r?.price)}
                  </Typography>
                  <Rating size="small" value={coerceRating(r?.rating)} precision={0.5} readOnly />
                  <Typography variant="caption" color="text.secondary">
                    ({r?.reviews || 0})
                  </Typography>
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  Viewed {r?.viewedAt ? new Date(r.viewedAt).toLocaleString() : "-"}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ===== NEW LOGIC: Empty-state (only when not fetching) ===== */}
      {!isFetching && rows.length === 0 && (
        <Paper elevation={0} sx={{ mt: 2, p: 2, border: cardBorder, borderRadius: 2, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>No browsing history yet.</Typography>
        </Paper>
      )}

      <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
        <Pagination count={pageCount} page={page} onChange={(_e, p) => setPage(p)} shape="rounded" color="primary" />
      </Stack>
    </Paper>
  );
}
