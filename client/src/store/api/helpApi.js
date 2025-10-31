// src/store/api/helpApi.js
// RTK Query endpoints for Support + Admin Support + Admin FAQs

// NOTE: Ensure createApi({ tagTypes: [...] }) in apiSlice INCLUDES "Support"
// PRO: lets invalidation/providesTags below work predictably.

import { apiSlice } from "./apiSlice";

export const helpApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ---------- Public: support form ----------
    sendSupportMessage: builder.mutation({
      // kept: /api/support (not /contact)
      query: ({ email, subject, message }) => ({
        url: "support",
        method: "POST",
        body: { email, subject, message },
      }),
    }),

    // ---------- Admin: Support tickets ----------
    adminSupportList: builder.query({
      query: ({ status = "", q = "", page = 1, limit = 20 } = {}) => ({
        url: `admin/support?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((t) => ({ type: "Support", id: t._id })),
              { type: "Support", id: "LIST" },
            ]
          : [{ type: "Support", id: "LIST" }],
    }),
    adminSupportGet: builder.query({
      query: (id) => ({ url: `admin/support/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Support", id }],
    }),
    adminSupportReply: builder.mutation({
      query: ({ id, message, close = false }) => ({
        url: `admin/support/${id}/reply`,
        method: "POST",
        body: { message, close },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Support", id },
        { type: "Support", id: "LIST" },
      ],
    }),
    adminSupportSetStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `admin/support/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Support", id },
        { type: "Support", id: "LIST" },
      ],
    }),
    adminSupportDelete: builder.mutation({
      query: (id) => ({ url: `admin/support/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Support", id: "LIST" }],
    }),

    // ---------- Admin: FAQs (CRUD) ----------
    adminFaqList: builder.query({
      query: () => ({ url: "admin/faqs" }),
      providesTags: (res) =>
        res?.data
          ? [
              ...res.data.map((f) => ({ type: "Faq", id: f._id })),
              { type: "Faq", id: "LIST" },
            ]
          : [{ type: "Faq", id: "LIST" }],
    }),
    adminFaqCreate: builder.mutation({
      query: (payload) => ({ url: "admin/faqs", method: "POST", body: payload }),
      invalidatesTags: [{ type: "Faq", id: "LIST" }],
    }),
    adminFaqUpdate: builder.mutation({
      query: ({ id, ...body }) => ({ url: `admin/faqs/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Faq", id }, { type: "Faq", id: "LIST" }],
    }),
    adminFaqDelete: builder.mutation({
      query: (id) => ({ url: `admin/faqs/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Faq", id: "LIST" }],
    }),
  }),
});

export const {
  useSendSupportMessageMutation,
  useAdminSupportListQuery,
  useAdminSupportGetQuery,
  useAdminSupportReplyMutation,
  useAdminSupportSetStatusMutation,
  useAdminSupportDeleteMutation,
  useAdminFaqListQuery,
  useAdminFaqCreateMutation,
  useAdminFaqUpdateMutation,
  useAdminFaqDeleteMutation,
} = helpApi;
