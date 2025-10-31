// src/features/compare/ProductCompareTable.jsx
/**
 * Summary:
 * Responsive compare table with pagination and clean, content-based rows.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Stack,
  Divider,
  Pagination,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
// quickview intentionally omitted
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../../store/slices/cartSlice";
import { addToWishlist } from "../../store/slices/wishlistSlice";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";
import { assetUrl } from "../../utils/asset";
import {
  clearCompare,
  removeFromCompare,
  selectCompare,
} from "../../store/slices/compareSlice";

const BLUE = "#1B6392";
const ORANGE = "#FA8232";
const BORDER = "#E5E7EB";
const DARK = "#191C1F";
const MUTED = "#5F6C72";

const idOf = (p) => p?._id || p?.id || p?.slug || p?.sku;
const imgOf = (p) =>
  assetUrl(p.image || p.images?.[0] || p?.images?.[0] || "/uploads/placeholder.png");
const priceNow = (p) => Number(p?.price?.current ?? p?.discountPrice ?? p?.price ?? 0);

export default function ProductCompareTable() {
  const dispatch = useDispatch();
  const items = useSelector(selectCompare) || [];
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const fmt = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  const theme = useTheme();
  const xs = useMediaQuery(theme.breakpoints.down("sm"));
  const sm = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const md = useMediaQuery(theme.breakpoints.between("md", "lg"));

  // PRO: Stable pageSize calc
  const pageSize = useMemo(() => (xs ? 1 : sm ? 2 : md ? 3 : 4), [xs, sm, md]);

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // PRO: Clamp page when items/pageSize change (e.g., after remove/clear)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const current = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // Empty state
  if (items.length === 0) {
    return (
      <Box sx={{ py: 6, px: 2 }}>
        <Box
          sx={{
            maxWidth: 860,
            mx: "auto",
            textAlign: "center",
            border: `1px dashed ${BORDER}`,
            borderRadius: 2,
            p: { xs: 4, md: 6 },
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 1, color: DARK }}>
            Your comparison is empty
          </Typography>
          <Typography sx={{ color: MUTED, mb: 3 }}>
            Add products using the “Compare” icon on any product card.
          </Typography>
          <Button
            href="/shop"
            variant="contained"
            sx={{
              bgcolor: ORANGE,
              "&:hover": { bgcolor: "#E7712F" },
              fontWeight: 700,
            }}
          >
            Browse Products
          </Button>
        </Box>
      </Box>
    );
  }

  // rows to display (render only rows where at least one product has content)
  const rowsAll = [
    { key: "Price", render: (p) => fmt(priceNow(p)) },
    { key: "Old price", render: (p) => (p?.price?.old ? fmt(p.price.old) : "—") },
    { key: "Brand", render: (p) => p?.brand || "—" },
    { key: "Model", render: (p) => p?.model || "—" },
    {
      key: "Stock status",
      render: (p) =>
        (p?.stock ?? 0) > 0 ? (
          <span style={{ color: "#1AAE55", fontWeight: 700 }}>IN STOCK</span>
        ) : (
          <span style={{ color: "#E45858", fontWeight: 700 }}>OUT OF STOCK</span>
        ),
    },
    {
      key: "Size",
      render: (p) =>
        Array.isArray(p?.size) ? p.size.join(", ") : p?.size || "—",
    },
    {
      key: "Memory",
      render: (p) =>
        Array.isArray(p?.memory) ? p.memory.join(", ") : p?.memory || "—",
    },
    {
      key: "Storage",
      render: (p) =>
        Array.isArray(p?.storage) ? p.storage.join(", ") : p?.storage || "—",
    },
    { key: "Weight", render: (p) => p?.weight || "—" },
  ];

  const visibleRows = rowsAll.filter((row) =>
    current.some((p) => {
      const val = row.render(p);
      return !(val === "—" || val === "" || val === null || val === undefined);
    })
  );

  return (
    <Box sx={{ py: 4, px: { xs: 2, md: 8 } }}>
      <Box sx={{ maxWidth: 1320, mx: "auto" }}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 2, gap: 1 }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 24, color: DARK }}>
            Compare Products
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, value) => setPage(value)}
                size="small"
                sx={{
                  "& .MuiPaginationItem-root": { color: DARK },
                  mr: 1,
                }}
              />
            )}
            <Button
              startIcon={<DeleteSweepIcon />}
              onClick={() => dispatch(clearCompare())}
              sx={{ color: "#9A9FA5", textTransform: "none" }}
              aria-label="Clear all compared products"
            >
              Clear all
            </Button>
          </Stack>
        </Stack>

        {/* Grid Table */}
        <Box
          sx={{
            display: "grid",
            gap: 0,
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            overflow: "hidden",
            gridTemplateColumns: `minmax(120px,auto) repeat(${current.length}, minmax(220px, 1fr))`,
          }}
        >
          {/* Row: Products */}
          <Box
            sx={{
              p: 2,
              bgcolor: "#F9FAFB",
              borderRight: `1px solid ${BORDER}`,
              fontWeight: 700,
            }}
          >
            Products
          </Box>

          {current.map((p) => (
            <Box key={idOf(p)} sx={{ p: { xs: 1.5, md: 2 } }}>
              <Box sx={{ position: "relative" }}>
                <IconButton
                  size="small"
                  aria-label={`Remove ${p.title || "product"}`}
                  onClick={() => dispatch(removeFromCompare(idOf(p)))}
                  sx={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    bgcolor: "#fff",
                    border: `1px solid ${BORDER}`,
                    "&:hover": { bgcolor: "#fff" },
                  }}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>

                <Box
                  component="img"
                  src={imgOf(p)}
                  alt={p.title || "Product"}
                  title={p.title || "Product"}
                  sx={{
                    width: "100%",
                    height: { xs: 120, sm: 140, md: 160 },
                    objectFit: "contain",
                    mb: 1,
                  }}
                  loading="lazy"
                />
              </Box>

              <Typography
                sx={{
                  fontWeight: 600,
                  color: DARK,
                  lineHeight: 1.4,
                  mb: 0.75,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  minHeight: 36,
                }}
                title={p.title}
              >
                {p.title}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ color: BLUE, fontWeight: 800 }}>
                  {fmt(priceNow(p))}
                </Typography>
                {p?.price?.old ? (
                  <Typography sx={{ color: "#9A9FA5", textDecoration: "line-through" }}>
                    {fmt(p.price.old)}
                  </Typography>
                ) : null}
              </Stack>

              <Stack direction="row" spacing={1}>
                <Tooltip title="Add to wishlist">
                  <IconButton
                    size="small"
                    aria-label={`Add ${p.title || "product"} to wishlist`}
                    onClick={() =>
                      dispatch(
                        addToWishlist({
                          id: idOf(p),
                          title: p.title,
                          image: imgOf(p),
                          price: priceNow(p),
                        })
                      )
                    }
                  >
                    <FavoriteBorderIcon />
                  </IconButton>
                </Tooltip>

                <Button
                  size="small"
                  startIcon={<ShoppingCartIcon />}
                  variant="contained"
                  onClick={() =>
                    dispatch(
                      addItem({
                        id: idOf(p),
                        title: p.title,
                        image: imgOf(p),
                        price: priceNow(p),
                      })
                    )
                  }
                  sx={{
                    ml: "auto",
                    height: 34,
                    bgcolor: ORANGE,
                    "&:hover": { bgcolor: "#E7712F" },
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Add to Cart
                </Button>
              </Stack>
            </Box>
          ))}

          {/* divider */}
          <Box sx={{ gridColumn: `1 / span ${current.length + 1}` }}>
            <Divider />
          </Box>

          {/* Spec rows */}
          {visibleRows.map((row, rIdx) => (
            <React.Fragment key={row.key}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#F9FAFB",
                  borderTop: rIdx ? `1px solid ${BORDER}` : "none",
                  borderRight: `1px solid ${BORDER}`,
                  fontWeight: 700,
                  color: DARK,
                }}
              >
                {row.key}
              </Box>
              {current.map((p, i) => (
                <Box
                  key={`${row.key}-${i}`}
                  sx={{
                    p: 2,
                    borderTop: rIdx ? `1px solid ${BORDER}` : "none",
                    color: DARK,
                  }}
                >
                  {row.render(p)}
                </Box>
              ))}
            </React.Fragment>
          ))}
        </Box>

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <Stack alignItems="center" sx={{ mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_e, value) => setPage(value)}
              shape="rounded"
            />
          </Stack>
        )}
      </Box>
    </Box>
  );
}
