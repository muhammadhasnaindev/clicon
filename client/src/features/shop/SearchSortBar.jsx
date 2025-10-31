/**
 * SearchSortBar
 * Summary: Keyword input + sort select; writes to URL and resets page.
 
 */

import React, { useEffect, useMemo, useState } from "react";
import { Box, InputBase, IconButton, Select, MenuItem, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useSearchParams } from "react-router-dom";

const BRAND = "#1B6392";
const BORDER = "#E5E7EB";
const BG = "#FFFFFF";

/**
 * Renders the search box and sort dropdown; updates URL params.
 */
export default function SearchSortBar() {
  const [sp, setSp] = useSearchParams();

  const startQ = sp.get("q") || "";
  const startSort = sp.get("sort") || "popular";

  const [q, setQ] = useState(startQ);
  const [sort, setSort] = useState(startSort);

  useEffect(() => setQ(startQ), [startQ]);
  useEffect(() => setSort(startSort), [startSort]);

  const doSearch = () => {
    const next = new URLSearchParams(sp);
    const trimmed = q.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    next.set("page", "1");
    setSp(next, { replace: false });
  };

  const onSort = (v) => {
    const next = new URLSearchParams(sp);
    if (v) next.set("sort", v);
    else next.delete("sort");
    next.set("page", "1");
    setSp(next, { replace: false });
    setSort(v);
  };

  const placeholder = useMemo(() => "Search for anything…", []);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, sm: 1.5, md: 2 },
        mb: 1.5,
        flexWrap: "wrap",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: { xs: "100%", sm: 360, md: 520 },
          height: 44,
          display: "flex",
          alignItems: "center",
          border: `1px solid ${BORDER}`,
          borderRadius: "6px",
          bgcolor: BG,
          px: 1.25,
          "&:focus-within": {
            borderColor: BRAND,
            boxShadow: `0 0 0 3px ${alpha(BRAND, 0.15)}`,
          },
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") doSearch();
        }}
      >
        <InputBase
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          sx={{ flex: 1, fontSize: 14, color: "#191C1F" }}
          inputProps={{ "aria-label": "search products" }}
        />
        <IconButton onClick={doSearch} aria-label="search" sx={{ color: BRAND }}>
          <SearchIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          sx={{
            fontSize: 12,
            color: "#5F6C72",
            mr: 0.5,
            display: { xs: "none", sm: "block" },
          }}
        >
          Sort by:
        </Typography>

        <Select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          IconComponent={KeyboardArrowDownIcon}
          size="small"
          sx={{
            height: 44,
            minWidth: { xs: 160, sm: 180 },
            border: `1px solid ${BORDER}`,
            borderRadius: "6px",
            bgcolor: BG,
            "& .MuiSelect-select": { py: 1.25, fontSize: 14 },
            "&.Mui-focused": {
              borderColor: BRAND,
              boxShadow: `0 0 0 3px ${alpha(BRAND, 0.15)}`,
            },
            "& fieldset": { display: "none" },
          }}
          aria-label="sort products"
        >
          <MenuItem value="popular">Most Popular</MenuItem>
          <MenuItem value="newest">Newest</MenuItem>
          <MenuItem value="price_asc">Price: Low to High</MenuItem>
          <MenuItem value="price_desc">Price: High to Low</MenuItem>
          <MenuItem value="rating">Top Rated</MenuItem>
        </Select>
      </Box>
    </Box>
  );
}
