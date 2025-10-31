/**
 * FeaturesBar
 * Summary: Four-tile “store benefits” strip with icons and links.
 
 */

import React from "react";
import { Box, Typography, Divider, ButtonBase } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined";

const COLORS = {
  text: "#191C1F",
  muted: "#5F6C72",
  divider: "#E5E7EB",
  brand: "#1B6392",
  bg: "#FFFFFF",
};

const DEFAULT_ITEMS = [
  { icon: LocalShippingOutlinedIcon, title: "FASTED DELIVERY", description: "Delivery in 24/H", to: "/help-center#shipping" },
  { icon: EmojiEventsOutlinedIcon, title: "24 HOURS RETURN", description: "100% money-back guarantee", to: "/help-center#returns" },
  { icon: CreditCardOutlinedIcon, title: "SECURE PAYMENT", description: "Your money is safe", to: "/help-center#payments" },
  { icon: HeadsetMicOutlinedIcon, title: "SUPPORT 24/7", description: "Live contact/message", to: "/help-center#support" },
];

/**
 * @param {{ items?: Array<{icon?: any,title: string,description: string,to?: string}>, sx?: object }} props
 */
export default function FeaturesBar({ items = DEFAULT_ITEMS, sx }) {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1320,
        mx: "auto",
        mt: 4,
        bgcolor: COLORS.bg,
        borderRadius: 1,
        boxShadow: "0 0 4px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "stretch",
        px: { xs: 2, md: 0 },
        ...sx,
      }}
      role="list"
      aria-label="Store benefits"
    >
      {items.map((item, idx) => {
        const Icon = item.icon || LocalShippingOutlinedIcon;
        return (
          <Box
            key={idx}
            role="listitem"
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <ButtonBase
              component={RouterLink}
              to={item.to || "#"}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "flex-start", md: "center" },
                gap: 2,
                py: { xs: 2.25, md: 2.5 },
                px: { xs: 1, md: 3 },
                borderRadius: 1,
                "&:hover .icon": { transform: "scale(1.06)" },
                "&:focus-visible": {
                  outline: "2px solid #1B6392",
                  outlineOffset: 2,
                  borderRadius: "8px",
                },
              }}
              aria-label={`${item.title} – ${item.description}`}
            >
              <Icon
                className="icon"
                sx={{
                  fontSize: { xs: 32, md: 36 },
                  color: COLORS.brand,
                  transition: "transform .18s ease",
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: 13, md: 14 },
                    lineHeight: 1.25,
                    color: COLORS.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    letterSpacing: 0.2,
                  }}
                >
                  {item.title}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 400,
                    fontSize: { xs: 12.5, md: 14 },
                    lineHeight: 1.3,
                    color: COLORS.muted,
                    letterSpacing: 0.1,
                  }}
                >
                  {item.description}
                </Typography>
              </Box>
            </ButtonBase>

            {idx < items.length - 1 && (
              <Divider
                orientation="vertical"
                flexItem
                sx={{
                  display: { xs: "none", md: "block" },
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: 44,
                  borderColor: COLORS.divider,
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
