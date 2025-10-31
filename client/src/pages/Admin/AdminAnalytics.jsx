// src/pages/account/AdminAnalytics.jsx
/**
 * AdminAnalytics
 * Summary: Admin-facing KPIs + charts for sales, categories, and item views.
 */

import React, { useMemo } from "react";
import {
  useAdminSalesStatsQuery,
  useAdminTopProductsQuery,
  useAdminCategoryViewsQuery,
  useAdminItemViewsQuery,
} from "../../store/api/apiSlice";
import {
  Typography, Card, CardContent, Grid, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, Box, Stack, Divider, IconButton, Skeleton, Chip
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import InsightsIcon from "@mui/icons-material/Insights";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PermGate from "../../acl/PermGate";
import Forbidden from "../Forbidden";

// Charts
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const yearNow = new Date().getFullYear();

/** ======================= NEW/REVISED LOGIC =======================
 * PRO: Avoid "magic" numbers and keep year input reasonable.
 * - Bounds are conservative and can be relaxed later.
 */
const YEAR_MIN = 2000;
const YEAR_MAX = yearNow;

const MONTHS = [
  { key: 1,  label: "Jan" },
  { key: 2,  label: "Feb" },
  { key: 3,  label: "Mar" },
  { key: 4,  label: "Apr" },
  { key: 5,  label: "May" },
  { key: 6,  label: "Jun" },
  { key: 7,  label: "Jul" },
  { key: 8,  label: "Aug" },
  { key: 9,  label: "Sep" },
  { key: 10, label: "Oct" },
  { key: 11, label: "Nov" },
  { key: 12, label: "Dec" },
];

// Currency helper (defensive)
const fmtCurrency = (n) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    .format(Number.isFinite(Number(n)) ? Number(n) : 0);

// Compact number (defensive)
const fmtCompact = (n) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(Number(n)) ? Number(n) : 0);

/** ======================= NEW/REVISED LOGIC =======================
 * PRO: Normalize API rows into 12 months, coerce numbers, and skip bad rows.
 * - Handles month as number (1..12) or string ("Jan", "January").
 * - Ensures charts have stable x-axis.
 */
/**
 * Build a 12-month series from sparse API rows.
 * @param {Array<{month:number|string, orders:number, revenue:number}>} rows
 * @returns {Array<{label:string, month:number, orders:number, revenue:number}>}
 */
function buildSalesSeries(rows = []) {
  const toMonthKey = (m) => {
    if (typeof m === "number") return m >= 1 && m <= 12 ? m : null;
    const idx = MONTHS.findIndex(
      (x) => x.label.toLowerCase() === String(m || "").slice(0, 3).toLowerCase()
    );
    return idx >= 0 ? idx + 1 : null;
  };
  const map = new Map();
  rows.forEach((r) => {
    const mk = toMonthKey(r?.month);
    if (!mk) return;
    const orders = Number(r?.orders ?? 0);
    const revenue = Number(r?.revenue ?? 0);
    map.set(mk, { month: mk, orders: Number.isFinite(orders) ? orders : 0, revenue: Number.isFinite(revenue) ? revenue : 0 });
  });
  return MONTHS.map(({ key, label }) => {
    const v = map.get(key) || { month: key, orders: 0, revenue: 0 };
    return { label, ...v };
  });
}

