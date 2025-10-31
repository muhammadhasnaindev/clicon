// src/components/header/Breadcrumb.jsx
/**
 * Summary:
 * Path-based breadcrumb with product/category awareness.
 
 */

import { Breadcrumbs, Link, Typography, Box } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useGetProductQuery } from "../../store/api/apiSlice";

const bg = "#F5F6F9";
const text = "#191C1F";
const active = "#1B6392";
const sep = "#9EA3AE";

function safeDecode(s = "") {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
function titleCase(s = "") {
  return safeDecode(s.replace(/-/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  const isProduct = parts[0] === "product" && parts[1];
  const productIdOrSlug = isProduct ? safeDecode(parts[1]) : undefined;
  const { data: pData } = useGetProductQuery(productIdOrSlug, { skip: !isProduct });
  const product = pData?.data || pData;

  if (parts.length === 0) return null;

  const crumbs = [{ label: "Home", to: "/" }];

  if (parts[0] === "shop" || isProduct) {
    crumbs.push({ label: "Shop", to: "/shop" });
    crumbs.push({ label: "Shop Grid", to: "/shop" });
  }
  if (parts[0] === "shop" && parts[1]) {
    const seg = parts[1];
    crumbs.push({ label: titleCase(seg), to: `/shop/${seg}` });
  }
  if (isProduct) {
    if (product?.category) crumbs.push({ label: product.category, to: "/shop" });
    crumbs.push({ label: product?.title || titleCase(parts[1]) });
  }
  if (!isProduct && parts[0] !== "shop") {
    let acc = "";
    parts.forEach((seg, i) => {
      acc += `/${seg}`;
      crumbs.push({ label: titleCase(seg), to: i < parts.length - 1 ? acc : undefined });
    });
  }

  return (
    <Box
      sx={{
        backgroundColor: bg,
        py: 1,
        px: { xs: 2, md: 10 },
        width: "100%",
        display: { xs: "none", md: "block" },
      }}
    >
      <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextIcon sx={{ fontSize: 18, color: sep }} />}>
        {crumbs.map((c, i) =>
          i === 0 ? (
            <Link
              key={i}
              component={RouterLink}
              to={c.to || "/"}
              underline="none"
              sx={{ display: "flex", alignItems: "center", color: text, fontSize: 13 }}
            >
              <HomeOutlinedIcon sx={{ mr: 0.5, fontSize: 18 }} /> {c.label}
            </Link>
          ) : i < crumbs.length - 1 && c.to ? (
            <Link key={i} component={RouterLink} to={c.to} underline="none" sx={{ color: text, fontSize: 13 }}>
              {c.label}
            </Link>
          ) : (
            <Typography
              key={i}
              sx={{
                color: active,
                fontSize: 13,
                fontWeight: 500,
                maxWidth: 420, // UI clamp only
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={c.label}
            >
              {c.label}
            </Typography>
          )
        )}
      </Breadcrumbs>
    </Box>
  );
}
