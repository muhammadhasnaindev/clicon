// src/store/index.js
/**
 * Store configuration + light cart persistence

 */
import { configureStore } from "@reduxjs/toolkit";
import cart from "./slices/cartSlice";
import wishlist from "./slices/wishlistSlice";
import quickView from "./slices/quickViewSlice";
import products from "./slices/productsSlice";
import settings from "./slices/settingsSlice.jsx";
import compareReducer from "./slices/compareSlice";
import { apiSlice as api } from "./api/apiSlice";
import auth from "./slices/authSlice";

const PERSIST_KEY = "clicon_cart_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ cart: { items: state.cart.items } })
    );
  } catch {}
}

export const store = configureStore({
  reducer: {
    cart,
    wishlist,
    quickView,
    products,
    settings,
    compare: compareReducer,
    [api.reducerPath]: api.reducer,
    auth,
  },
  middleware: (getDefault) => getDefault().concat(api.middleware),
  preloadedState: loadState(),
});

store.subscribe(() => saveState(store.getState()));
