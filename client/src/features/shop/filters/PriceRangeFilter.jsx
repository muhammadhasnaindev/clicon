/**
 * PriceRangeFilter
 * Summary: Currency-aware range filter that writes USD `minPrice` / `maxPrice`.

 */

import React, { useMemo, useState, useEffect } from "react";
import { Box, Typography, Slider, TextField, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrency, selectRates } from "../../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../../utils/money";
import { ORANGE, BORDER, GRAY_RING, USD_MIN, USD_MAX } from "./constants";

const PriceUncheckedIcon = <Box sx={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${GRAY_RING}`, bgcolor: "#fff" }} />;
const PriceCheckedIcon   = <Box sx={{ width: 16, height: 16, borderRadius: "50%", border: `3px solid ${ORANGE}`, bgcolor: "#fff" }} />;

const INPUT_HEIGHT = 40;

const usdToView = (usd, rates, ccy) => convert(usd, rates, ccy);
const viewToUsd = (view, rates, ccy) =>
  ccy === "USD" ? Number(view || 0) : Math.round((Number(view || 0) / (rates?.[ccy] || 1)) * 100) / 100;

/**
 * Writes USD min/max to URL; displays in active currency.
 */
export default function PriceRangeFilter() {
  const [sp, setSp] = useSearchParams();
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);

  const urlMinUsd = sp.get("minPrice") ? Number(sp.get("minPrice")) : USD_MIN;
  const urlMaxUsd = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : USD_MAX;

  const [viewRange, setViewRange] = useState([usdToView(urlMinUsd, rates, currency), usdToView(urlMaxUsd, rates, currency)]);

  useEffect(() => {
    setViewRange([usdToView(urlMinUsd, rates, currency), usdToView(urlMaxUsd, rates, currency)]);
  }, [currency, rates, urlMinUsd, urlMaxUsd]);

  const writeParams = (obj) => {
    const next = new URLSearchParams(sp);
    Object.entries(obj).forEach(([k, v]) => ((v || v === 0) ? next.set(k, String(v)) : next.delete(k)));
    next.set("page", "1");
    setSp(next);
  };

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Clamp to USD bounds and ensure max >= min; ignore transient NaNs from typing.
   */
  const commitPrice = (minV, maxV) => {
    const minUsd = Math.max(USD_MIN, Math.min(USD_MAX, viewToUsd(minV, rates, currency)));
    const maxUsd = Math.max(USD_MIN, Math.min(USD_MAX, viewToUsd(maxV, rates, currency)));
    const finalMin = Number.isFinite(minUsd) ? minUsd : USD_MIN;
    const finalMax = Number.isFinite(maxUsd) ? Math.max(finalMin, maxUsd) : Math.max(finalMin, USD_MAX);
    writeParams({ minPrice: finalMin, maxPrice: Math.max(finalMin, finalMax) });
  };

  const fmtC = (usd) => formatMoney(convert(usd, rates, currency), currency);
  const quickOptions = useMemo(() => ([
    [USD_MIN, USD_MAX, "All Price"],
    [0, 20, `Under ${fmtC(20)}`],
    [25, 100, `${fmtC(25)} to ${fmtC(100)}`],
    [100, 300, `${fmtC(100)} to ${fmtC(300)}`],
    [300, 500, `${fmtC(300)} to ${fmtC(500)}`],
    [500, 1000, `${fmtC(500)} to ${fmtC(1000)}`],
    [1000, 10000, `${fmtC(1000)} to ${fmtC(10000)}`],
  ]), [currency, rates]);

  const selectedQuick = `${urlMinUsd}|${urlMaxUsd}`;

  const inputSx = {
    flex: 1,
    "& .MuiOutlinedInput-root": {
      height: INPUT_HEIGHT, fontSize: 13,
      "& input::placeholder": { color: "#98A2B3", opacity: 1 },
      "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER },
      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#D0D5DD" },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ORANGE },
      "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(250,130,50,0.15)" },
    },
  };

  return (
    <>
      <Typography sx={{ fontWeight: 700, fontSize: 12, color: "#5F6C72", mb: 1 }}>PRICE RANGE</Typography>

      <Box sx={{ px: 0.5 }}>
        <Slider
          value={viewRange}
          onChange={(_, v) => Array.isArray(v) && setViewRange(v)}
          onChangeCommitted={(_, v) => Array.isArray(v) && commitPrice(v[0], v[1])}
          min={usdToView(USD_MIN, rates, currency)}
          max={usdToView(USD_MAX, rates, currency)}
          aria-label="Price range"
          sx={{
            color: ORANGE,
            height: 4,
            "& .MuiSlider-thumb": { width: 14, height: 14 },
            "& .MuiSlider-rail": { opacity: 0.4 },
          }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        <TextField
          type="number"
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*", "aria-label": "Minimum price" }}
          size="small"
          value={Number.isFinite(viewRange[0]) ? viewRange[0] : ""}
          onChange={(e) => {
            const val = Number(e.target.value);
            setViewRange([Number.isFinite(val) ? val : viewRange[0], viewRange[1]]);
          }}
          onBlur={() => commitPrice(viewRange[0], viewRange[1])}
          placeholder="Min"
          sx={inputSx}
        />
        <TextField
          type="number"
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*", "aria-label": "Maximum price" }}
          size="small"
          value={Number.isFinite(viewRange[1]) ? viewRange[1] : ""}
          onChange={(e) => {
            const val = Number(e.target.value);
            setViewRange([viewRange[0], Number.isFinite(val) ? val : viewRange[1]]);
          }}
          onBlur={() => commitPrice(viewRange[0], viewRange[1])}
          placeholder="Max"
          sx={inputSx}
        />
      </Box>

      <RadioGroup
        value={selectedQuick}
        onChange={(e) => {
          const [a, b] = e.target.value.split("|").map(Number);
          writeParams({ minPrice: a, maxPrice: b });
        }}
        sx={{
          mt: 1,
          "& .MuiFormControlLabel-root": { mb: 0.5 },
          "& .MuiFormControlLabel-label": { fontSize: 13 },
        }}
      >
        {quickOptions.map(([a, b, label]) => (
          <FormControlLabel
            key={`${a}-${b}`}
            value={`${a}|${b}`}
            control={<Radio size="small" icon={PriceUncheckedIcon} checkedIcon={PriceCheckedIcon} sx={{ p: 0.25 }} />}
            label={label}
          />
        ))}
      </RadioGroup>
    </>
  );
}
