// src/features/compare/CompareButton.jsx
/**
 * Summary:
 * Small action to add a product into compare list with a friendly toast.
 
 */

import React, { useMemo, useState } from "react";
import { IconButton, Tooltip, Snackbar, Alert } from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { useDispatch, useSelector } from "react-redux";
import { addToCompare, selectCompare } from "../../store/slices/compareSlice";
import { assetUrl } from "../../utils/asset";

const idOf  = (p) => p?._id || p?.id || p?.slug || p?.sku;
const imgOf = (p) => assetUrl(p?.image || (Array.isArray(p?.images) ? p.images[0] : "") || "/uploads/placeholder.png");

export default function CompareButton({ product, onAdded }) {
  const dispatch = useDispatch();
  const compareItems = useSelector(selectCompare) || [];
  const [addedToast, setAddedToast] = useState(false);

  const prodId = idOf(product);

  // PRO: Pre-compute payload; ensure minimal shape for reducers.
  const payload = useMemo(() => ({
    _id: prodId,
    id:  prodId,
    title: product?.title || "Untitled",
    images: [imgOf(product)],
    image: imgOf(product),
    price: product?.price,         // { current, old } if available
    brand: product?.brand || null,
    model: product?.model || null,
    stock: product?.stock ?? 10,
    rating: product?.rating ?? null,
    numReviews: product?.numReviews ?? null,
    size: product?.size ?? null,
    memory: product?.memory ?? null,
    storage: product?.storage ?? null,
  }), [product, prodId]);

  // PRO: Deduplicate — if already added, keep UX but avoid dispatch churn.
  const alreadyAdded = !!compareItems.find((it) => (it._id || it.id) === prodId);

  const handleClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (!alreadyAdded) {
      dispatch(addToCompare(payload));
      onAdded?.(payload);
    }
    setAddedToast(true); // toast in both cases for user feedback
  };

  return (
    <>
      <Tooltip
        title={alreadyAdded ? "Already in compare" : "Add to compare"}
        enterTouchDelay={0}
        leaveTouchDelay={2000}
        arrow
      >
        <IconButton
          onClick={handleClick}
          aria-label="Add to compare"
          aria-pressed={alreadyAdded}      // PRO: accessible state
          size="small"
          sx={{
            width: { xs: 40, md: 36 },
            height:{ xs: 40, md: 36 },
            borderRadius: "50%",
            bgcolor: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,.06)",
            "&:hover": { bgcolor: "#fff" },
          }}
        >
          <CompareArrowsIcon sx={{ color: "#1B6392", fontSize: { xs: 22, md: 20 } }} />
        </IconButton>
      </Tooltip>

      <Snackbar
        open={addedToast}
        autoHideDuration={1400}
        onClose={() => setAddedToast(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setAddedToast(false)} severity="success" variant="filled">
          {alreadyAdded ? "Already in Compare" : "Added to Compare"}
        </Alert>
      </Snackbar>
    </>
  );
}