function KpiCard({ icon, title, value, subtitle }) {
  return (
    <Card sx={{ height: "100%", borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,.06)" }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{
            width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center",
            bgcolor: "primary.main", color: "primary.contrastText"
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">{title}</Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Admin analytics overview (KPIs, monthly sales, top products, category views, item views).
 */
export default function AdminAnalytics() {
  const [year, setYear] = React.useState(yearNow);

  // Queries
  const { data: sales, isFetching: loadingSales } = useAdminSalesStatsQuery(year);
  const { data: top, isFetching: loadingTop } = useAdminTopProductsQuery(10);
  const { data: catViews, isFetching: loadingCats } = useAdminCategoryViewsQuery();
  const { data: itemViews, isFetching: loadingItemViews } = useAdminItemViewsQuery(10);

  const salesRows = sales?.data || [];
  const topRows   = top?.data || [];
  const catRows   = catViews?.data || [];
  const itemRows  = itemViews?.data || [];

  const salesSeries = useMemo(() => buildSalesSeries(salesRows), [salesRows]);

  const totals = useMemo(() => {
    const revenue = salesSeries.reduce((s, r) => s + (r.revenue || 0), 0);
    const orders  = salesSeries.reduce((s, r) => s + (r.orders || 0), 0);
    const aov     = orders > 0 ? revenue / orders : 0;
    return { revenue, orders, aov };
  }, [salesSeries]);

  // ======================= NEW/REVISED LOGIC =======================
  // PRO: Clamp/step year safely; this prevents accidental invalid queries.
  const decYear = () => setYear((y) => Math.max(YEAR_MIN, y - 1));
  const incYear = () => setYear((y) => Math.min(YEAR_MAX, y + 1));

  // Skeleton row helper (unchanged behavior)
  const SkelRow = ({ cols }) => (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}><Skeleton height={20} /></TableCell>
      ))}
    </TableRow>
  );

  return (
    <PermGate any={["analytics:view"]} fallback={<Forbidden />}>
      <Box className="p-4">
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" sx={{ mb: 2, gap: 1 }}>
          <Typography variant="h5">Analytics</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={decYear} size="small" aria-label="Previous year"><ArrowBackIosNewIcon fontSize="inherit" /></IconButton>
            <TextField
              label="Year"
              type="number"
              size="small"
              value={year}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next)) setYear(Math.max(YEAR_MIN, Math.min(YEAR_MAX, next)));
              }}
              sx={{ width: 120 }}
              inputProps={{ min: YEAR_MIN, max: YEAR_MAX }}
            />
            <IconButton onClick={incYear} size="small" aria-label="Next year"><ArrowForwardIosIcon fontSize="inherit" /></IconButton>
          </Stack>
        </Stack>

        {/* KPI Row */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            {loadingSales ? (
              <Skeleton variant="rounded" height={96} />
            ) : (
              <KpiCard
                icon={<AttachMoneyIcon />}
                title="Revenue (YTD)"
                value={fmtCurrency(totals.revenue)}
                subtitle={`Average ${fmtCurrency(totals.revenue / Math.max(1, salesSeries.length))} / mo`}
              />
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            {loadingSales ? (
              <Skeleton variant="rounded" height={96} />
            ) : (
              <KpiCard
                icon={<LocalMallIcon />}
                title="Orders (YTD)"
                value={fmtCompact(totals.orders)}
                subtitle={`AOV ${fmtCurrency(totals.aov)}`}
              />
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            <KpiCard
              icon={<InsightsIcon />}
              title="Top Category (Views)"
              value={
                loadingCats
                  ? <Skeleton width={120} />
                  : (catRows[0]?.category ? `${catRows[0].category} • ${fmtCompact(catRows[0].views)} views` : "—")
              }
              subtitle={loadingCats ? <Skeleton width={80} /> : (catRows[0]?.items ? `${catRows[0].items} items` : "")}
            />
          </Grid>
        </Grid>

        {/* Sales Chart */}
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,.06)" }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6">Monthly Sales</Typography>
              <Chip size="small" label={`Year: ${year}`} />
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              {loadingSales ? (
                <Skeleton variant="rounded" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesSeries} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="revenue" tickFormatter={(v) => fmtCompact(v)} />
                    <YAxis yAxisId="orders" orientation="right" tickFormatter={(v) => fmtCompact(v)} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "revenue") return [fmtCurrency(value), "Revenue"];
                        if (name === "orders") return [value, "Orders"];
                        return [value, name];
                      }}
                      labelFormatter={(l) => `Month: ${l}`}
                    />
                    <Legend />
                    <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#1976d2" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                    <Line yAxisId="orders"  type="monotone" dataKey="orders"  name="Orders"  stroke="#2e7d32" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          {/* Top Products */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%", borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,.06)" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top Products (Qty)</Typography>
                <Box sx={{ height: 260, mb: 2 }}>
                  {loadingTop ? (
                    <Skeleton variant="rounded" height={260} />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topRows.map((r) => ({
                          title: r?.title || "(Untitled)",
                          qty: Number(r?.qty || 0),
                          revenue: Number(r?.revenue || 0)
                        }))}
                        margin={{ top: 10, right: 10, bottom: 10, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="title" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                        <YAxis tickFormatter={(v) => fmtCompact(v)} />
                        <Tooltip formatter={(v, n) => n === "revenue" ? [fmtCurrency(v), "Revenue"] : [v, "Qty"]} />
                        <Legend />
                        <Bar dataKey="qty" name="Qty" fill="#0288d1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingTop ? (
                      <>
                        <SkelRow cols={3} /><SkelRow cols={3} /><SkelRow cols={3} />
                      </>
                    ) : topRows.length ? (
                      topRows.map((r) => (
                        <TableRow key={r?.productId || r?.slug || r?.title}>
                          <TableCell>{r?.title || "(Untitled)"}</TableCell>
                          <TableCell align="right">{Number(r?.qty || 0)}</TableCell>
                          <TableCell align="right">{fmtCurrency(r?.revenue)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={3}>No data.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Views */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%", borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,.06)" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Category Views</Typography>
                <Box sx={{ height: 260, mb: 2 }}>
                  {loadingCats ? (
                    <Skeleton variant="rounded" height={260} />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={catRows.map((r) => ({
                          category: r?.category || "(Uncategorized)",
                          views: Number(r?.views || 0),
                          items: Number(r?.items || 0)
                        }))}
                        layout="vertical"
                        margin={{ top: 10, right: 10, bottom: 10, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => fmtCompact(v)} />
                        <YAxis type="category" dataKey="category" width={120} />
                        <Tooltip formatter={(v, n) => [fmtCompact(v), n === "views" ? "Views" : "Items"]} />
                        <Legend />
                        <Bar dataKey="views" name="Views" fill="#7b1fa2" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="items" name="Items" fill="#00897b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Views</TableCell>
                      <TableCell align="right">Items</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingCats ? (
                      <>
                        <SkelRow cols={3} /><SkelRow cols={3} /><SkelRow cols={3} />
                      </>
                    ) : catRows.length ? (
                      catRows.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{r?.category || "(Uncategorized)"}</TableCell>
                          <TableCell align="right">{Number(r?.views || 0)}</TableCell>
                          <TableCell align="right">{Number(r?.items || 0)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={3}>No data.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Item Views Table */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,.06)" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top Item Views</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Views</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingItemViews ? (
                      <>
                        <SkelRow cols={3} /><SkelRow cols={3} /><SkelRow cols={3} />
                      </>
                    ) : itemRows.length ? (
                      itemRows.map((r) => (
                        <TableRow key={r?._id || r?.slug || r?.title}>
                          <TableCell>{r?.title || "(Untitled)"}</TableCell>
                          <TableCell>{r?.category || "(Uncategorized)"}</TableCell>
                          <TableCell align="right">{Number(r?.viewCount || 0)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={3}>No data.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PermGate>
  );
}
