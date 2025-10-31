// src/pages/home/HomePage.jsx
/**
 * HomePage
 * - Lean container (no accidental top gaps), feeds sections into feature blocks.
 * - ===== NEW LOGIC: resilient section access + explicit loading props so children can show skeletons =====
 */

import Box from "@mui/material/Box";
import BannerWidgets from "../../features/home/BannerWidgets";
import FeaturesBar from "../../features/home/FeaturesBar";
import BestDealsSection from "../../features/home/BestDealsSection";
import CategoryCarousel from "../../features/home/CategoryCarousel";
import FeaturedProducts from "../../features/home/FeaturedProducts";
import IntroDoubleBanner from "../../features/home/IntroDoubleBanner";
import ComputerAccessories from "../../features/home/ComputerAccessories";
import MacbookBanner from "../../features/home/MacbookBanner";
import FlashSaleToday from "../../features/home/FlashSaleToday";
import LatestNews from "../../features/home/LatestNews";
import Newsletter from "../../features/home/Newsletter";
import { useGetHomeSectionsQuery } from "../../store/api/apiSlice";

export default function HomePage() {
  // ===== NEW LOGIC: pull once & fan out, children read loading for skeletons =====
  const { data, isLoading } = useGetHomeSectionsQuery();
  const sections = data || {};

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1320,
        mx: "auto",
        px: { xs: 2, md: 4 },

        // 🔑 keep top snug — no accidental margins on first child
        pt: 0,
        mt: 0,
        "& > :first-child": { mt: "0 !important", pt: "0 !important" },
      }}
    >
      <BannerWidgets />
      <FeaturesBar />

      {/* ===== NEW LOGIC: defensive access with defaults ===== */}
      <BestDealsSection loading={isLoading} items={sections.bestDeals || []} />

      <CategoryCarousel items={sections.categories || []} />

      <FeaturedProducts loading={isLoading} items={sections.featured || []} />

      <IntroDoubleBanner loading={isLoading} items={sections.featured || []} />

      <ComputerAccessories loading={isLoading} tabs={sections.computerAccessories || {}} />

      <MacbookBanner />

      <FlashSaleToday loading={isLoading} groups={sections.flash || {}} />

      <LatestNews />
      <Newsletter />
    </Box>
  );
}
