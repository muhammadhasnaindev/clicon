// src/components/header/SearchBar.jsx
/**
 * Summary:
 * Small, reusable search form that navigates to /search?q=… (no autosuggest).
 
 */

import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

const scrollTop = () => {
  try {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  } catch {}
};

export default function SearchBar({ placeholder = "Search products...", size = "small", sx }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = params.get("q") || "";
  const [term, setTerm] = React.useState(initial);
  const lastNavRef = React.useRef(initial.toLowerCase());

  const normalize = (s) => s.replace(/\s+/g, " ").trim();

  const go = (raw) => {
    const q = normalize(raw);
    if (!q) return;
    // PRO: Avoid re-navigating if same query (prevents re-renders on Enter spam).
    if (q.toLowerCase() === lastNavRef.current) return;
    lastNavRef.current = q.toLowerCase();
    navigate(`/search?q=${encodeURIComponent(q)}&page=1`);
    scrollTop();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    go(term);
  };

  const clear = () => setTerm("");

  return (
    <form onSubmit={onSubmit} style={{ width: "100%" }}>
      <TextField
        fullWidth
        size={size}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(e);
          // PRO: quick clear via Esc
          if (e.key === "Escape") clear();
        }}
        placeholder={placeholder}
        sx={sx}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: term ? (
            <InputAdornment position="end">
              <IconButton aria-label="clear search" onClick={clear}>
                <CloseIcon />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
        inputProps={{ "aria-label": "search products" }}
      />
    </form>
  );
}
