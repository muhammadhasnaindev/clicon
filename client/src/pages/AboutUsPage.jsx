/**
 * AboutUsPage
 * Short: Marketing "About" with hero, team grid, banner, flash groups, and newsletter.

 */

import React from "react";
import { Box, Grid, Typography, Stack } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";

import { useGetAboutQuery } from "../store/api/aboutApi";
import { useGetHomeSectionsQuery } from "../store/api/apiSlice";

import FlashSaleToday from "../features/home/FlashSaleToday";
import Newsletter from "../features/home/Newsletter";
import { assetUrl } from "../utils/asset";

const BLUE = "#2DA5F3";
const ORANGE = "#FA8232";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";

/**
 * TeamCard
 * Lightweight card for a team member.
 */
function TeamCard({ person }) {
  // === [NEW LOGIC - 2025-10-25]: null-safe person fields
  // PRO: Avoid runtime errors if API sends partial rows.
  //      Provide sensible fallbacks for avatar src and alt text.
  const avatar = assetUrl(person?.avatarUrl || "/uploads/placeholder.png");
  const name = person?.name || "Team Member";
  const title = person?.title || "";

  return (
    <Box
      sx={{
        p: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        bgcolor: "#fff",
      }}
    >
      <Box
        component="img"
        src={avatar}
        alt={name}
        loading="lazy"
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
        onError={(e) => (e.currentTarget.src = assetUrl("/uploads/placeholder.png"))}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: DARK, lineHeight: 1.2 }}>
          {name}
        </Typography>
        {title ? <Typography sx={{ fontSize: 12.5, color: MUTED }}>{title}</Typography> : null}
      </Box>
    </Box>
  );
}

/**
 * AboutUsPage
 * Marketing about page showing hero + team + banner + flash groups + newsletter.
 */
export default function AboutUsPage() {
  const { data: about, isLoading: loadingAbout } = useGetAboutQuery();
  const { data: home, isLoading: loadingHome } = useGetHomeSectionsQuery();

  // === [NEW LOGIC - 2025-10-25]: safe hero defaults
  // PRO: Prevents undefined text rendering; keeps layout stable.
  const hero = about?.hero || {};
  const heroBadge = hero.badge || "WHO WE ARE";
  const heroTitle = hero.title || "About our company";
  const heroSubtitle = hero.subtitle || "";

  const team = about?.team || [];

  const flashGroups = {
    flashSale: home?.flash?.flashSale || [],
    bestSellers: home?.flash?.bestSellers || [],
    topRated: home?.flash?.topRated || [],
    newArrival: home?.flash?.newArrival || [],
  };

  return (
    <Box sx={{ bgcolor: "#F8F9FA" }}>
      {/* HERO */}
      <Box sx={{ px: { xs: 2, md: 8 }, py: { xs: 6, md: 8 }, bgcolor: "#fff" }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: "inline-block",
                px: 1.25,
                py: 0.5,
                bgcolor: BLUE,
                color: "white",
                fontWeight: 800,
                fontSize: 11,
                borderRadius: "4px",
                mb: 1.5,
              }}
            >
              {heroBadge}
            </Box>

            <Typography sx={{ fontSize: 26, fontWeight: 800, color: DARK, mb: 1.25 }}>
              {heroTitle}
            </Typography>

            {heroSubtitle ? (
              <Typography sx={{ color: MUTED, fontSize: 14, lineHeight: 1.8, mb: 2 }}>
                {heroSubtitle}
              </Typography>
            ) : null}

            <Stack spacing={1.2} sx={{ mb: { xs: 3, md: 0 } }}>
              {(hero.bullets || []).map((b, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleOutlineIcon sx={{ color: "#22C55E", fontSize: 18 }} />
                  <Typography sx={{ color: DARK, fontSize: 13.5 }}>{b}</Typography>
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              component="img"
              src={assetUrl(hero.imageUrl || "/uploads/about/hero.jpg")}
              alt="About hero"
              loading="lazy"
              sx={{
                width: "100%",
                height: { xs: 260, md: 360 },
                objectFit: "cover",
                borderRadius: "14px",
                boxShadow: "0 16px 40px rgba(0,0,0,.06)",
              }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* TEAM */}
      <Box sx={{ px: { xs: 2, md: 8 }, py: { xs: 6, md: 8 }, bgcolor: "#fff", mt: 2 }}>
        <Typography sx={{ textAlign: "center", fontWeight: 800, fontSize: 18, color: DARK, mb: 3 }}>
          Our core team member
        </Typography>

        <Grid container spacing={2.5}>
          {(loadingAbout ? Array.from({ length: 8 }) : team).slice(0, 8).map((p, idx) => (
            <Grid key={p?._id || p?.id || idx} item xs={12} sm={6} md={3}>
              {p ? (
                <TeamCard person={p} />
              ) : (
                <Box
                  sx={{
                    p: 2,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "10px",
                    height: 80,
                    bgcolor: "#fff",
                  }}
                />
              )}
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Banner */}
      <Box sx={{ mt: 2, px: { xs: 2, md: 8 }, py: { xs: 4, md: 5 } }}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "14px",
            minHeight: 260,
            background: `${`url(${assetUrl("/uploads/about/devices-banner.jpg")})`} center/cover no-repeat, linear-gradient(#eee,#ddd)`,
          }}
        >
          <Box sx={{ position: "absolute", left: 120, top: 54, maxWidth: 380 }}>
            <Typography sx={{ color: "black", fontWeight: 800, fontSize: 18, mb: 1.25 }}>
              Your trusted and<br /> reliable retail shop
            </Typography>
            <Typography sx={{ color: "black", fontSize: 13.5, lineHeight: 1.7 }}>
              Praesent sed semper metus. Nunc aliquet dolor <br />mauris, et fringilla elit gravida eget.
              Nunc<br /> consequat auctor urna a placerat.
            </Typography>
          </Box>

          <Box
            sx={{
              position: "absolute",
              left: 114,
              bottom: 24,
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: ORANGE,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 10px 24px rgba(0,0,0,.18)",
            }}
            aria-label="Play"
            role="button"
          >
            <PlayArrowRoundedIcon />
          </Box>
        </Box>
      </Box>

      {/* 4 columns */}
      <FlashSaleToday loading={loadingHome} groups={flashGroups} />

      {/* Newsletter */}
      <Newsletter />
    </Box>
  );
}
