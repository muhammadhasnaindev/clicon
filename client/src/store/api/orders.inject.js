// src/store/api/orders.inject.js
import { apiSlice } from "./apiSlice";
const unwrap = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

export const ordersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ----- USER -----
    getOrders: builder.query({
      query: (params) => ({ url: "orders", params }),
      transformResponse: unwrap,
      /* ===================== NEW LOGIC =====================
       * - Make list queries feel “live”: refetch on focus/reconnect
       * - Keep a short cache so back/forward stays snappy
       * ==================================================== */
      refetchOnFocus: true,
      refetchOnReconnect: true,
      keepUnusedDataFor: 30,
      providesTags: (res) => {
        /* ===================== NEW LOGIC =====================
         * - Normalize multiple possible server shapes
         * - Always include LIST tag
         * ==================================================== */
        const list = Array.isArray(res) ? res : res?.data || res?.results || [];
        return list?.length
          ? [
              ...list.map((o) => ({ type: "Orders", id: o._id || o.id })),
              { type: "Orders", id: "LIST" },
            ]
          : [{ type: "Orders", id: "LIST" }];
      },
    }),

    getOrder: builder.query({
      query: (id) => `orders/${id}`,
      transformResponse: unwrap,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      providesTags: (_r, _e, id) => [{ type: "Orders", id }],
    }),

    trackOrder: builder.mutation({
      query: (body) => ({ url: "orders/track", method: "POST", body }),
      transformResponse: unwrap,
    }),

    cancelOrder: builder.mutation({
      query: (id) => ({ url: `orders/${id}/cancel`, method: "POST" }),
      /* ===================== NEW LOGIC =====================
       * - Invalidate both user+admin tags so all views stay in sync
       * ==================================================== */
      invalidatesTags: (_r, _e, id) => [
        { type: "Orders", id },
        { type: "Orders", id: "LIST" },
        { type: "AdminOrders", id },
        { type: "AdminOrders", id: "LIST" },
      ],
    }),

    confirmDelivery: builder.mutation({
      query: (id) => ({ url: `orders/${id}/confirm-delivery`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Orders", id },
        { type: "Orders", id: "LIST" },
        { type: "AdminOrders", id },
        { type: "AdminOrders", id: "LIST" },
      ],
    }),

    updateOrderStatus: builder.mutation({
      query: ({ id, ...body }) => ({ url: `orders/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Orders", id },
        { type: "Orders", id: "LIST" },
        { type: "AdminOrders", id },
        { type: "AdminOrders", id: "LIST" },
      ],
    }),

    // ----- ADMIN -----
    adminListOrders: builder.query({
      query: (params) => ({ url: "admin/orders", params }),
      refetchOnFocus: true,
      refetchOnReconnect: true,
      keepUnusedDataFor: 30,
      providesTags: (res) =>
        res?.data
          ? [
              ...res.data.map((o) => ({ type: "AdminOrders", id: o._id || o.id })),
              { type: "AdminOrders", id: "LIST" },
            ]
          : [{ type: "AdminOrders", id: "LIST" }],
    }),

    adminUpdateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `admin/orders/${id}/status`, method: "PUT", body: { status } }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AdminOrders", id },
        { type: "AdminOrders", id: "LIST" },
        { type: "Orders", id },
        { type: "Orders", id: "LIST" },
      ],
    }),

    adminUpdateOrderStage: builder.mutation({
      query: ({ id, stage }) => ({ url: `admin/orders/${id}/stage`, method: "PUT", body: { stage } }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AdminOrders", id },
        { type: "AdminOrders", id: "LIST" },
        { type: "Orders", id },
        { type: "Orders", id: "LIST" },
      ],
    }),

    adminDeleteOrder: builder.mutation({
      query: (id) => ({ url: `admin/orders/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "AdminOrders", id: "LIST" }, { type: "Orders", id: "LIST" }],
    }),

    adminExportOrdersCsv: builder.mutation({
      query: (body) => ({ url: "admin/orders/export", method: "POST", body }),
    }),

    // NEW: admin adds a timeline event (used after status/stage change)
    adminAddOrderEvent: builder.mutation({
      query: ({ id, type, text, at }) => ({
        url: `admin/orders/${id}/events`,
        method: "POST",
        body: { type, text, at },
      }),
      transformResponse: unwrap,
      /* ===================== NEW LOGIC =====================
       * - Invalidate both namespaces so detail pages and lists refresh
       * ==================================================== */
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AdminOrders", id },
        { type: "AdminOrders", id: "LIST" },
        { type: "Orders", id },
        { type: "Orders", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  // user
  useGetOrdersQuery,
  useGetOrderQuery,
  useLazyGetOrderQuery,
  useTrackOrderMutation,
  useCancelOrderMutation,
  useConfirmDeliveryMutation,
  useUpdateOrderStatusMutation,
  // admin
  useAdminListOrdersQuery,
  useAdminUpdateOrderStatusMutation,
  useAdminUpdateOrderStageMutation,
  useAdminDeleteOrderMutation,
  useAdminExportOrdersCsvMutation,
  useAdminAddOrderEventMutation, // NEW
} = ordersApi;
