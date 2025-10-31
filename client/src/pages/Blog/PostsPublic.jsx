// src/pages/25/BlogPage.jsx
/**
 * BlogPage — public blog listing with search/sort, categories, and side widgets.
 
 */

import React, { useMemo } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Button,
  Chip,
  Divider,
  Stack,
  Pagination,
  Link as MuiLink,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Link, useSearchParams } from "react-router-dom";
import { useGetPublicPostsQuery } from "../../store/api/apiSlice";

const ORANGE = "#FA8232";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";

const PAGE_SIZE = 6;

const BLOG_CATEGORIES = [
  "All",
  "Electronics Devices",
  "Computer & Laptop",
  "Computer Accessories",
  "SmartPhone",
  "Headphone",
  "Mobile Accessories",
  "Gaming Console",
  "Camera & Photo",
];

const POPULAR_TAGS = [
  "Game",
  "iPhone",
  "TV",
  "Asus Laptops",
  "Macbook",
  "SSD",
  "Graphics Card",
  "Power Bank",
  "Smart TV",
  "Speaker",
  "Tablet",
  "Microwave",
  "Samsung",
];

const strip = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const excerpt = (html = "", words = 28) => {
  const s = strip(html);
  const parts = s.split(" ");
  return parts.length > words ? parts.slice(0, words).join(" ") + "…" : s;
};
const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
const fakeViews = (p) => {
  if (typeof p.views === "number") return p.views;
  const base = Number(new Date(p.createdAt || p.updatedAt || Date.now())) / 1000;
  return 700 + Math.floor((base % 1) * 300);
};

/**
 * BlogPage component
 * @returns {JSX.Element}
 */
