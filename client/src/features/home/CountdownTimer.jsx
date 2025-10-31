/**
 * CountdownTimer
 * Summary: Inline text countdown ("Deals end in ...").
 
 */

import { Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

const TICK_MS = 1000;

/**
 * @param {{ endDate: string | number | Date }} props
 */
export default function CountdownTimer({ endDate }) {
  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Pre-parse target once to avoid repeating new Date() on every tick.
   */
  const target = useMemo(() => {
    const ms = +new Date(endDate);
    return Number.isFinite(ms) ? ms : NaN;
  }, [endDate]);

  const computeLabel = (nowMs) => {
    if (!Number.isFinite(target)) return "Ended";
    const diff = target - nowMs;
    if (diff <= 0) return "Ended";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return `${d}d : ${h}h : ${m}m : ${s}s`;
  };

  const [left, setLeft] = useState(() => computeLabel(Date.now()));

  useEffect(() => {
    if (!Number.isFinite(target) || target <= Date.now()) {
      setLeft("Ended");
      return; // nothing to tick
    }
    const t = setInterval(() => {
      const label = computeLabel(Date.now());
      setLeft(label);
      if (label === "Ended") clearInterval(t);
    }, TICK_MS);
    return () => clearInterval(t);
  }, [target]);

  return (
    <Typography
      sx={{
        fontSize: 12,
        bgcolor: "#EBC80C",
        color: "#191C1F",
        fontWeight: 700,
        px: 1,
        borderRadius: "2px",
        display: "inline-block",
      }}
      aria-live="polite"
    >
      Deals end in {left}
    </Typography>
  );
}
