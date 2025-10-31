// src/components/header/AnnouncementBar.jsx
/**
 * Summary:
 * Slim promo bar that also updates CSS --header-offset to avoid layout shift.
 
 */

import React, { useState, useEffect } from "react";
import { Box, Typography, Button, IconButton, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "announcement:dismissed";

export default function AnnouncementBar() {
  const [show, setShow] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const navigate = useNavigate();

  // PRO: Keep header offset in sync when bar is visible; re-run briefly to catch fonts/paint.
  useEffect(() => {
    const sync = () => {
      const el = document.querySelector("[data-header-root]");
      const h = Math.round(el?.getBoundingClientRect().height || 0);
      document.body.style.setProperty("--header-offset", `${h}px`);
    };
    sync();
    let raf;
    let ticks = 0;
    const pump = () => {
      sync();
      if (ticks++ < 12) raf = requestAnimationFrame(pump);
    };
    raf = requestAnimationFrame(pump);
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show) return null;

  const goShop = () => {
    navigate("/shop");
    try {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    } catch {}
  };

  const closeBar = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  return (
    <Box
      role="region"
      aria-label="Promotional announcement"
      sx={{
        width: "100%",
        backgroundColor: "#191C1F",
        position: "relative",
        px: { xs: 1.5, md: 10 },
        py: { xs: 1, md: 0.5 }, // slimmer
      }}
    >
      <Stack
        direction={{ xs: "row", md: "row" }}
        spacing={{ xs: 1, md: 4 }}
        sx={{
          width: "100%",
          maxWidth: "1920px",
          mx: "auto",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              width: { xs: 54, md: 74 },
              height: { xs: 28, md: 40 },
              backgroundColor: "#F2D13D",
              transform: "rotate(3deg)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: "4px 8px",
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: { xs: 12, md: 20 }, color: "#191C1F" }}>
              Black
            </Typography>
          </Box>
          <Typography sx={{ ml: 1.5, fontWeight: 600, fontSize: { xs: 16, md: 24 }, color: "#FFFFFF" }}>
            Friday
          </Typography>
        </Box>

        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 2 }}>
          <Typography sx={{ fontWeight: 500, fontSize: 14, color: "#FFFFFF" }}>Up to</Typography>
          <Box sx={{ width: 89, height: 48, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 600, fontSize: 40, color: "#EBC80C" }}>59%</Typography>
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: 20, color: "#FFFFFF" }}>OFF</Typography>
        </Box>

        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          onClick={goShop}
          sx={{
            width: { xs: "auto", md: 156 },
            px: { xs: 2, md: 0 },
            height: { xs: 36, md: 42 },
            backgroundColor: "#EBC80C",
            color: "#191C1F",
            fontWeight: 700,
            borderRadius: "2px",
            "&:hover": { backgroundColor: "#d3b207" },
          }}
        >
          Shop Now
        </Button>
      </Stack>

      <IconButton
        onClick={closeBar}
        sx={{
          position: "absolute",
          right: { xs: 8, md: 40 },
          top: "50%",
          transform: "translateY(-50%)",
          width: 28,
          height: 28,
          backgroundColor: "#303639",
          borderRadius: "2px",
          "&:hover": { backgroundColor: "#444950" },
        }}
        aria-label="Close announcement"
      >
        <CloseIcon sx={{ color: "#FFFFFF", fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}
