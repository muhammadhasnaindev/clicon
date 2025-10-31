/**
 * BannerWidgets
 * Summary: Home hero carousel + two right-side promo cards.

 */

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Link as RouterLink } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const BLUE = "#1B6392";
const ORANGE = "#FF6A00";
const PRICE_BLUE = "#2BA5F7";
const BG_LIGHT = "#F5F7F9";
const TEXT = "#191C1F";
const MUTED = "#5F6C72";

// NEW: centralize magic numbers
const AUTOPLAY_DELAY_MS = 4500;
const PAGINATION_BULLET_SIZE = 8;
const PRICE_BUBBLE_BORDER = 4;

const slides = [
  {
    eyebrow: "THE BEST PLACE TO PLAY",
    title: "Xbox Consoles",
    desc: "Save up to 50% on select Xbox games. Get 3 months of PC Game Pass for $2 USD.",
    img: "/uploads/xbox.png",
    price: "$299",
    to: "/shop?category=gaming-console",
  },
  {
    eyebrow: "WIRELESS FREEDOM",
    title: "Xbox Controller",
    desc: "Play across PC & console. Bluetooth + USB-C.",
    img: "/uploads/products/controller.png",
    price: "$59",
    to: "/shop?category=gaming-console",
  },
  {
    eyebrow: "4K ENTERTAINMENT",
    title: "Smart TV Deals",
    desc: "Stream your favorites in 4K HDR.",
    img: "/uploads/products/monitor.png",
    price: "$220",
    to: "/shop?category=tv-home",
  },
];

/**
 * Home banner with a Swiper carousel and two promos.
 */
