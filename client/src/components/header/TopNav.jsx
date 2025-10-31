// src/components/header/TopNav.jsx
/**
 * Summary:
 * Thin top bar with welcome, social icons, and language/currency selectors.

 */

import React from "react";
import { Box, Typography, IconButton, MenuItem, Select } from "@mui/material";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import PinterestIcon from "@mui/icons-material/Pinterest";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { useDispatch, useSelector } from "react-redux";
import { setCurrency, setLanguage, selectCurrency, selectLanguage } from "../../store/slices/settingsSlice.jsx";
import i18n from "../../i18n";

export default function TopNav() {
  const dispatch = useDispatch();
  const lang = useSelector(selectLanguage);
  const currency = useSelector(selectCurrency);

  const onLang = (e) => {
    const v = e.target.value;
    dispatch(setLanguage(v));
    i18n.changeLanguage(v.toLowerCase());
  };
  const onCurrency = (e) => dispatch(setCurrency(e.target.value));

  return (
    <Box
      sx={{
        width: "100%",
        backgroundColor: "#1B6392",
        display: { xs: "none", md: "flex" }, // save height on phones/tablets
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        px: { md: 8 },
        py: 0.75,
        gap: 0,
        borderBottom: "1px solid #FFFFFF",
      }}
    >
      <Typography sx={{ fontWeight: 400, fontSize: 14, color: "#FFFFFF" }}>
        {i18n.t("welcome")}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography sx={{ fontWeight: 400, fontSize: 14, color: "#FFFFFF" }}>
          {i18n.t("follow_us")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* PRO: a11y labels on social buttons; keep as IconButton for consistency */}
          <IconButton size="small" sx={{ color: "#FFFFFF", p: 0.5 }} aria-label="Twitter">
            <TwitterIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: "#FFFFFF", p: 0.5 }} aria-label="Facebook">
            <FacebookIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: "#FFFFFF", p: 0.5 }} aria-label="Pinterest">
            <PinterestIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: "#FFFFFF", p: 0.5 }} aria-label="Instagram">
            <InstagramIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: "#FFFFFF", p: 0.5 }} aria-label="YouTube">
            <YouTubeIcon fontSize="small" />
          </IconButton>
        </Box>

        <Select
          value={lang}
          onChange={onLang}
          size="small"
          aria-label="Select language"
          sx={{
            fontSize: 14,
            color: "#FFFFFF",
            "& .MuiSelect-icon": { color: "#FFFFFF" },
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            backgroundColor: "transparent",
            minWidth: "72px",
          }}
        >
          <MenuItem value="en">Eng</MenuItem>
          {/* <MenuItem value="ur">Urdu</MenuItem> */}
        </Select>

        <Select
          value={currency}
          onChange={onCurrency}
          size="small"
          aria-label="Select currency"
          sx={{
            fontSize: 14,
            color: "#FFFFFF",
            "& .MuiSelect-icon": { color: "#FFFFFF" },
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            backgroundColor: "transparent",
            minWidth: "72px",
          }}
        >
          <MenuItem value="USD">USD</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="PKR">PKR</MenuItem>
        </Select>
      </Box>
    </Box>
  );
}