export default function BlogPage() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const search = sp.get("q") || "";
  const category = sp.get("category") || "All";
  const sort = sp.get("sort") || "popular";

  // pass search + category to server
  const serverQ = [search, category && category !== "All" ? category : ""].filter(Boolean).join(" ");

  const { data, isFetching } = useGetPublicPostsQuery(
    { page, limit: PAGE_SIZE, q: serverQ },
    { refetchOnMountOrArgChange: true }
  );

  const rows = useMemo(() => {
    const rs = (data?.data || []).slice();
    if (sort === "title") rs.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (sort === "oldest") rs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sort === "newest") rs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === "popular") rs.sort((a, b) => fakeViews(b) - fakeViews(a));
    return rs;
  }, [data, sort]);

  const meta = data?.meta || { totalPages: 1, page };

  const latest = useMemo(
    () =>
      [...(data?.data || [])]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 4),
    [data]
  );
  const gallery = useMemo(() => {
    const imgs = [];
    (data?.data || []).forEach((p) =>
      (p.media || []).forEach((m) => {
        if (m.type === "image" && imgs.length < 8) imgs.push(m.url);
      })
    );
    return imgs;
  }, [data]);

  const write = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    if ("q" in patch || "category" in patch || "sort" in patch) next.set("page", "1");
    setSp(next);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 0 }, py: 3 }}>
      <Grid container spacing={3}>
        {/* ============== LEFT SIDEBAR ============== */}
        <Grid item xs={12} md={3}>
          {/* CATEGORY */}
          <Card sx={{ border: `1px solid ${BORDER}`, mb: 2 }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 12, color: MUTED, mb: 1 }}>CATEGORY</Typography>
              <Stack spacing={1}>
                {BLOG_CATEGORIES.map((c) => {
                  const active = c === category;
                  return (
                    <Button
                      key={c}
                      onClick={() => write({ category: c === "All" ? "" : c })}
                      sx={{
                        justifyContent: "flex-start",
                        textTransform: "none",
                        color: active ? ORANGE : DARK,
                        fontWeight: active ? 800 : 500,
                        border: active ? `1px solid ${ORANGE}` : `1px solid ${BORDER}`,
                        bgcolor: active ? "rgba(250,130,50,.06)" : "#fff",
                        borderRadius: 1.5,
                        px: 1.25,
                        py: 0.75,
                        "&:hover": { borderColor: ORANGE },
                      }}
                    >
                      {c}
                    </Button>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          {/* LATEST BLOG */}
          <Card sx={{ border: `1px solid ${BORDER}`, mb: 2 }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 12, color: MUTED, mb: 1 }}>LATEST BLOG</Typography>
              <Stack spacing={1.5}>
                {latest.map((p) => {
                  const thumb = (p.media || []).find((m) => m.type === "image")?.url;
                  return (
                    <Stack key={p._id} direction="row" spacing={1}>
                      <Box
                        component="img"
                        src={thumb}
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = "none")}
                        sx={{ width: 64, height: 48, objectFit: "cover", borderRadius: 1, border: `1px solid ${BORDER}` }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <MuiLink
                          component={Link}
                          to={`/blog/${p._id}`}
                          underline="hover"
                          sx={{ color: DARK, fontWeight: 700, fontSize: 13, display: "block" }}
                        >
                          {p.title}
                        </MuiLink>
                        <Typography sx={{ fontSize: 12, color: MUTED }}>{fmtDate(p.createdAt)}</Typography>
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          {/* GALLERY */}
          <Card sx={{ border: `1px solid ${BORDER}`, mb: 2 }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 12, color: MUTED, mb: 1 }}>GALLERY</Typography>
              <Grid container spacing={1}>
                {gallery.map((src, i) => (
                  <Grid item xs={4} key={`${src}-${i}`}>
                    <Box
                      component="img"
                      src={src}
                      alt=""
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      sx={{
                        width: "100%",
                        height: 64,
                        objectFit: "cover",
                        borderRadius: 1,
                        border: `1px solid ${BORDER}`,
                      }}
                    />
                  </Grid>
                ))}
                {!gallery.length && (
                  <Grid item xs={12}>
                    <Typography sx={{ color: MUTED, fontSize: 13 }}>No images yet.</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* POPULAR TAG */}
          <Card sx={{ border: `1px solid ${BORDER}` }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 12, color: MUTED, mb: 1 }}>POPULAR TAG</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {POPULAR_TAGS.map((t) => {
                  const active = new RegExp(`\\b${t}\\b`, "i").test(search);
                  return (
                    <Chip
                      key={t}
                      label={t}
                      onClick={() => {
                        const toks = new Set((search.match(/\w[\w\s&+-]*/g) || []).map((x) => x.trim()));
                        active ? toks.delete(t) : toks.add(t);
                        const nextQ = Array.from(toks).filter(Boolean).join(" ");
                        write({ q: nextQ || "" });
                      }}
                      sx={{
                        height: 28,
                        px: 1.25,
                        borderRadius: "8px",
                        border: active ? `1.5px solid ${ORANGE}` : `1.5px solid ${BORDER}`,
                        bgcolor: active ? "rgba(250,130,50,.08)" : "#fff",
                        color: active ? ORANGE : "#344054",
                        fontWeight: active ? 700 : 500,
                        "&:hover": { borderColor: ORANGE },
                      }}
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ============== MAIN LIST ============== */}
        <Grid item xs={12} md={9}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="Search…"
              value={search}
              onChange={(e) => write({ q: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: MUTED }} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 260, bgcolor: "#fff" }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ color: MUTED, fontSize: 13 }}>Sort by:</Typography>
              <Select
                size="small"
                value={sort}
                onChange={(e) => write({ sort: e.target.value })}
                sx={{ minWidth: 160, bgcolor: "#fff" }}
              >
                <MenuItem value="popular">Most Popular</MenuItem>
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="oldest">Oldest</MenuItem>
                <MenuItem value="title">Title A–Z</MenuItem>
              </Select>
            </Box>
          </Box>

          <Grid container spacing={2.5}>
            {rows.map((p) => {
              const img = (p.media || []).find((m) => m.type === "image")?.url;
              return (
                <Grid key={p._id} item xs={12} md={6}>
                  <Card sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, overflow: "hidden" }}>
                    {img && <CardMedia component="img" src={img} alt="" sx={{ height: 220, objectFit: "cover" }} />}

                    <CardContent sx={{ p: 2.25 }}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: MUTED }}>
                          <PersonOutlineIcon sx={{ fontSize: 18 }} />
                          <Typography sx={{ fontSize: 12 }}>{p.authorName || p.authorEmail || "Cameron"}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: MUTED }}>
                          <EventOutlinedIcon sx={{ fontSize: 18 }} />
                          <Typography sx={{ fontSize: 12 }}>{fmtDate(p.createdAt)}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: MUTED }}>
                          <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                          <Typography sx={{ fontSize: 12 }}>{fakeViews(p)}</Typography>
                        </Stack>
                      </Stack>

                      <Typography
                        component={Link}
                        to={`/blog/${p._id}`}
                        sx={{
                          textDecoration: "none",
                          color: DARK,
                          fontWeight: 800,
                          display: "block",
                          mb: 1,
                          "&:hover": { color: ORANGE },
                        }}
                      >
                        {p.title}
                      </Typography>

                      <Typography sx={{ color: MUTED, mb: 1.25 }}>{excerpt(p.content)}</Typography>

                      <Button
                        size="small"
                        component={Link}
                        to={`/blog/${p._id}`}
                        variant="outlined"
                        sx={{
                          borderColor: ORANGE,
                          color: ORANGE,
                          fontWeight: 800,
                          textTransform: "none",
                          "&:hover": { borderColor: ORANGE, bgcolor: "rgba(250,130,50,.06)" },
                        }}
                      >
                        READ MORE
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}

            {!rows.length && (
              <Grid item xs={12}>
                <Card sx={{ border: `1px solid ${BORDER}` }}>
                  <CardContent>
                    <Typography sx={{ color: MUTED }}>
                      {isFetching ? "Loading posts…" : "No posts found."}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />
          {meta?.totalPages > 1 && (
            <Stack direction="row" alignItems="center" justifyContent="center">
              <Pagination
                count={meta.totalPages}
                page={meta.page}
                onChange={(_e, p) => write({ page: String(p) })}
                color="primary"
                sx={{ "& .MuiPaginationItem-root": { borderRadius: "50%" } }}
              />
            </Stack>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
