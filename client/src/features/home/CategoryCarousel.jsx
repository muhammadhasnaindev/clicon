/**
 * CategoryCarousel
 * Summary: Category tiles in a Swiper carousel with optional remote fetch fallback.

 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, IconButton, Skeleton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import "swiper/css";
import "swiper/css/navigation";

const assetUrl = (p) =>
  typeof p === "string" && p ? p : "/uploads/placeholder.png";

const FALLBACK = [
  { name: "Computer & Laptop", image: "/uploads/categories/computer.png" },
  { name: "SmartPhone", image: "/uploads/categories/smartphone.png" },
  { name: "Headphones", image: "/uploads/categories/headphones.png" },
  { name: "Accessories", image: "/uploads/categories/accessories.png" },
  { name: "Camera & Photo", image: "/uploads/categories/camera.png" },
  { name: "TV & Homes", image: "/uploads/categories/tv.png" },
];

/**
 * Carousel of categories. If `items` not passed, tries remote; else falls back.
 * @param {{ items?: Array<{name:string,image?:string}>, title?: string }} props
 */
export default function CategoryCarousel({ items = [], title = "Shop with Categories" }) {
  const navigate = useNavigate();
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const [remoteCats, setRemoteCats] = useState(null);
  const [err, setErr] = useState("");
  const shouldFetch = !items || items.length === 0;

  useEffect(() => {
    if (!shouldFetch) return;

    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/products/categories", { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const raw = Array.isArray(j) ? j : (Array.isArray(j?.categories) ? j.categories : []);
        const normalized = raw
          .map((c) => ({
            name: c?.name || c?.label || "",
            image: c?.image || c?.img || c?.media || "",
          }))
          .filter((c) => c.name);

        if (alive) setRemoteCats(normalized);
      } catch (e) {
        if (alive) {
          // PRO: User-safe message + dev detail to console for debugging.
          setErr("Failed to load categories");
          // Keep console noise minimal; one line with status/message.
          // eslint-disable-next-line no-console
          console.debug?.("[CategoryCarousel] fetch categories failed:", e?.message || e);
          setRemoteCats([]); // triggers fallback display
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [shouldFetch]);

  const categories = useMemo(() => {
    if (items && items.length) return items;
    if (remoteCats && remoteCats.length) return remoteCats;
    if (remoteCats === null) return null; // still loading
    // Fallback only after remote attempt finished or was skipped
    return FALLBACK;
  }, [items, remoteCats]);

  const openCategory = (name) => {
    if (!name) return;
    const params = new URLSearchParams({ category: name, page: "1" });
    navigate(`/shop?${params.toString()}`);
  };

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "#FFFFFF",
        py: { xs: 4, md: 6 },
        px: { xs: 2, md: 0 },
        maxWidth: 1320,
        mx: "auto",
      }}
    >
      <Typography
        sx={{ textAlign: "center", fontWeight: 800, fontSize: { xs: 22, md: 28 }, color: "#191C1F", mb: 3 }}
      >
        {title}
      </Typography>

      <Box sx={{ position: "relative" }}>
        {categories === null && (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ border: "1px solid #E0E0E0", borderRadius: "4px", p: 2 }}>
                <Skeleton variant="rectangular" height={90} sx={{ mb: 1 }} />
                <Skeleton width="70%" />
              </Box>
            ))}
          </Box>
        )}

        {!!err && categories && categories.length > 0 && (
          <Typography sx={{ fontSize: 12, color: "#9aa3af", mb: 1 }} aria-live="polite">
            {err} — showing defaults
          </Typography>
        )}

        {categories && categories.length > 0 && (
          <Swiper
            modules={[Navigation]}
            slidesPerView={2}
            spaceBetween={16}
            breakpoints={{
              600: { slidesPerView: 3 },
              900: { slidesPerView: 4 },
              1200: { slidesPerView: 5 },
            }}
            onInit={(swiper) => {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
              swiper.navigation.init();
              swiper.navigation.update();
            }}
          >
            {categories.map((cat, idx) => {
              const name = cat?.name || `Category ${idx + 1}`;
              const img = assetUrl(cat?.image || FALLBACK[idx % FALLBACK.length].image);
              return (
                <SwiperSlide key={`${name}-${idx}`}>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => openCategory(name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openCategory(name);
                    }}
                    sx={{
                      bgcolor: "#FFFFFF",
                      border: "1px solid #E0E0E0",
                      borderRadius: "4px",
                      py: 3,
                      px: 2,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": { boxShadow: "0 4px 10px rgba(0,0,0,0.08)" },
                      textDecoration: "none",
                    }}
                    aria-label={`Open ${name} category`}
                  >
                    <Box
                      component="img"
                      src={img}
                      alt={name}
                      sx={{ maxHeight: 100, width: "100%", objectFit: "contain", mb: 2 }}
                    />
                    <Typography
                      sx={{ fontWeight: 600, fontSize: 15, color: "#191C1F", textAlign: "center" }}
                    >
                      {name}
                    </Typography>
                  </Box>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}

        <IconButton
          ref={prevRef}
          aria-label="Previous"
          sx={{
            position: "absolute",
            top: "50%",
            left: -8,
            transform: "translateY(-50%)",
            bgcolor: "#FF6A00",
            color: "#FFFFFF",
            width: 36,
            height: 36,
            zIndex: 10,
            "&:hover": { bgcolor: "#e75a00" },
            display: { xs: "none", sm: "flex" },
          }}
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <IconButton
          ref={nextRef}
          aria-label="Next"
          sx={{
            position: "absolute",
            top: "50%",
            right: -8,
            transform: "translateY(-50%)",
            bgcolor: "#FF6A00",
            color: "#FFFFFF",
            width: 36,
            height: 36,
            zIndex: 10,
            "&:hover": { bgcolor: "#e75a00" },
            display: { xs: "none", sm: "flex" },
          }}
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
