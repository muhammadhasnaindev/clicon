// src/pages/account/OrderHistory.jsx
/**
 * OrderHistory
 * - Clean table, resilient shapes, compact pagination.
 * - ===== NEW LOGIC: resilient totals/pages, safer in-progress pick, accessible pagination, short-circuit guards =====
 */

import React from "react";
import { Box, Paper, Typography, Button, Chip, Stack, IconButton } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useGetOrdersQuery } from "../../store/api/apiSlice";
import { displayOrderId, fmtMoney } from "../../utils/orders";

const BORDER = "#E5E7EB";
const HEADER_BG = "#F9FAFB";
const MUTED = "#6B7280";
const ORANGE = "#FA8232";
const GREEN = "#16A34A";
const RED = "#EF4444";
const BLUE = "#1B6392";

function StatusChip({ status = "" }) {
  const s = String(status).toLowerCase();
  let color = ORANGE;
  if (s.includes("complete")) color = GREEN;
  if (s.includes("cancel")) color = RED;
  return (
    <Chip
      size="small"
      label={status?.toUpperCase() || "-"}
      sx={{
        fontWeight: 700,
        fontSize: 12,
        bgcolor: "#fff",
        border: `1px solid ${color}`,
        color,
        height: 24,
      }}
    />
  );
}

export default function OrderHistory() {
  const [page, setPage] = React.useState(1);
  const limit = 12;

  const { data, isFetching } = useGetOrdersQuery(
    { page, limit },
    { refetchOnFocus: true, refetchOnReconnect: true, pollingInterval: 15000 }
  );

  // ===== NEW LOGIC: allow multiple shapes safely =====
  const rows = (data?.data || data?.results || data?.items || data || []) ?? [];
  const total = Number(data?.total ?? data?.count ?? 0) || 0;

  // ===== NEW LOGIC: resilient page count (min 1), prefer server meta when present =====
  const totalPages =
    Number(data?.totalPages) ||
    (total > 0 ? Math.max(1, Math.ceil(total / limit)) : Math.max(1, page));

  // ===== NEW LOGIC: pick an in-progress order for the bottom banner (safer matching) =====
  const inProgress =
    rows.find((o) => {
      const st = String(o?.status || "").toLowerCase();
      const sg = String(o?.stage || "").toLowerCase();
      return st.includes("progress") || st === "pending" || ["placed", "packaging", "onroad", "on the road"].includes(sg);
    }) || null;

  // ===== NEW LOGIC: compact pagination window around current page =====
  const windowSize = 6;
  const startPage = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const endPage = Math.max(startPage, Math.min(totalPages, startPage + windowSize - 1));

  return (
    <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 1 }}>
      <Typography sx={{ fontWeight: 800, mb: 1.5, color: "#191C1F" }}>
        Order History {isFetching ? "…" : ""}
      </Typography>

      <Box sx={{ overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 1 }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ bgcolor: HEADER_BG }}>
            <Box component="tr">
              {["Order ID", "Status", "Stage", "Date", "Total", "Action"].map((h) => (
                <Box
                  key={h}
                  component="th"
                  style={{ textAlign: "left" }}
                  sx={{ p: 1.5, fontSize: 13, color: MUTED, borderBottom: `1px solid ${BORDER}` }}
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>

          <Box component="tbody">
            {rows.map((o) => {
              const did = displayOrderId(o);
              const created = o.createdAt ? new Date(o.createdAt).toLocaleString() : "-";
              const totalMoney = fmtMoney(o?.totals?.totalBase ?? o?.total, o?.currency || "USD");
              return (
                <Box key={o.id || o._id || did} component="tr">
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #F1F5F9", fontWeight: 600 }}>
                    #{did}
                  </Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #F1F5F9" }}>
                    <StatusChip status={o.status || "-"} />
                  </Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #F1F5F9", color: "#374151" }}>
                    {o.stage || "-"}
                  </Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #F1F5F9", color: "#374151" }}>
                    {created}
                  </Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #F1F5F9", color: "#374151" }}>
                    {totalMoney}
                  </Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #F1F5F9" }}>
                    <Button
                      component={RouterLink}
                      to={`/account/dashboard/orders/${o.id || o._id}`}
                      size="small"
                      sx={{ textTransform: "none", color: BLUE, fontWeight: 700 }}
                    >
                      View Details →
                    </Button>
                  </Box>
                </Box>
              );
            })}
            {!rows.length && (
              <Box component="tr">
                <Box component="td" colSpan={6} sx={{ p: 2, color: MUTED }}>
                  No orders found.
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ===== NEW LOGIC: pagination — accessible, compact window ===== */}
      <Stack
        direction="row"
        spacing={1}
        justifyContent="center"
        alignItems="center"
        sx={{ mt: 2 }}
        role="navigation"
        aria-label="Order pages"
      >
        <IconButton
          size="small"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ArrowBackIosNewIcon fontSize="inherit" />
        </IconButton>

        {Array.from({ length: endPage - startPage + 1 }).map((_, idx) => {
          const n = startPage + idx;
          const active = n === page;
          return (
            <Button
              key={n}
              size="small"
              onClick={() => setPage(n)}
              aria-current={active ? "page" : undefined}
              sx={{
                minWidth: 34,
                height: 34,
                borderRadius: "50%",
                bgcolor: active ? ORANGE : "#fff",
                color: active ? "#fff" : "#111827",
                "&:hover": { bgcolor: active ? "#E7711E" : "#F3F4F6" },
              }}
            >
              {String(n).padStart(2, "0")}
            </Button>
          );
        })}

        <IconButton
          size="small"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ArrowForwardIosIcon fontSize="inherit" />
        </IconButton>
      </Stack>

      {/* bottom callout (optional, Figma hint) */}
      {inProgress && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            border: `1px solid ${BORDER}`,
            bgcolor: "#FFF7ED",
          }}
        >
          <Chip size="small" label="IN PROGRESS" sx={{ bgcolor: "#FFF", border: `1px solid ${ORANGE}`, color: ORANGE }} />
          <Typography sx={{ fontSize: 14, color: "#374151" }}>
            Order ID: <b>#{displayOrderId(inProgress)}</b> • {(inProgress.items?.length || 0)} Products
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontWeight: 800, color: BLUE }}>
            {fmtMoney(inProgress?.totals?.totalBase ?? inProgress?.total, inProgress?.currency || "USD")}
          </Typography>
          <Button
            component={RouterLink}
            to={`/account/dashboard/orders/${inProgress.id || inProgress._id}`}
            variant="outlined"
            sx={{ textTransform: "none", ml: 1 }}
          >
            View →
          </Button>
        </Paper>
      )}
    </Paper>
  );
}
