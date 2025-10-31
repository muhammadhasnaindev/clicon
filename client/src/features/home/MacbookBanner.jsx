/**
 * MacbookBanner
 * Summary: Wide hero with price bubble (converted via settings) and CTA.

 */

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useSelector } from "react-redux";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";
import { assetUrl } from "../../utils/asset";
import { Link } from "react-router-dom";

const ORANGE = "#FA8232";
const PEACH = "#FCE8DA";
const BASE_USD = 1999;

/**
 * Render hero banner for Macbook.
 */
export default function MacbookBanner() {
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const price = formatMoney(convert(BASE_USD, rates, currency), currency);

  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 1320,
          minHeight: { xs: 360, md: 520 },
          bgcolor: PEACH,
          borderRadius: { md: 1 },
          mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "52% 48%" },
          alignItems: "center",
          overflow: "hidden",
          px: { xs: 3, md: 6 },
          py: { xs: 5, md: 0 },
          gap: { xs: 3, md: 0 },
        }}
      >
        {/* LEFT */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "center", md: "flex-start" },
            textAlign: { xs: "center", md: "left" },
            px: { xs: 0, md: 3 },
          }}
        >
          <Box
            sx={{
              display: "inline-block",
              bgcolor: "#2BA5F7",
              borderRadius: "4px",
              px: 2.25,
              py: 0.75,
              mb: { xs: 2, md: 3 },
            }}
          >
            <Typography sx={{ color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
              SAVE UP TO $200.00
            </Typography>
          </Box>

          <Typography
            sx={{
              fontWeight: 900,
              color: "#191C1F",
              fontSize: { xs: 32, md: 56 },
              lineHeight: 1.08,
              mb: { xs: 1.25, md: 2 },
              letterSpacing: { xs: "-0.5px", md: "-1px" },
            }}
          >
            Macbook Pro
          </Typography>

          <Typography
            sx={{
              color: "#1A2226",
              fontSize: { xs: 15, md: 18 },
              lineHeight: 1.6,
              maxWidth: { xs: "100%", md: 420 },
              mb: { xs: 3, md: 4 },
            }}
          >
            Apple M1 Max Chip. 32GB Unified Memory, 1TB SSD Storage
          </Typography>

          <Button
            component={Link}
            to="/shop?category=Computer%20%26%20Laptop"
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            sx={{
              backgroundColor: ORANGE,
              color: "#fff",
              fontWeight: 900,
              textTransform: "uppercase",
              borderRadius: 1,
              px: 3.5,
              py: 1.75,
              fontSize: 14,
              letterSpacing: 0.5,
              boxShadow: "none",
              "&:hover": { backgroundColor: "#E7712F", boxShadow: "none" },
            }}
            aria-label="Shop Macbook Pro"
          >
            Shop Now
          </Button>
        </Box>

        {/* RIGHT */}
        <Box
          sx={{
            position: "relative",
            height: { xs: 280, md: 520 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pr: { xs: 0, md: 2 },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: { xs: 16, md: 24 },
              left: { xs: 16, md: -55 },
              width: { xs: 76, md: 110 },
              height: { xs: 76, md: 110 },
              borderRadius: "50%",
              backgroundColor: "#FFC9A6",
              border: { xs: "4px solid #fff", md: "6px solid #fff" },
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: { xs: 14, md: 20 },
              color: "#191C1F",
              zIndex: 3,
              pointerEvents: "none",
            }}
            aria-label={`Price ${price}`}
          >
            {price}
          </Box>

          <Box
            component="img"
            src={assetUrl("/uploads/macbook.png")}
            alt="MacBook Pro M1 Max"
            sx={{
              width: { xs: "92%", md: "100%" },
              maxWidth: { xs: "100%", md: 580 },
              height: "auto",
              objectFit: "contain",
              position: "relative",
              zIndex: 1,
            }}
            onError={(e) => {
              e.currentTarget.style.backgroundColor = "#f0f0f0";
              e.currentTarget.style.display = "block";
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
