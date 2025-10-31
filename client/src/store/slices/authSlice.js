// src/store/slices/authSlice.js
/**
 * Auth slice (async-thunks wrapper around AuthAPI)
 
 */
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AuthAPI } from "../../api/authApi";

// Thunks
export const fetchMe = createAsyncThunk("auth/me", async () => (await AuthAPI.me()).user);
export const signin = createAsyncThunk("auth/signin", async ({ email, password }) => (await AuthAPI.signin(email, password)).user);
export const signup = createAsyncThunk("auth/signup", async (payload) => { await AuthAPI.signup(payload); return { email: payload.email }; });
export const logout = createAsyncThunk("auth/logout", async () => { await AuthAPI.logout(); });

const slice = createSlice({
  name: "auth",
  initialState: { user: null, status: "idle", error: null, pendingEmail: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMe.fulfilled, (s,a)=>{ s.user=a.payload; })
     .addCase(signin.fulfilled, (s,a)=>{ s.user=a.payload; s.error=null; })
     .addCase(signup.fulfilled, (s,a)=>{ s.pendingEmail=a.payload.email; }) // used by VerifyEmail
     .addCase(logout.fulfilled, (s)=>{ s.user=null; s.pendingEmail=null; });
  }
});
export default slice.reducer;

/** Get current user (or null). */
export const selectUser = (s) => s.auth.user;
/** Email used during sign-up awaiting verification (or null). */
export const selectPendingEmail = (s) => s.auth.pendingEmail;
/** Authenticated gate. */
export const isAuthed = (s) => !!s.auth.user;
