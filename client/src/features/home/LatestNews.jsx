/**
 * LatestNews
 * Summary: Fetches public posts and shows 3 cards with meta + excerpt; falls back to static list.

 */

import React, { useMemo } from "react";
import { Box, Typography, Grid, Card, CardMedia, CardContent, Button, Stack, Skeleton } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Link } from "react-router-dom";
import { assetUrl } from "../../utils/asset";
import { useGetPublicPostsQuery } from "../../store/api/apiSlice";

const ORANGE = "#FA8232";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";
const CARD_MEDIA_HEIGHT = 188;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "";

const strip = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const excerpt = (html = "", words = 28) => {
  const s = strip(html);
  const parts = s.split(" ");
  return parts.length > words ? parts.slice(0, words).join(" ") + "…" : s;
};

function MetaItem({ icon, children }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "#FFF1E6",
          border: `1px solid ${ORANGE}22`,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ color: MUTED, fontSize: 12 }}>{children}</Typography>
    </Stack>
  );
}

const fallback = [
  {
    _id: "f1",
    image: "/uploads/watch.png",
    authorName: "Kristin",
    createdAt: "2013-12-19T00:00:00Z",
    commentsCount: 453,
    title: "Cras nisl dolor, accumsan et metus sit amet, vulputate condimentum dolor.",
    content:
      "Maecenas scelerisque, arcu quis tempus egestas, ligula diam molestie lectus, tincidunt malesuada arcu metus posuere metus.",
  },
  {
    _id: "f2",
    image: "/uploads/motherboard.png",
    authorName: "Robert",
    createdAt: "2015-11-28T00:00:00Z",
    commentsCount: 738,
    title: "Curabitur pulvinar aliquam lectus, non blandit erat mattis vitae.",
    content:
      "Mauris scelerisque odio id rutrum volutpat. Pellentesque urna odio, vulputate at tortor vitae, hendrerit blandit lorem.",
  },
  {
    _id: "f3",
    image: "/uploads/phone.png",
    authorName: "Arlene",
    createdAt: "2014-05-09T00:00:00Z",
    commentsCount: 826,
    title: "Curabitur massa orci, consectetur et blandit ac, auctor et tellus.",
    content:
      "Pellentesque vestibulum lorem vel gravida aliquam. Morbi porta, odio id suscipit mattis, risus augue condimentum purus.",
  },
];

/**
 * Render latest 3 news posts (skeletons during first load).
 */
export default function LatestNews() {
  const { data, isFetching } = useGetPublicPostsQuery({ page: 1, limit: 3, q: "" });
  const posts = useMemo(() => (data?.data || []).slice(0, 3), [data]);
  const items = posts.length ? posts : fallback;
  const list = isFetching && !posts.length ? Array.from({ length: 3 }) : items;

  return (
    <Box sx={{ px: { xs: 2, md: 0 }, py: { xs: 4, md: 6 }, bgcolor: "#F5F7F9", maxWidth: 1320, mx: "auto" }}>
      <Typography sx={{ textAlign: "center", fontWeight: 900, fontSize: { xs: 22, md: 26 }, color: DARK, mb: 3 }}>
        Latest News
      </Typography>

      <Grid container spacing={3}>
        {list.map((post, idx) => {
          const isSkeleton = !post;
          const id = post?._id || post?.id || String(idx);

          /* ========================= NEW/REVISED LOGIC =========================
           * PRO: Safer media pick: prefer first image media, then legacy `image`, else empty.
           */
          const firstImg = post?.media?.find?.((m) => m?.type === "image")?.url || post?.image || "";
          const image = firstImg ? assetUrl(firstImg) : "";

          const author = post?.authorName || post?.authorEmail || "—";
          const date = fmtDate(post?.createdAt || post?.updatedAt);
          const comments =
            typeof post?.commentsCount === "number"
              ? post.commentsCount
              : Array.isArray(post?.comments)
              ? post.comments.length
              : post?.meta?.comments ?? "—";
          const title = post?.title || "Untitled";
          const desc = post?.content ? excerpt(post.content) : post?.description || "";

          return (
            <Grid item xs={12} md={4} key={id}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 2,
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 10px 30px rgba(0,0,0,.06)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  bgcolor: "#fff",
                }}
              >
                {isSkeleton ? (
                  <Skeleton variant="rectangular" height={CARD_MEDIA_HEIGHT} />
                ) : (
                  <CardMedia component="img" image={image} alt={title} loading="lazy" sx={{ height: CARD_MEDIA_HEIGHT, objectFit: "cover" }} />
                )}

                <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5, flexWrap: "wrap" }}>
                    {isSkeleton ? (
                      <>
                        <Skeleton width={80} height={16} />
                        <Skeleton width={90} height={16} />
                        <Skeleton width={40} height={16} />
                      </>
                    ) : (
                      <>
                        <MetaItem icon={<PersonOutlineIcon sx={{ color: ORANGE, fontSize: 12 }} />}>{author}</MetaItem>
                        <MetaItem icon={<CalendarTodayIcon sx={{ color: ORANGE, fontSize: 12 }} />}>{date}</MetaItem>
                        <MetaItem icon={<ChatBubbleOutlineIcon sx={{ color: ORANGE, fontSize: 12 }} />}>{comments}</MetaItem>
                      </>
                    )}
                  </Stack>

                  {isSkeleton ? (
                    <Skeleton height={28} sx={{ mb: 1 }} />
                  ) : (
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: 16,
                        color: DARK,
                        lineHeight: 1.4,
                        mb: 1,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                      title={title}
                    >
                      {title}
                    </Typography>
                  )}

                  {isSkeleton ? (
                    <>
                      <Skeleton height={18} />
                      <Skeleton height={18} width="80%" sx={{ mb: 2.25 }} />
                    </>
                  ) : (
                    <Typography
                      sx={{
                        color: MUTED,
                        fontSize: 14,
                        lineHeight: 1.6,
                        mb: 2.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {desc}
                    </Typography>
                  )}

                  {isSkeleton ? (
                    <Skeleton width={120} height={32} sx={{ borderRadius: 1 }} />
                  ) : (
                    <Button
                      component={Link}
                      to={`/blog/${id}`}
                      variant="outlined"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                      sx={{
                        mt: "auto",
                        alignSelf: "flex-start",
                        height: 32,
                        px: 1.75,
                        borderColor: ORANGE,
                        color: ORANGE,
                        fontWeight: 800,
                        fontSize: 12,
                        textTransform: "uppercase",
                        "&:hover": { borderColor: ORANGE, bgcolor: "#FFF5EE" },
                      }}
                      aria-label={`Read more: ${title}`}
                    >
                      Read More
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
