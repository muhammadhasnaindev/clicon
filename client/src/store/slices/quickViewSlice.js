// src/store/slices/quickViewSlice.js
/**
 * Quick View slice

 */
import { createSlice } from "@reduxjs/toolkit";

/** productId of the item shown in Quick View drawer/modal */
const slice = createSlice({
  name: "quickView",
  initialState: { productId: null },
  reducers: {
    openQuickView: (s, a) => { s.productId = a.payload; },
    closeQuickView: (s) => { s.productId = null; }
  }
});

export const { openQuickView, closeQuickView } = slice.actions;
export default slice.reducer;

/** Read current Quick View product id (or null). */
export const selectQuickViewId = (state) => state.quickView.productId;
