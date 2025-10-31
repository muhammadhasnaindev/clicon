/**
 * PromoCard
 * Summary: Small promo for Apple Watch with add-to-cart + view details.

 */

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../../../store/slices/cartSlice";
import { selectCurrency, selectRates } from "../../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../../utils/money";
import { assetUrl } from "../../../utils/asset";
import { ORANGE, DARK } from "./constants";

const usdToView = (usd, rates, ccy) => convert(usd, rates, ccy);

/**
 * Render promo card and wire up to cart.
 */
export default function PromoCard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const fmt = (v) => formatMoney(v, currency);

  const payload = {
    _id: "apple-watch-series-7-gps-41mm",
    title: "Apple Watch Series 7 GPS 41mm",
    images: [assetUrl("uploads/apple_watch_series7_41.png")],
    price: { current: 279 },
  };

  return (
    <Box
      sx={{
        mt: 3,
        p: { xs: 1.75, md: 2 },
        border: `1px solid ${ORANGE}`,
        borderRadius: "10px",
        textAlign: "center",
        bgcolor: "#FFF9F3",
      }}
    >
      <Box
        component="img"
        src={assetUrl("uploads/apple_watch_series7_41.png")}
        alt="Apple Watch Series 7"
        sx={{ width: "100%", maxWidth: 240, mx: "auto", display: "block" }}
      />
      <Typography sx={{ fontWeight: 800, fontSize: { xs: 16, md: 18 }, color: DARK, mt: 1 }}>
         WATCH
      </Typography>
      <Typography sx={{ color: "#5F6C72", fontSize: 14, mt: 0.5 }}>
        Heavy on Features.<br />Light on Price.
      </Typography>

      <Box
        sx={{
          mt: 1.25,
          fontWeight: 800,
          bgcolor: "#FFE8D6",
          borderRadius: "6px",
          display: "inline-block",
          px: 1,
          py: 0.5,
          color: DARK,
        }}
      >
        Only for: {fmt(usdToView(299, rates, currency))}
      </Box>

      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 1.25, bgcolor: ORANGE, fontWeight: 800, "&:hover": { bgcolor: "#E7712F" }, height: 44 }}
        onClick={() => {
          /* ========================= NEW/REVISED LOGIC =========================
           * PRO: Some carts expect `{ id, image, price }`, others handle nested `price.current`.
           * Try the full payload first; if slice rejects shape, fall back to a minimal object.
           */
          try {
            dispatch(addItem(payload, 1));
          } catch {
            dispatch(addItem({
              id: payload._id,
              title: payload.title,
              image: payload.images[0],
              price: payload.price.current,
            }));
          }
        }}
        aria-label="Add Apple Watch to cart"
      >
        ADD TO CART
      </Button>

      <Button
        fullWidth
        variant="outlined"
        sx={{ mt: 1, borderColor: ORANGE, color: DARK, fontWeight: 700, height: 44 }}
        onClick={() => navigate("/shopping-cart")}
      >
        VIEW DETAILS →
      </Button>
    </Box>
  );
}
