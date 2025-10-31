// src/pages/26/BlogDetailPage.jsx
/**
 * BlogDetailPage — public blog post detail with sidebar, comments, and share.

 */

import React, { useMemo, useState } from "react";
import {
  Box, Grid, Typography, IconButton, Button, Paper, TextField,
  Avatar, Stack, Snackbar, Alert, Card
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import PinterestIcon from "@mui/icons-material/Pinterest";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  useGetPublicPostQuery,
  useGetPublicPostsQuery,
  useGetPostCommentsQuery,
  useAddPostCommentMutation,
} from "../../store/api/apiSlice";

const ORANGE = "#FA8232";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";

/** Pulling magic numbers into named constants. */
const LATEST_COUNT = 4;
const GALLERY_MAX = 9;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "";

/** Soft email sanity check (not strict; just catch obvious typos). */
// ===== NEW LOGIC: Email sanity check =====
// PRO: avoid posting comments with obviously invalid emails without blocking rare-valid formats.
const emailLooksOk = (v) => !!String(v || "").trim().match(/.+@.+\..+/);

export default function BlogDetailPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  // local state for sidebar search (so Enter works)
  const [keyword, setKeyword] = useState(sp.get("q") || "");

  // post
  const { data: postData, isLoading, isError } = useGetPublicPostQuery(id);
  const post = postData?.data || postData || null;

  // side data
  const { data: pagePosts } = useGetPublicPostsQuery({ page: 1, limit: 20, q: "" });
  const latest = useMemo(
    () => (pagePosts?.data || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, LATEST_COUNT),
    [pagePosts]
  );
  const gallery = useMemo(() => {
    const imgs = [];
    (pagePosts?.data || []).forEach((p) =>
      (p.media || []).forEach((m) => {
        if (m.type === "image" && imgs.length < GALLERY_MAX) imgs.push(m.url);
      })
    );
    return imgs;
  }, [pagePosts]);

  // comments
  const { data: commentsData, refetch: refetchComments, isFetching: fetchingComments } =
    useGetPostCommentsQuery(id, { skip: !id });
  const comments = commentsData?.data || [];
  const [addComment, { isLoading: posting }] = useAddPostCommentMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");

  const hero = (post?.media || []).find((m) => m.type === "image")?.url;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = (keyword || "").trim();
    navigate(q ? `/blog?q=${encodeURIComponent(q)}` : "/blog");
  };

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setToast("Please fill your name, email and comment.");
      return;
    }
    // ===== NEW LOGIC: Email sanity check (client-side) =====
    // PRO: improves data quality; server still validates.
    if (!emailLooksOk(email)) {
      setToast("Please provide a valid email address.");
      return;
    }
    try {
      await addComment({ id, name, email, comment: message }).unwrap();
      setName(""); setEmail(""); setMessage("");
      setToast("Comment posted");
      refetchComments();
    } catch (e) {
      setToast(e?.data?.message || "Failed to post comment");
    }
  };

  if (isLoading) return <Box sx={{ p: 3 }}>Loading…</Box>;
  if (isError || !post) return <Box sx={{ p: 3 }}>Post not found.</Box>;

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 0 }, py: 3, bgcolor: "#F9FAFB" }}>
      <Grid container spacing={4}>
        {/* ================= MAIN ================= */}
        <Grid item xs={12} md={8}>
          <Box>
            {/* HERO (top, full width like Figma) */}
            {hero && (
              <Box
                component="img"
                src={hero}
                alt=""
                sx={{
                  width: "100%",
                  height: { xs: 220, md: 420 },
                  objectFit: "cover",
                  borderRadius: 2,
                  mb: 3,
                  background: "#fff",
                }}
              />
            )}

            {/* META */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, color: MUTED, flexWrap: "wrap" }}>
              {(post.authorName || post.authorEmail) && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <PersonOutlineIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: 12 }}>{post.authorName || post.authorEmail}</Typography>
                </Stack>
              )}
              {post.createdAt && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <EventOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: 12 }}>{fmtDate(post.createdAt)}</Typography>
                </Stack>
              )}
              {typeof post.views === "number" && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: 12 }}>{post.views}</Typography>
                </Stack>
              )}
            </Stack>

            {/* TITLE */}
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: DARK }}>
              {post.title}
            </Typography>

            {/* SHARE */}
            <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
              {[FacebookIcon, TwitterIcon, LinkedInIcon, PinterestIcon].map((Icon, i) => (
                <IconButton
                  key={i}
                  size="small"
                  sx={{ bgcolor: "#E5E7EB", "&:hover": { bgcolor: "#D1D5DB" } }}
                  onClick={() => {
                    // ===== NEW LOGIC: Safe share open =====
                    // PRO: avoids SSR crashes and handles popup blockers gracefully.
                    if (typeof window === "undefined") return;
                    const url = encodeURIComponent(window.location.href);
                    const text = encodeURIComponent(post.title || "");
                    const open = (u) => {
                      const w = window.open(u, "_blank", "noopener,noreferrer");
                      if (!w) setToast("Popup blocked by browser.");
                    };
                    if (Icon === FacebookIcon) open(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
                    if (Icon === TwitterIcon) open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`);
                    if (Icon === LinkedInIcon) open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
                    if (Icon === PinterestIcon) open(`https://pinterest.com/pin/create/button/?url=${url}&description=${text}`);
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Box>

            {/* CONTENT (from GrapesJS) — plus Figma-styled blockquote */}
            {post.content && (
              <Card
                sx={{
                  p: { xs: 1.5, md: 2 },
                  mb: 3,
                  "& :where(p,ul,ol)": { color: "#111", lineHeight: 1.75, mb: 1.5 },
                  "& h1,& h2,& h3": { fontWeight: 800, mt: 2, mb: 1 },
                  "& blockquote": {
                    background: "rgba(250,130,50,.08)",
                    borderLeft: `4px solid ${ORANGE}`,
                    borderRadius: 2,
                    p: 2,
                    m: 0,
                    color: DARK,
                    fontStyle: "normal",
                  },
                  "& img": { maxWidth: "100%", borderRadius: 8 },
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </Card>
            )}

            {/* EXTRA IMAGES (optional, like Figma two-up) */}
            {(post.media || []).filter((m) => m.type === "image").slice(1, 3).length > 0 && (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {(post.media || [])
                  .filter((m) => m.type === "image")
                  .slice(1, 3)
                  .map((m, i) => (
                    <Grid key={i} item xs={12} sm={6}>
                      <Box
                        component="img"
                        src={m.url}
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = "none")}
                        sx={{ width: "100%", height: 280, objectFit: "cover", borderRadius: 2 }}
                      />
                    </Grid>
                  ))}
              </Grid>
            )}

            {/* COMMENTS LIST */}
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 3, mb: 2 }}>
              {fetchingComments ? "Loading comments…" : `${comments.length} Comments`}
            </Typography>
            <Box>
              {comments.map((c) => (
                <Box key={c._id} sx={{ display: "flex", gap: 1.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
                  <Avatar sx={{ width: 40, height: 40 }}>{(c.name || "U").slice(0, 1).toUpperCase()}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontWeight: 700 }}>{c.name || "User"}</Typography>
                      <Typography sx={{ color: MUTED, fontSize: 12 }}>{fmtDate(c.createdAt)}</Typography>
                    </Stack>
                    <Typography sx={{ mt: 0.5 }}>{c.comment}</Typography>
                  </Box>
                </Box>
              ))}
              {!comments.length && !fetchingComments && (
                <Typography sx={{ color: MUTED }}>No comments yet. Be the first to comment!</Typography>
              )}
            </Box>

            {/* COMMENT FORM */}
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 4, mb: 1 }}>
              Leave a Comment
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Full Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Your comment…" value={message} onChange={(e) => setMessage(e.target.value)} multiline minRows={4} />
              </Grid>
              <Grid item xs={12}>
                <Button
                  onClick={onSubmit}
                  disabled={posting}
                  variant="contained"
                  sx={{ bgcolor: ORANGE, fontWeight: 800, textTransform: "none", "&:hover": { bgcolor: "#E7712F" } }}
                >
                  {posting ? "Posting…" : "Post Comment"}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* ================= SIDEBAR ================= */}
        <Grid item xs={12} md={4}>
          <Box sx={{ position: { md: "sticky" }, top: 88 }}>
            {/* Search (form so Enter works) */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${BORDER}` }}>
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8 }}>
                <TextField
                  fullWidth
                  placeholder="Search…"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  size="small"
                />
                <IconButton type="submit" size="small" aria-label="search">
                  <SearchIcon />
                </IconButton>
              </form>
            </Paper>

            {/* Latest */}
            {!!latest.length && (
              <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontWeight: 800, fontSize: 12, color: MUTED, mb: 1 }}>LATEST BLOG</Typography>
                <Stack spacing={1.25}>
                  {latest.map((p) => {
                    const thumb = (p.media || []).find((m) => m.type === "image")?.url;
                    return (
                      <Stack key={p._id} direction="row" spacing={1}>
                        {thumb && (
                          <Box
                            component="img"
                            src={thumb}
                            alt=""
                            onError={(e) => (e.currentTarget.style.display = "none")}
                            sx={{ width: 64, height: 48, objectFit: "cover", borderRadius: 1, border: `1px solid ${BORDER}` }}
                          />
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography component={Link} to={`/blog/${p._id}`} sx={{ color: DARK, fontWeight: 700, fontSize: 13, textDecoration: "none", "&:hover": { color: ORANGE } }}>
                            {p.title}
                          </Typography>
                          {p.createdAt && <Typography sx={{ fontSize: 12, color: MUTED }}>{fmtDate(p.createdAt)}</Typography>}
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </Paper>
            )}

            {/* Gallery */}
            {!!gallery.length && (
              <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontWeight: 800, fontSize: 12, color: MUTED, mb: 1 }}>GALLERY</Typography>
                <Grid container spacing={1}>
                  {gallery.map((src, i) => (
                    <Grid key={`${src}-${i}`} item xs={4}>
                      <Box
                        component="img"
                        src={src}
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = "none")}
                        sx={{ width: "100%", height: 64, objectFit: "cover", borderRadius: 1, border: `1px solid ${BORDER}` }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={!!toast} autoHideDuration={1600} onClose={() => setToast("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="info" variant="filled" onClose={() => setToast("")}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
