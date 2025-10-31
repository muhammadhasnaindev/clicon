// src/store/slices/productsSlice.js
/**
 * Products slice (entity adapter around /products)

 */
import { createAsyncThunk, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";

const productsAdapter = createEntityAdapter({
  selectId: (p) => p._id || p.id || p.slug,
});

export const fetchProducts = createAsyncThunk("products/fetchAll", async (params = {}) => {
  const { data } = await api.get("/products", { params });
  return data.data || [];
});

export const fetchProductById = createAsyncThunk("products/fetchById", async (idOrSlug) => {
  const { data } = await api.get(`/products/${idOrSlug}`);
  return data;
});

const slice = createSlice({
  name: "products",
  initialState: productsAdapter.getInitialState({
    loading: false,
    error: null
  }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.loading = false; productsAdapter.upsertMany(s, a.payload);
      })
      .addCase(fetchProducts.rejected, (s, a) => {
        s.loading = false; s.error = a.error?.message || "Failed to load products";
      })
      .addCase(fetchProductById.fulfilled, (s, a) => {
        productsAdapter.upsertOne(s, a.payload);
      });
  }
});

export default slice.reducer;

/** Adapter selectors bound to state.products. */
export const productsSelectors = productsAdapter.getSelectors((state) => state.products);
