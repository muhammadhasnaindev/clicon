// src/store/slices/wishlistSlice.js
/**
 * Wishlist slice
 
 */
import { createSlice, createSelector } from "@reduxjs/toolkit";

const load = () => {
  try { return JSON.parse(localStorage.getItem("wishlist") || "[]"); }
  catch { return []; }
};
const save = (items) => { try { localStorage.setItem("wishlist", JSON.stringify(items)); } catch {} };

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: { items: load() }, // [{ id, title, image, price }]
  reducers: {
    addToWishlist(state, { payload }) {
      if (!payload?.id) return;
      if (!state.items.some(x => x.id === payload.id)) {
        state.items.push(payload);
        save(state.items);
      }
    },
    removeFromWishlist(state, { payload: id }) {
      if (!id) return; // small guard
      state.items = state.items.filter(x => x.id !== id);
      save(state.items);
    },
    clearWishlist(state) {
      state.items = [];
      save(state.items);
    },
  },
});

export const { addToWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;

export const selectWishlistItems = (s) => s.wishlist.items;
export const selectWishlistCount = createSelector(selectWishlistItems, (items) => items.length);
