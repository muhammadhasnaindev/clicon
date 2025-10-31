// src/store/slices/settingsSlice.jsx
/**
 * Settings slice (currency/language/rates)

 */
import { createSlice } from "@reduxjs/toolkit";

/* NEW LOGIC: surface demo FX config as constants
 * PRO: discoverable, easy to swap with backend-driven config later.
 */
const DEFAULT_RATES = { USD: 1, EUR: 0.92, PKR: 279 };
const DEFAULT_SYMBOLS = { USD: "USD", EUR: "EUR", PKR: "PKR" };

/**
 * Base currency = USD
 * You can update FX rates later from API if needed.
 */
const initialState = {
  currency: "USD",
  language: "en",
  rates: DEFAULT_RATES,
  symbols: DEFAULT_SYMBOLS,
};

const slice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setCurrency: (s, a) => { s.currency = a.payload; },
    setLanguage: (s, a) => { s.language = a.payload; }
  }
});

export const { setCurrency, setLanguage } = slice.actions;
export default slice.reducer;

export const selectCurrency = (state) => state.settings.currency;
export const selectRates = (state) => state.settings.rates;
export const selectSymbols = (state) => state.settings.symbols;
export const selectLanguage = (state) => state.settings.language;