export default function BannerWidgets() {
  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Respect user's motion preference.
   * - If reduced motion is requested, we disable autoplay entirely.
   * - Guarded for SSR so matchMedia is only read in browser.
   */
  const prefersNoMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1320,
        mx: "auto",
        mt: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, lg: 0 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: { xs: 2, lg: 3 },
          minHeight: { lg: 520 },
        }}
      >
        {/* LEFT: carousel */}
        <Box
          sx={{
            width: { lg: 700 },
            minHeight: { xs: 320, sm: 380, md: 440, lg: 520 },
            borderRadius: 1,
            overflow: "hidden",
            flex: { xs: "1 1 auto", lg: "0 0 auto" },
            bgcolor: BG_LIGHT,
          }}
        >
          <Box
            sx={{
              height: "100%",
              "& .swiper": { height: "100%" },
              "& .swiper-pagination": { bottom: 12 },
              "& .swiper-pagination-bullet": {
                width: PAGINATION_BULLET_SIZE,
                height: PAGINATION_BULLET_SIZE,
                background: "#C8CDD2",
                opacity: 1,
                mx: 0.5,
              },
              "& .swiper-pagination-bullet-active": { background: "#191C1F" },
            }}
          >
            <Swiper
              modules={[Autoplay, Pagination]}
              // NEW: conditional autoplay per reduced-motion
              autoplay={
                prefersNoMotion
                  ? false
                  : { delay: AUTOPLAY_DELAY_MS, disableOnInteraction: false }
              }
              pagination={{ clickable: true }}
              loop
            >
              {slides.map((s, i) => (
                <SwiperSlide key={i}>
                  <Box
                    sx={{
                      height: "100%",
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
                      alignItems: "center",
                      gap: { xs: 2, md: 3 },
                      px: { xs: 2, md: 4 },
                      py: { xs: 3, md: 4 },
                    }}
                  >
                    {/* copy */}
                    <Box sx={{ maxWidth: 420 }}>
                      <Typography
                        sx={{
                          color: BLUE,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".4px",
                          mb: 1,
                        }}
                      >
                        {s.eyebrow}
                      </Typography>
                      <Typography
                        sx={{
                          color: TEXT,
                          fontWeight: 800,
                          fontSize: { xs: 26, sm: 30, md: 36 },
                          lineHeight: 1.15,
                          mb: 1,
                        }}
                      >
                        {s.title}
                      </Typography>
                      <Typography sx={{ color: MUTED, fontSize: 14, maxWidth: 360, mb: 2 }}>
                        {s.desc}
                      </Typography>
                      <Button
                        component={RouterLink}
                        to={s.to}
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          backgroundColor: ORANGE,
                          color: "#fff",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          px: 3,
                          py: 1.25,
                          borderRadius: 1,
                          "&:hover": { backgroundColor: "#e65c00" },
                        }}
                      >
                        Shop Now
                      </Button>
                    </Box>

                    {/* image + price bubble */}
                    <Box sx={{ display: "grid", placeItems: "center", position: "relative" }}>
                      <Box
                        component="img"
                        src={s.img}
                        alt={s.title}
                        sx={{
                          width: "100%",
                          maxWidth: 420,
                          maxHeight: { xs: 220, sm: 260, md: 320, lg: 360 },
                          objectFit: "contain",
                        }}
                        loading="lazy"
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          top: -6,
                          right: { xs: 4, md: -6 },
                          width: { xs: 64, md: 84 },
                          height: { xs: 64, md: 84 },
                          borderRadius: "50%",
                          bgcolor: PRICE_BLUE,
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: { xs: 14, md: 18 },
                          display: { xs: "none", md: "flex" },
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 6px 16px rgba(43,165,247,.35)",
                          border: `${PRICE_BUBBLE_BORDER}px solid #fff`,
                        }}
                        // NEW: assistive text for SR users
                        aria-label={`From ${s.price}`}
                        title={`From ${s.price}`}
                      >
                        {s.price}
                      </Box>
                    </Box>
                  </Box>
                </SwiperSlide>
              ))}
            </Swiper>
          </Box>
        </Box>

        {/* RIGHT: two stacked cards */}
        <Box
          sx={{
            width: { lg: 424 },
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, lg: 3 },
            flex: { xs: "1 1 auto", lg: "0 0 auto" },
          }}
        >
          {/* Top dark card */}
          <Box
            sx={{
              minHeight: 220,
              borderRadius: 1,
              bgcolor: "#191C1F",
              color: "#fff",
              position: "relative",
              p: { xs: 2, md: 2.5 },
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                bgcolor: "#EBC80C",
                color: "#191C1F",
                fontWeight: 800,
                fontSize: 12,
                px: 1,
                py: 0.5,
                borderRadius: "4px",
              }}
              aria-label="29 percent off"
            >
              29% OFF
            </Box>

            <Typography
              sx={{
                color: "#EBC80C",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: ".4px",
                mb: 1,
                textTransform: "uppercase",
              }}
            >
              SUMMER SALES
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 2 }}>
              New Google Pixel 6 Pro
            </Typography>
            <Button
              component={RouterLink}
              to="/shop?category=smartphone"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                backgroundColor: ORANGE,
                color: "#fff",
                textTransform: "uppercase",
                fontWeight: 800,
                px: 2,
                py: 1,
                borderRadius: 1,
                "&:hover": { backgroundColor: "#e65c00" },
              }}
            >
              Shop Now
            </Button>

            <Box
              component="img"
              src="/uploads/pixel.png"
              alt="Google Pixel 6 Pro"
              sx={{
                position: "absolute",
                right: 12,
                bottom: 8,
                height: { xs: 160, md: 205 },
                objectFit: "contain",
              }}
              loading="lazy"
            />
          </Box>

          {/* Bottom light card */}
          <Box
            sx={{
              minHeight: 220,
              borderRadius: 1,
              bgcolor: BG_LIGHT,
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1.2fr", sm: "auto 1fr" },
              alignItems: "center",
              gap: 2,
              p: { xs: 2, md: 4 },
            }}
          >
            <Box
              component="img"
              src="/uploads/flipbuds.png"
              alt="Xiaomi FlipBuds Pro"
              sx={{ height: { xs: 120, md: 200 }, objectFit: "contain", justifySelf: "center" }}
              loading="lazy"
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: TEXT, fontWeight: 800, fontSize: 16, mb: 0.5 }}>
                Xiaomi FlipBuds Pro
              </Typography>
              <Typography sx={{ color: "#2BA5F7", fontWeight: 800, fontSize: 14, mb: 1 }}>
                $299 USD
              </Typography>
              <Button
                component={RouterLink}
                to="/shop?category=computer-accessories&subcategory=Headphone"
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  backgroundColor: ORANGE,
                  color: "#fff",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  "&:hover": { backgroundColor: "#e65c00" },
                }}
              >
                Shop Now
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
