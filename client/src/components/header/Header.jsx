// src/components/header/Header.jsx
/**
 * Summary:
 * Fixed header composing announcement, navs, and breadcrumb; publishes CSS offset.

 */

import React, { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import AnnouncementBar from "./AnnouncementBar";
import TopNav from "./TopNav";
import MiddleNav from "./MiddleNav";
import BottomNav from "./BottomNav";
import Breadcrumb from "./Breadcrumb";
import { z } from "../../theme/tokens";

export default function Header() {
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.body.style.setProperty("--header-offset", `${Math.max(0, Math.min(h, 1000))}px`);
    };

    publish();

    const onResize = () => publish();
    const onOrient = () => publish();

    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    window.addEventListener("orientationchange", onOrient); // PRO: handle device rotate

    let ro;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(publish);
      ro.observe(el);
    }

    const t1 = setTimeout(publish, 100);
    const t2 = setTimeout(publish, 350);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      window.removeEventListener("orientationchange", onOrient);
      if (ro) ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <Box
      ref={rootRef}
      data-header-root
      sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: z.header, bgcolor: "#fff" }}
    >
      {/* compact bar with close (visible on mdUp, optional on xs) */}
      <AnnouncementBar />

      {/* compact top utilities (hidden on xs to save height) */}
      <TopNav />

      {/* main brand + search + actions (mobile-first, adaptive) */}
      <MiddleNav />

      {/* link row + categories for mdUp (moved into Drawer on small screens) */}
      <BottomNav />

      {/* breadcrumb: keep for mdUp; auto-compact; hidden on xs for height */}
      <Breadcrumb />
    </Box>
  );
}
