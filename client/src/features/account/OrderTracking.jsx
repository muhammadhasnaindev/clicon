// src/components/orders/OrderTracking.jsx
/**
 * Summary:
 * Visual tracking timeline for an order with progress bar and activity feed.

 */

import React from "react";
import { Box, Typography, Paper, Stack, Divider } from "@mui/material";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";

const ORANGE = "#FA8232";
const BLUE = "#1B6392";
const DARK = "#191C1F";
const MUTED = "#5F6C72";
const BORDER = "#E5E7EB";
const BANNER = "#FFF6E5";
const BANNER_BORDER = "#FFECB8";

const DEFAULT_STEPS = [
  { key: "placed",    label: "Order Placed", icon: <TaskAltIcon sx={{ color: "#4CAF50" }} /> },
  { key: "packaging", label: "Packaging",    icon: <Inventory2OutlinedIcon sx={{ color: ORANGE }} /> },
  { key: "road",      label: "On The Road",  icon: <LocalShippingOutlinedIcon sx={{ color: MUTED }} /> },
  { key: "delivered", label: "Delivered",    icon: <HandshakeOutlinedIcon sx={{ color: MUTED }} /> },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function OrderTracking({
  order = {
    number: "#96459761",
    summaryLine: "4 Products · Order Placed in 17 Jan, 2021 at 7:32 PM",
    amountText: "$1199.00",
    etaText: "23 Jan, 2021",
  },
  steps = DEFAULT_STEPS,
  activeIndex = 1,
  activities = [
    { icon: <CheckCircleIcon sx={{ color: "#4CAF50" }} />, text: "Your order has been delivered. Thank you for shopping at Clicon!", date: "23 Jan, 2021 at 7:32 PM" },
    { icon: <PersonOutlineIcon sx={{ color: "#64B5F6" }} />, text: "Our delivery man (John Wick) has picked-up your order for delivery.", date: "23 Jan, 2021 at 2:00 PM" },
    { icon: <PlaceOutlinedIcon sx={{ color: "#64B5F6" }} />, text: "Your order has reached at last mile hub.", date: "22 Jan, 2021 at 8:00 AM" },
    { icon: <MapOutlinedIcon sx={{ color: "#64B5F6" }} />, text: "Your order on the way to (last mile) hub.", date: "21 Jan, 2021 at 5:32 AM" },
    { icon: <CheckCircleIcon sx={{ color: "#4CAF50" }} />, text: "Your order is successfully verified.", date: "20 Jan, 2021 at 7:32 PM" },
    { icon: <TaskAltIcon sx={{ color: ORANGE }} />, text: "Your order has been confirmed.", date: "19 Jan, 2021 at 2:01 PM" },
  ],
}) {
  const total = Math.max(steps.length, 1);
  // PRO: Clamp active index to valid range
  const idx = Math.max(0, Math.min(activeIndex, total - 1));
  const progressPct = total > 1 ? (idx / (total - 1)) * 100 : 0;
  const motion = prefersReducedMotion();

  return (
    <Box sx={{ py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 1320, mx: "auto" }}>
        <Paper elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 1, overflow: "hidden" }}>
          {/* Header banner */}
          <Box
            sx={{
              bgcolor: BANNER,
              borderBottom: `1px solid ${BANNER_BORDER}`,
              px: 2.5,
              py: 1.75,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, color: DARK }}>{order.number}</Typography>
              <Typography sx={{ color: MUTED, fontSize: 13 }}>{order.summaryLine}</Typography>
            </Box>
            <Typography sx={{ color: BLUE, fontWeight: 800, fontSize: 20 }}>{order.amountText}</Typography>
          </Box>

          {/* ETA */}
          <Typography sx={{ px: 2.5, pt: 2, color: MUTED, fontSize: 13 }}>
            Order expected arrival <b style={{ color: DARK }}>{order.etaText}</b>
          </Typography>

          {/* Progress */}
          <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
            <Box sx={{ position: "relative", height: 30, mb: 3 }}>
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: 4,
                  bgcolor: "#F2F4F5",
                  borderRadius: 999,
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  width: `${progressPct}%`,
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: 4,
                  bgcolor: ORANGE,
                  borderRadius: 999,
                  transition: motion ? "none" : "width .2s ease", // PRO: reduced-motion friendly
                }}
              />
              {/* checkpoints */}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  gridTemplateColumns: `repeat(${total}, 1fr)`,
                }}
              >
                {steps.map((_, i) => {
                  const done = i <= idx;
                  return (
                    <Box
                      key={i}
                      sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: `2px solid ${done ? ORANGE : "#D9DFE5"}`,
                          bgcolor: done ? ORANGE : "#fff",
                          boxShadow: done ? "0 0 0 2px #FFF" : "none",
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* icons + labels row (flex to avoid fractional grid) */}
            <Box sx={{ display: "flex", alignItems: "stretch" }}>
              {steps.map((s, i) => {
                const done = i <= idx;
                return (
                  <Box key={s.key} sx={{ flex: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        mx: "auto",
                        borderRadius: 1,
                        border: `1px solid ${done ? ORANGE : BORDER}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 0.75,
                        bgcolor: done ? "#FFF3E8" : "#fff",
                      }}
                    >
                      {s.icon}
                    </Box>
                    <Typography sx={{ fontSize: 12, color: done ? DARK : "#9AA7B0" }}>
                      {s.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Activity list */}
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: DARK, mb: 1.5 }}>
              Order Activity
            </Typography>

            <Stack spacing={1.25}>
              {activities.map((a, idx2) => (
                <Stack key={idx2} direction="row" spacing={1.25} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: 1,
                      border: `1px solid ${BORDER}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mt: "2px",
                      bgcolor: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {a.icon}
                  </Box>

                  <Box sx={{ lineHeight: 1.35 }}>
                    <Typography sx={{ fontSize: 13, color: DARK }}>{a.text}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.25 }}>{a.date}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
