import React from "react";
import Box from "@mui/material/Box";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import QuickViewHost from "../components/header/QuickViewHost";

export default function MainLayout({ children }) {
  return (
    <>
      <Header />

      {/* Exact spacer = header height */}
      <Box sx={{ height: "var(--header-offset, 0px)", transition: "height .15s ease" }} />

      {/* ✨ 5px beautiful gap under header */}
      <Box
        aria-hidden
        sx={{
          height: 15,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.06), rgba(0,0,0,0))",
        }}
      />

      <Box
        component="main"
        data-main
        sx={{
          px: { xs: 2, md: 4 },
          // safety: no accidental first-child top spacing
          "& > :first-child": { mt: "0 !important", pt: "0 !important" },
        }}
      >
        {children}
      </Box>

      <QuickViewHost />
      <Footer />
    </>
  );
}
