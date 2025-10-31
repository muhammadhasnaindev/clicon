/**
 * ProductListing
 * Short: 2-column shop layout with sticky filters and results area.

 */

import React from "react";
import { Box, Grid } from "@mui/material";
import FilterSidebar from "../features/shop/FilterSidebar";
import SearchSortBar from "../features/shop/SearchSortBar";
import ActiveFiltersBar from "../features/shop/ActiveFiltersBar";
import ProductGrid from "../features/shop/ProductGrid";

/* tokens */
const MAX_W = 1320;

/**
 * ProductListing
 * Renders filter sidebar + search/sort + active filters + products grid.
 */
export default function ProductListing() {
  return (
    <Box sx={{ maxWidth: MAX_W, mx: "auto", px: { xs: 2, md: 0 }, py: { xs: 2, md: 4 } }}>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={3} order={{ xs: 2, md: 1 }}>
          <FilterSidebar />
        </Grid>

        <Grid item xs={12} md={9} order={{ xs: 1, md: 2 }}>
          <SearchSortBar />
          <ActiveFiltersBar />
          <ProductGrid />
        </Grid>
      </Grid>
    </Box>
  );
}
