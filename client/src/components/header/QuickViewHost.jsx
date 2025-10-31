// src/components/header/QuickViewHost.jsx
/**
 * Summary:
 * Mount once near the app root. It opens when you dispatch openQuickView(idOrSlug).
 * Uses RTK Query so media URLs are normalized by your apiSlice transforms.
 responses.
 */

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectQuickViewId, closeQuickView } from "../../store/slices/quickViewSlice";
import { useGetProductQuery } from "../../store/api/apiSlice";
import ProductQuickView from "./product/ProductQuickView";

/**
 * Render the global Quick View dialog driven by Redux state.
 * Returns null when closed or while loading.
 */
export default function QuickViewHost() {
  const dispatch = useDispatch();
  const idOrSlug = useSelector(selectQuickViewId);

  // PRO: Skip when no id; also acts as a stale-id guard between rapid opens.
  const { data: product, isFetching, isError } = useGetProductQuery(idOrSlug, {
    skip: !idOrSlug,
  });

  if (!idOrSlug) return null;
  if (isFetching) return null;
  if (isError || !product) return null;

  // PRO: Map with safe fallbacks so QuickView never explodes on partial data.
  const mapped = {
    title: product.title || product.name || "Untitled",
    sku: product.sku || "SKU-000",
    brand: product.brand || "Generic",
    basePrice: product?.price?.current ?? 0,
    oldPrice: product?.price?.old ?? null,
    discount: product.discountText || null,
    images:
      (Array.isArray(product.images) && product.images.length
        ? product.images
        : [product.image || "/uploads/placeholder.png"]
      ).filter(Boolean),
    colors: Array.isArray(product.colors) && product.colors.length ? product.colors : ["#cccccc"],
    memory: Array.isArray(product.memory) && product.memory.length ? product.memory : ["-"],
    size: Array.isArray(product.size) && product.size.length ? product.size : ["-"],
    storage: Array.isArray(product.storage) && product.storage.length ? product.storage : ["-"],
    adjustments: product.adjustments || {},
    attributes: Array.isArray(product.attributes) ? product.attributes : [],
  };

  return (
    <ProductQuickView
      open
      product={mapped}
      onClose={() => dispatch(closeQuickView())}
    />
  );
}
