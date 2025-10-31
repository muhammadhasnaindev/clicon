// src/store/slices/compareSlice.js
/**
 * Compare slice

 */
import { createSlice } from "@reduxjs/toolkit";

const idOf = (p) => p?._id || p?.id || p?.slug || p?.sku;

const load = () => {
  try { return JSON.parse(localStorage.getItem("compare_items") || "[]"); }
  catch { return []; }
};
const save = (items) => {
  try { localStorage.setItem("compare_items", JSON.stringify(items)); } catch {}
};

const initialState = { items: load() };

const compareSlice = createSlice({
  name: "compare",
  initialState,
  reducers: {
    addToCompare(state, { payload }) {
      const id = idOf(payload);
      if (!id) return;
      if (!state.items.find((x) => idOf(x) === id)) {
        state.items.push(payload);
        save(state.items);
      }
    },
    removeFromCompare(state, { payload /* id */ }) {
      if (!payload) return; // small guard
      state.items = state.items.filter((x) => idOf(x) !== payload);
      save(state.items);
    },
    clearCompare(state) {
      state.items = [];
      save(state.items);
    },
  },
});

export const { addToCompare, removeFromCompare, clearCompare } = compareSlice.actions;
export const selectCompare = (s) => s.compare.items;
export const selectCompareCount = (s) => s.compare.items.length;
export default compareSlice.reducer;
