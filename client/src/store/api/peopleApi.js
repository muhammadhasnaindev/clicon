// src/store/api/peopleApi.js
// ------------------------------------------------------------------
// People/Customers/Staff endpoints (admin area).
// No behavior changes; added small intent comments and kept tags stable.
// ------------------------------------------------------------------
import { apiSlice } from "./apiSlice";

export const peopleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    adminListCustomers: builder.query({
      query: ({ page = 1, limit = 20, q = "", start, end, minOrders = 1, deviceTop = "" } = {}) => ({
        url: "admin/customers",
        params: {
          page, limit, q,
          ...(start ? { start } : {}),
          ...(end ? { end } : {}),
          ...(minOrders ? { minOrders } : {}),
          ...(deviceTop ? { deviceTop } : {}),
        },
      }),
      providesTags: (_r, _e, arg) => [
        { type: "AdminUsers", id: `CUSTOMERS-${JSON.stringify(arg || {})}` },
      ],
    }),
    adminExportCustomersCsv: builder.mutation({
      // Kept as GET text/csv to match typical CSV export behavior
      query: ({ q = "", start, end, minOrders = 1, deviceTop = "" } = {}) => ({
        url: "admin/customers/export.csv",
        method: "GET",
        params: {
          ...(q ? { q } : {}),
          ...(start ? { start } : {}),
          ...(end ? { end } : {}),
          ...(minOrders ? { minOrders } : {}),
          ...(deviceTop ? { deviceTop } : {}),
        },
        responseHandler: async (resp) => await resp.text(),
        headers: { Accept: "text/csv" },
      }),
    }),
    adminListStaff: builder.query({
      query: ({ page = 1, limit = 20, q = "" } = {}) => ({
        url: "admin/staff",
        params: { page, limit, q },
      }),
      providesTags: (_r, _e, arg) => [
        { type: "AdminUsers", id: `STAFF-${JSON.stringify(arg || {})}` },
      ],
    }),
    adminGetUserActivity: builder.query({
      query: (id) => ({ url: `admin/users/${id}/activity` }),
      providesTags: (_r, _e, id) => [{ type: "AdminUsers", id: `ACT-${id}` }],
    }),
    adminGetLoginLogs: builder.query({
      query: ({ id, limit = 50 }) => ({ url: `admin/users/${id}/login-logs`, params: { limit } }),
      providesTags: (_r, _e, arg) => [{ type: "AdminUsers", id: `LOGIN-${arg?.id}` }],
    }),
    adminGetViews: builder.query({
      query: ({ id, limit = 50 }) => ({ url: `admin/users/${id}/views`, params: { limit } }),
      providesTags: (_r, _e, arg) => [{ type: "AdminUsers", id: `VIEWS-${arg?.id}` }],
    }),
  }),
});

export const {
  useAdminListCustomersQuery,
  useAdminExportCustomersCsvMutation,
  useAdminListStaffQuery,
  useAdminGetUserActivityQuery,
  useAdminGetLoginLogsQuery,
  useAdminGetViewsQuery,
} = peopleApi;
