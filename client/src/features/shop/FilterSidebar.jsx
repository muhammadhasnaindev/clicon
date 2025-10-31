/**
 * FilterSidebar
 * Summary: Sticky sidebar with product filters and a promo card.
 
 */

import React from "react";
import { Box, Divider } from "@mui/material";
import CategoryFilter from "./filters/CategoryFilter";
import PriceRangeFilter from "./filters/PriceRangeFilter";
import PopularBrandsFilter from "./filters/PopularBrandsFilter";
import PopularTagsFilter from "./filters/PopularTagsFilter";
import PromoCard from "./filters/PromoCard";

/**
 * Renders the filter stack and keeps it sticky on desktop.
 */
export default function FilterSidebar() {
  return (
    <Box
      sx={{
        position: { md: "sticky" },
        top: { md: 88 },
      }}
    >
      <CategoryFilter />
      <Divider sx={{ my: 2 }} />
      <PriceRangeFilter />
      <Divider sx={{ my: 2 }} />
      <PopularBrandsFilter />
      <Divider sx={{ my: 2 }} />
      <PopularTagsFilter />
      <PromoCard />
    </Box>
  );
}
