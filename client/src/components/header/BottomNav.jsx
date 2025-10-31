// src/components/header/BottomNav.jsx
/**
 * Summary:
 * Desktop nav row with category dropdown and quick links.

 */

import React, { useEffect, useRef, useState } from "react";
import { AppBar, Toolbar, Box, Typography, Button, Grow } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { NavLink } from "react-router-dom";
import AllCategoryDropdown from "./category/AllCategoryDropdown";
// import TempRoutesButton from "./dev/TempRoutesButton";
import { colors } from "../../theme/tokens";

const ACTIVE = colors.brand || "#FA8232";

const NavItem = ({ icon, label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: "inherit", fontSize: 14, "&:hover": { color: ACTIVE } }}>
    {icon}
    <Typography sx={{ fontWeight: 500, fontSize: 14, color: "inherit" }}>{label}</Typography>
  </Box>
);

const NavItemLink = ({ to, children }) => (
  <NavLink
    to={to}
    style={({ isActive }) => ({
      textDecoration: "none",
      color: isActive ? ACTIVE : "#666",
    })}
  >
    {children}
  </NavLink>
);

export default function BottomNav() {
  const [openCategory, setOpenCategory] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!openCategory) return;
    const onScroll = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) setOpenCategory(false);
    };
    const onClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      )
        setOpenCategory(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpenCategory(false); // PRO: quick keyboard close
    };
    window.addEventListener("scroll", onScroll);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openCategory]);

  return (
    <>
      <AppBar
        position="relative"
        sx={{
          backgroundColor: "#fff",
          color: "#666",
          boxShadow: "none",
          borderTop: "1px solid #eee",
          borderBottom: "1px solid #eee",
          display: { xs: "none", md: "block" }, // this row moves to Drawer on mobile/tablet
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: { md: 8 },
            minHeight: 62,
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box ref={buttonRef}>
              <Button
                onClick={() => setOpenCategory((v) => !v)}
                endIcon={
                  <KeyboardArrowDownIcon
                    sx={{
                      transform: openCategory ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform .2s",
                    }}
                  />
                }
                sx={{
                  color: openCategory ? "#FFFFFF" : "#191C1F",
                  backgroundColor: openCategory ? "#FF6A00" : "#F7F8FA",
                  fontWeight: 600,
                  fontSize: 14,
                  textTransform: "none",
                  borderRadius: 1.5,
                  px: 2.5,
                  py: 1,
                  boxShadow: openCategory ? "0 2px 8px rgba(0,0,0,.15)" : "none",
                  "&:hover": { backgroundColor: openCategory ? "#E65A00" : "#E9ECEF" },
                }}
                aria-expanded={openCategory ? "true" : "false"}
                aria-controls="category-popover"
              >
                All Category
              </Button>
            </Box>

            {/* <TempRoutesButton /> */}

            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <NavItemLink to="/track-order">
                <NavItem icon={<RoomOutlinedIcon fontSize="small" />} label="Track Order" />
              </NavItemLink>

              <NavItemLink to="/compare">
                <NavItem icon={<CompareArrowsOutlinedIcon fontSize="small" />} label="Compare" />
              </NavItemLink>

              <NavItemLink to="/help-center">
                <NavItem icon={<HeadsetMicOutlinedIcon fontSize="small" />} label="Customer Support" />
              </NavItemLink>

              <NavItemLink to="/faq">
                <NavItem icon={<InfoOutlinedIcon fontSize="small" />} label="Need Help" />
              </NavItemLink>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PhoneOutlinedIcon sx={{ color: colors.dark }} />
            <Typography sx={{ fontWeight: 500, color: colors.dark, fontSize: 16 }}>
              +1-202-555-0104
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Grow in={openCategory}>
        <div id="category-popover">
          {openCategory && (
            <AllCategoryDropdown
              buttonRef={buttonRef}
              dropdownRef={dropdownRef}
              onClose={() => setOpenCategory(false)}
            />
          )}
        </div>
      </Grow>
    </>
  );
}
