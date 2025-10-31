/**
 * ProductGrid
 * Renders product cards and a paginated footer while keeping URL query params in sync.
 */

import React, { useMemo, useEffect } from "react";
import { Box, Grid, Pagination, Skeleton } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { useGetProductsQuery } from "../../store/api/apiSlice";
import ProductCardGrid from "./ProductCardGrid";

const ORANGE = "#FA8232";
const DEFAULT_LIMIT = 24;
const DEFAULT_PAGE = 1;
const DEFAULT_SORT = "popular";
const SKELETON_HEIGHT = 140;
const PAGINATION_ITEM_SIZE = 36;

const QUERY_KEYS = [
  "q",
  "category",
  "subcategory",
  "brand",
  "tags",
  "sort",
  "page",
  "limit",
  "minPrice",
  "maxPrice",
];

export default function ProductGrid() {
  const [sp, setSp] = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams(sp.toString());
    let changed = false;
    if (!next.get("limit")) { next.set("limit", String(DEFAULT_LIMIT)); changed = true; }
    if (!next.get("page"))  { next.set("page", String(DEFAULT_PAGE));  changed = true; }
    if (!next.get("sort"))  { next.set("sort", DEFAULT_SORT);          changed = true; }
    if (changed) setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = useMemo(() => {
    const obj = {};
    QUERY_KEYS.forEach((k) => {
      const v = sp.get(k);
      if (v) obj[k] = v;
    });
    if (!obj.limit) obj.limit = String(DEFAULT_LIMIT);
    if (!obj.sort) obj.sort = DEFAULT_SORT;
    return obj;
  }, [sp]);

  const limitRaw = Number(sp.get("limit") || DEFAULT_LIMIT);
  const pageLimit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT;

  const { data, isFetching } = useGetProductsQuery(params);

  const items = data?.data || [];

  const totalPagesRaw =
    data?.pages ??
    data?.totalPages ??
    (data?.total != null && pageLimit > 0
      ? Math.ceil(Number(data.total) / pageLimit)
      : 1);
  const totalPages =
    Number.isFinite(Number(totalPagesRaw)) && Number(totalPagesRaw) > 0
      ? Number(totalPagesRaw)
      : 1;

  const pageRaw = Number(data?.page ?? sp.get("page") ?? DEFAULT_PAGE);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : DEFAULT_PAGE;

  useEffect(() => {
    const total = Number(data?.total);
    if (!Number.isFinite(total) || total < 0) return;
    const next = new URLSearchParams(sp.toString());
    next.set("results", String(total));
    setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.total]);

  const changePage = (_e, nextPage) => {
    if (nextPage === page) return;
    const next = new URLSearchParams(sp.toString());
    next.set("page", String(nextPage));
    setSp(next, { replace: true });
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {(isFetching ? Array.from({ length: pageLimit }) : items).map((p, i) => (
          <Grid key={isFetching ? i : p?._id || p?.id || p?.slug || i} item xs={12} sm={6} md={4}>
            {isFetching ? (
              <Box sx={{ border: "1px solid #E0E0E0", borderRadius: 1, p: { xs: 1.5, md: 2 } }}>
                <Skeleton variant="rectangular" height={SKELETON_HEIGHT} sx={{ mb: 1 }} />
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

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={changePage}
            siblingCount={1}
            boundaryCount={1}
            aria-label="Products pagination"
            sx={{
              "& .MuiPagination-ul": { gap: 1 },
              "& .MuiPaginationItem-root": {
                borderRadius: "50%",
                width: PAGINATION_ITEM_SIZE,
                height: PAGINATION_ITEM_SIZE,
                fontWeight: 700,
              },
              "& .Mui-selected": {
                bgcolor: ORANGE,
                color: "#fff !important",
              },
            }}
          />
        </Box>
      )}
    </>
  );
}
