// frontend/src/store/api/apiSlice.js
/**
 * apiSlice
 * Short: Main RTK Query slice (public + account + admin) with helpers.
 
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/* --------------------------- URL helpers --------------------------- */

// [PRO] Route asset-like paths through API origin/proxy so uploads work in all envs.
const API_BASE_URL = (() => {
  const raw = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
  if (raw) return raw.endsWith("/api") ? raw : `${raw}/api`;
  return "/api";
})();

// Is API absolute (http://...)? If yes, extract its origin; if not, use /api as a proxy prefix.
const API_IS_ABS = /^https?:\/\//i.test(API_BASE_URL);
const API_ORIGIN = API_IS_ABS ? API_BASE_URL.replace(/\/api\/?$/, "") : "";     // e.g. http://localhost:4000
const API_PREFIX = API_IS_ABS ? "" : API_BASE_URL.replace(/\/+$/, "");          // e.g. "/api"

const toFileUrl = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;

  // [NEW LOGIC] Force /uploads/* through API origin/proxy
  // PRO: Prevents broken images when backend serves static uploads; works in both proxied and absolute setups.
  if (u.startsWith("/uploads/")) {
    return API_IS_ABS ? `${API_ORIGIN}${u}` : `${API_PREFIX}${u}`; // -> /api/uploads/...
  }
  if (u.startsWith("//")) {
    return `${typeof window !== "undefined" ? window.location.protocol : "http:"}${u}`;
  }
  // generic abs for other relative paths
  return API_IS_ABS
    ? `${API_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`
    : `${u}`; // leave as-is for same-origin assets
};

const toAbs = toFileUrl;

const toAbsAvatar = (u) => {
  if (!u) return "";
  let p = String(u).trim();

  // If it's just a filename, make it an uploads path
  const looksLikeFilename = !p.startsWith("/") && !/^https?:\/\//i.test(p) && !p.startsWith("data:");
  if (looksLikeFilename && !p.startsWith("uploads/")) p = `uploads/${p}`;

  // Ensure leading slash for uploads
  if (p.startsWith("uploads/")) p = `/${p}`;

  return toFileUrl(p);
};


/* --------------------------- normalizers --------------------------- */
const normalizeProductImages = (p) => {
  if (!p || typeof p !== "object") return p;
  const out = { ...p };
  if (Array.isArray(out.images)) out.images = out.images.map(toAbs);
  if (out.image) out.image = toAbs(out.image);
  if (!out.image && Array.isArray(out.images) && out.images.length) out.image = out.images[0];
  return out;
};
const normalizeProductsResponse = (res) => {
  if (res && Array.isArray(res.data)) return { ...res, data: res.data.map(normalizeProductImages) };
  if (Array.isArray(res)) return res.map(normalizeProductImages);
  return res;
};
const normalizeProductResponse = (res) => {
  if (res && res.data && typeof res.data === "object") {
    return { ...res, data: normalizeProductImages(res.data) };
  }
  if (res && typeof res === "object") return normalizeProductImages(res);
  return res;
};

const normalizePost = (p) => {
  if (!p || typeof p !== "object") return p;
  const out = { ...p };
  if (Array.isArray(out.media)) {
    out.media = out.media.map((m) => ({ ...m, url: toAbs(m?.url) }));
  }
  return out;
};
const normalizePostsResponse = (res) => {
  if (res && Array.isArray(res.data)) return { ...res, data: res.data.map(normalizePost) };
  if (Array.isArray(res)) return res.map(normalizePost);
  if (res && res.data) return { ...res, data: normalizePost(res.data) };
  return res;
};

/* --------------------------- token helpers --------------------------- */
const TOKEN_KEY = "authToken";
const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};
const setToken = (t) => {
  try {
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

/* --------------------------- baseQuery --------------------------- */
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    headers.set("Accept", "application/json");
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});
const baseQuery = async (args, api, extraOptions) => {
  try {
    return await rawBaseQuery(args, api, extraOptions);
  } catch (e) {
    return {
      error: {
        status: "FETCH_ERROR",
        error: e?.message || "Network error. Check VITE_API_URL and your Vite proxy config.",
      },
    };
  }
};

const normalizeUser = (resp) => {
  if (!resp) return resp;
  const user = resp.user || resp.data || resp;
  const avatarRaw = user.avatarUrl || user.avatar || user.photo || user.picture || "";
  const avatarAbs = toAbsAvatar(avatarRaw);
  return { ...user, avatarUrl: user.avatarUrl || avatarAbs, avatarAbs };
};

/* =============================== API =============================== */
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Products",
    "Sections",
    "Me",
    "Categories",
    "Orders",
    "PaymentMethods",
    "Addresses",
    "BrowsingHistory",
    "AdminProducts",
    "AdminPosts",
    "AdminUsers",
    "AdminStats",
    "AdminPerms",
    "AdminAudit",
    "AdminOrders",
    "PublicPosts",
    "PostComments",
    "Faq",
    // requested tags:
    "Users",
    "About",
  ],
  endpoints: (builder) => ({
    /* -------- PUBLIC POSTS -------- */
    getPublicPosts: builder.query({
      query: ({ page = 1, limit = 8, q = "" } = {}) =>
        ({ url: "posts", params: { page, limit, q } }),
      transformResponse: normalizePostsResponse,
      providesTags: (_res, _err, arg) => [
        { type: "PublicPosts", id: `PAGE-${arg?.page || 1}-${arg?.limit || 8}-${arg?.q || ""}` },
        { type: "PublicPosts", id: "LIST" },
      ],
    }),
    getPublicPost: builder.query({
      query: (id) => ({ url: `posts/${id}` }),
      transformResponse: normalizePostsResponse,
      providesTags: (_r, _e, id) => [{ type: "PublicPosts", id }],
    }),

    // COMMENTS (public)
    getPostComments: builder.query({
      query: (id) => ({ url: `posts/${id}/comments` }),
      providesTags: (_r, _e, id) => [{ type: "PostComments", id }],
    }),
    addPostComment: builder.mutation({
      query: ({ id, name, email, comment }) => ({
        url: `posts/${id}/comments`,
        method: "POST",
        body: { name, email, comment },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "PostComments", id }],
    }),

    // FAQs (public)
    getFaqs: builder.query({
      query: () => ({ url: "faqs", method: "GET" }),
      providesTags: (res) =>
        res?.data
          ? [
              ...res.data.map((f) => ({ type: "Faq", id: f._id })),
              { type: "Faq", id: "LIST" },
            ]
          : [{ type: "Faq", id: "LIST" }],
    }),

    // About (public)
    // [NEW LOGIC] Rename in-slice About to `getAboutPage` to avoid hook name clashing with aboutApi.getAbout.
    // PRO: Prevents “which useGetAboutQuery?” confusion in imports.
    getAboutPage: builder.query({
      query: () => "about",
      providesTags: [{ type: "About", id: "PAGE" }],
    }),

    /* -------- PRODUCTS (PUBLIC) -------- */
    getProducts: builder.query({
      query: (params) => ({ url: "products", params }),
      transformResponse: normalizeProductsResponse,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((p) => ({ type: "Products", id: p._id || p.slug })),
              { type: "Products", id: "LIST" },
            ]
          : [{ type: "Products", id: "LIST" }],
    }),
    getProduct: builder.query({
      query: (idOrSlug) => `products/${idOrSlug}`,
      transformResponse: normalizeProductResponse,
      providesTags: (_res, _err, id) => [{ type: "Products", id }],
    }),
    trackView: builder.mutation({
      query: (idOrSlug) => ({ url: `products/${idOrSlug}/track-view`, method: "POST" }),
    }),

    /* -------- PRODUCT REVIEWS (public per product) -------- */
    getProductReviews: builder.query({
      query: (idOrSlug) => ({ url: `products/${idOrSlug}/reviews` }),
      providesTags: (_r, _e, id) => [{ type: "Products", id: `REV-${id}` }],
    }),
    addProductReview: builder.mutation({
      query: ({ idOrSlug, rating, comment }) => ({
        url: `products/${idOrSlug}/reviews`,
        method: "POST",
        body: { rating, comment },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Products", id: `REV-${arg?.idOrSlug}` }],
    }),

    /* -------- HOME SECTIONS -------- */
    // [PRO] Transform supports both “flat sections” and “array data” shapes from different backends.
    getHomeSections: builder.query({
      query: () => `products/sections/home/data`,
      transformResponse: (res) => {
        if (res?.bestDeals || res?.featured || res?.computerAccessories || res?.flash) {
          const list = (a) => (Array.isArray(a) ? a.map(normalizeProductImages) : []);
          const mapCA = (ca) =>
            ca
              ? {
                  all: list(ca.all),
                  keyboardMouse: list(ca.keyboardMouse),
                  headphone: list(ca.headphone),
                  webcam: list(ca.webcam),
                  printer: list(ca.printer),
                }
              : { all: [], keyboardMouse: [], headphone: [], webcam: [], printer: [] };
          const mapFlash = (f) =>
            f
              ? {
                  flashSale: list(f.flashSale),
                  bestSellers: list(f.bestSellers),
                  topRated: list(f.topRated),
                  newArrival: list(f.newArrival),
                }
              : { flashSale: [], bestSellers: [], topRated: [], newArrival: [] };
          return {
            bestDeals: list(res.bestDeals),
            featured: list(res.featured),
            categories: Array.isArray(res.categories) ? res.categories : [],
            computerAccessories: mapCA(res.computerAccessories),
            flash: mapFlash(res.flash),
          };
        }
        if (Array.isArray(res?.data)) {
          const list = (a) => (Array.isArray(a) ? a.map(normalizeProductImages) : []);
          const byKey = Object.fromEntries(
            res.data.map((s) => [String(s.key || "").toLowerCase(), s.products || []])
          );
          return {
            bestDeals: list(byKey.deals || []),
            featured: list(byKey.latest || byKey.popular || []),
            categories: [],
            computerAccessories: { all: [], keyboardMouse: [], headphone: [], webcam: [], printer: [] },
            flash: { flashSale: [], bestSellers: [], topRated: [], newArrival: [] },
          };
        }
        return {
          bestDeals: [],
          featured: [],
          categories: [],
          computerAccessories: { all: [], keyboardMouse: [], headphone: [], webcam: [], printer: [] },
          flash: { flashSale: [], bestSellers: [], topRated: [], newArrival: [] },
        };
      },
      providesTags: [{ type: "Sections", id: "HOME" }],
    }),

    getCategories: builder.query({
      query: () => `products/categories`,
      providesTags: [{ type: "Categories", id: "ALL" }],
    }),

    /* -------- AUTH -------- */
    me: builder.query({
      query: () => ({ url: "auth/me" }),
      transformResponse: normalizeUser,
      providesTags: [{ type: "Me", id: "SELF" }],
    }),
    login: builder.mutation({
      query: (body) => ({ url: "auth/signin", method: "POST", body }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.token) setToken(data.token);
        } catch {}
      },
      invalidatesTags: [{ type: "Me", id: "SELF" }],
    }),
    register: builder.mutation({
      query: (body) => ({ url: "auth/signup", method: "POST", body }),
      invalidatesTags: [{ type: "Me", id: "SELF" }],
    }),
    logout: builder.mutation({
      query: () => ({ url: "auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          setToken("");
        }
      },
      invalidatesTags: [{ type: "Me", id: "SELF" }],
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: "auth/change-password", method: "POST", body }),
    }),
    verifyEmail: builder.mutation({
      query: ({ email, code }) => ({ url: "auth/verify-email", method: "POST", body: { email, code } }),
      invalidatesTags: [{ type: "Me", id: "SELF" }],
    }),
    resendVerify: builder.mutation({
      query: (email) => ({ url: "auth/resend-verify", method: "POST", body: { email } }),
    }),

    /* -------- PROFILE -------- */
    updateMe: builder.mutation({
      query: (body) => ({ url: "account/me", method: "PUT", body }),
      invalidatesTags: [{ type: "Me", id: "SELF" }, { type: "Addresses", id: "SELF" }],
    }),
    getAddresses: builder.query({
      query: () => "account/addresses",
      providesTags: [{ type: "Addresses", id: "SELF" }],
    }),
    updateAddress: builder.mutation({
      query: ({ type, data }) => ({ url: `account/addresses/${type}`, method: "PUT", body: data }),
      invalidatesTags: [{ type: "Addresses", id: "SELF" }, { type: "Me", id: "SELF" }],
    }),

    /* -------- ORDERS -------- */
    getOrders: builder.query({
      query: (params) => ({ url: "orders", params }),
      providesTags: (res) =>
        res?.data
          ? [
              ...res.data.map((o) => ({ type: "Orders", id: o._id || o.id })),
              { type: "Orders", id: "LIST" },
            ]
          : [{ type: "Orders", id: "LIST" }],
    }),
    getOrder: builder.query({
      query: (id) => `orders/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Orders", id }],
    }),
    getOrderReviews: builder.query({
      query: (orderId) => ({ url: `orders/${orderId}/reviews` }),
      providesTags: (_r, _e, orderId) => [{ type: "Orders", id: `REV-${orderId}` }],
    }),
    demoCheckout: builder.mutation({
      query: (body) => ({ url: "orders/checkout-demo", method: "POST", body }),
      invalidatesTags: [{ type: "Orders", id: "LIST" }],
    }),
    submitReview: builder.mutation({
      query: ({ orderId, ...body }) => ({ url: `orders/${orderId}/reviews`, method: "POST", body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Orders", id: "LIST" },
        arg?.orderId ? { type: "Orders", id: arg.orderId } : null,
        arg?.orderId ? { type: "Orders", id: `REV-${arg.orderId}` } : null,
      ].filter(Boolean),
    }),

    /* -------- PAYMENTS -------- */
    getPaymentMethods: builder.query({
      query: () => "payments/methods",
      providesTags: [{ type: "PaymentMethods", id: "LIST" }],
    }),
    addPaymentMethod: builder.mutation({
      query: (body) => ({ url: "payments/methods", method: "POST", body }),
      invalidatesTags: [{ type: "PaymentMethods", id: "LIST" }],
    }),
    updatePaymentMethod: builder.mutation({
      query: ({ id, ...body }) => ({ url: `payments/methods/${id}`, method: "PUT", body }),
      invalidatesTags: [{ type: "PaymentMethods", id: "LIST" }],
    }),
    deletePaymentMethod: builder.mutation({
      query: (id) => ({ url: `payments/methods/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "PaymentMethods", id: "LIST" }],
    }),
    // [PRO] Some backends expose either a global default route or an item-scoped default route.
    //       Try the global one first, then fall back.
    setDefaultPaymentMethod: builder.mutation({
      async queryFn({ id }, _api, _extra, baseQ) {
        const r1 = await baseQ({
          url: "payments/methods/default",
          method: "PUT",
          body: { id },
        });
        if (!r1.error) return r1;

        const r2 = await baseQ({
          url: `payments/methods/${id}/default`,
          method: "PUT",
        });
        return r2.error ? { error: r2.error } : r2;
      },
      invalidatesTags: [
        { type: "PaymentMethods", id: "LIST" },
        { type: "Me", id: "SELF" }, // me.defaultPaymentMethod may change
      ],
    }),

    /* -------- Browsing history -------- */
    getBrowsingHistory: builder.query({
      query: ({ page = 1, limit = 12 } = {}) =>
        `account/browsing-history?page=${page}&limit=${limit}`,
      providesTags: ["BrowsingHistory"],
    }),
    logProductView: builder.mutation({
      query: (body) => ({
        url: "track/view",
        method: "POST",
        body,
      }),
      invalidatesTags: ["BrowsingHistory"],
    }),

    // coupon
    applyCouponValidate: builder.mutation({
      query: ({ code, lines }) => ({
        url: "coupons/validate",
        method: "POST",
        body: { code, lines },
      }),
    }),

    /* ========================== ADMIN ========================== */
    adminGetProducts: builder.query({
      query: (params) => ({ url: "admin/products", params }),
      providesTags: [{ type: "AdminProducts", id: "LIST" }],
    }),
    adminCreateProduct: builder.mutation({
      query: (body) => ({ url: "admin/products", method: "POST", body }),
      invalidatesTags: [
        { type: "AdminProducts", id: "LIST" },
        { type: "Products", id: "LIST" },
        { type: "AdminStats", id: "CAT_VIEWS" },
        { type: "AdminStats", id: "ITEM_VIEWS" },
      ],
    }),
    adminUpdateProduct: builder.mutation({
      query: ({ id, ...body }) => ({ url: `admin/products/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AdminProducts", id: "LIST" },
        { type: "Products", id },
        { type: "AdminStats", id: "CAT_VIEWS" },
        { type: "AdminStats", id: "ITEM_VIEWS" },
      ],
    }),
    adminDeleteProduct: builder.mutation({
      query: (id) => ({ url: `admin/products/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "AdminProducts", id: "LIST" },
        { type: "Products", id: "LIST" },
        { type: "AdminStats", id: "CAT_VIEWS" },
        { type: "AdminStats", id: "ITEM_VIEWS" },
      ],
    }),

    adminGetPosts: builder.query({
      query: () => ({ url: "admin/posts" }),
      transformResponse: normalizePostsResponse,
      providesTags: [{ type: "AdminPosts", id: "LIST" }],
    }),
    adminCreatePost: builder.mutation({
      query: (body) => ({ url: "admin/posts", method: "POST", body }),
      invalidatesTags: [{ type: "AdminPosts", id: "LIST" }, { type: "PublicPosts", id: "LIST" }],
    }),
    adminUpdatePost: builder.mutation({
      query: ({ id, ...body }) => ({ url: `admin/posts/${id}`, method: "PUT", body }),
      invalidatesTags: [{ type: "AdminPosts", id: "LIST" }, { type: "PublicPosts", id: "LIST" }],
    }),
    adminDeletePost: builder.mutation({
      query: (id) => ({ url: `admin/posts/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "AdminPosts", id: "LIST" }, { type: "PublicPosts", id: "LIST" }],
    }),

    // ----- USERS / ACL (Admin) -----
    adminGetUsers: builder.query({
      query: () => ({ url: "admin/users" }),
      // Provide both tag families so either can invalidate the list
      providesTags: [{ type: "AdminUsers", id: "LIST" }, { type: "Users", id: "LIST" }],
    }),
    adminCreateUser: builder.mutation({
      query: (body) => ({ url: "admin/users", method: "POST", body }),
      invalidatesTags: [{ type: "AdminUsers", id: "LIST" }, { type: "Users", id: "LIST" }, { type: "About", id: "PAGE" }],
    }),
    adminSetUserRole: builder.mutation({
      query: ({ id, ...body }) => ({ url: `admin/users/${id}/role`, method: "PUT", body }),
      invalidatesTags: [{ type: "AdminUsers", id: "LIST" }, { type: "Users", id: "LIST" }],
    }),
    // NOTE: This is a different (non-ACL-prefixed) permissions API than aclApi.
    adminGetPermissions: builder.query({
      query: () => ({ url: "admin/permissions" }),
      providesTags: [{ type: "AdminPerms", id: "LIST" }],
    }),
    adminSetUserPermissions: builder.mutation({
      query: ({ id, ...body }) => ({ url: `admin/users/${id}/permissions`, method: "PUT", body }),
      invalidatesTags: [{ type: "AdminUsers", id: "LIST" }, { type: "Users", id: "LIST" }],
    }),
    adminDeleteUser: builder.mutation({
      query: (id) => ({ url: `admin/users/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "AdminUsers", id: "LIST" }, { type: "Users", id: "LIST" }, { type: "About", id: "PAGE" }],
    }),
    // Update a user's About/team settings (avatar/title/order/showOnAbout)
    adminSetUserAbout: builder.mutation({
      query: ({ id, ...body }) => ({ url: `admin/users/${id}/about`, method: "PUT", body }),
      invalidatesTags: [
        { type: "AdminUsers", id: "LIST" },
        { type: "Users", id: "LIST" },
        { type: "About", id: "PAGE" }, // refresh public about page/team
      ],
    }),

    adminGetAuditLogs: builder.query({
      query: (params) => ({ url: "admin/audit", params }),
      providesTags: [{ type: "AdminAudit", id: "LIST" }],
    }),

    // Admin stats
    adminSalesStats: builder.query({
      query: (year) => ({ url: "admin/stats/sales", params: { year } }),
      providesTags: [{ type: "AdminStats", id: "SALES" }],
    }),
    adminTopProducts: builder.query({
      query: (limit = 10) => ({ url: "admin/stats/top-products", params: { limit } }),
      providesTags: [{ type: "AdminStats", id: "TOP_PRODUCTS" }],
    }),
    adminCategoryViews: builder.query({
      query: () => ({ url: "admin/stats/category-views" }),
      providesTags: [{ type: "AdminStats", id: "CAT_VIEWS" }],
    }),
    adminItemViews: builder.query({
      query: (limit = 10) => ({ url: "admin/stats/item-views", params: { limit } }),
      providesTags: [{ type: "AdminStats", id: "ITEM_VIEWS" }],
    }),

    // Admin order updates (if your backend exposes these)
    adminUpdateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `orders/${id}/status`, method: "PUT", body: { status } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Orders", id }],
    }),
    adminUpdateOrderStage: builder.mutation({
      query: ({ id, stage }) => ({ url: `orders/${id}/stage`, method: "PUT", body: { stage } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Orders", id }],
    }),
    adminListOrders: builder.query({
      query: (params) => ({ url: "admin/orders", params }),
      providesTags: (res, _e, arg) => [
        { type: "AdminOrders", id: `PAGE-${JSON.stringify(arg || {})}` },
        { type: "AdminOrders", id: "LIST" },
      ],
    }),
    adminExportOrdersCsv: builder.mutation({
      query: (params) => ({
        url: "admin/orders/export.csv",
        method: "GET",
        params,
        responseHandler: async (response) => await response.text(),
        headers: { Accept: "text/csv" },
      }),
    }),
  }),
});

/* ----------------------------- hooks ----------------------------- */
export const {
  // public posts
  useGetPublicPostsQuery,
  useGetPublicPostQuery,
  useGetPostCommentsQuery,
  useAddPostCommentMutation,

  // products (public)
  useGetProductsQuery,
  useGetProductQuery,
  useTrackViewMutation,
  useGetProductReviewsQuery,
  useAddProductReviewMutation,

  // home + categories
  useGetHomeSectionsQuery,
  useGetCategoriesQuery,

  // auth
  useMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useChangePasswordMutation,
  useVerifyEmailMutation,
  useResendVerifyMutation,

  // profile
  useUpdateMeMutation,
  useGetAddressesQuery,
  useUpdateAddressMutation,

  // orders
  useGetOrdersQuery,
  useGetOrderQuery,
  useGetOrderReviewsQuery,
  useDemoCheckoutMutation,
  useSubmitReviewMutation,

  // payments
  useGetPaymentMethodsQuery,
  useAddPaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
  useSetDefaultPaymentMethodMutation,

  // browsing history
  useGetBrowsingHistoryQuery,
  useLogProductViewMutation,

  // FAQs + About
  useGetFaqsQuery,
  useGetAboutPageQuery, // [NEW NAME] to avoid clashing with aboutApi’s useGetAboutQuery

  // admin products/posts/users/audit
  useAdminGetProductsQuery,
  useAdminCreateProductMutation,
  useAdminUpdateProductMutation,
  useAdminDeleteProductMutation,
  useAdminGetPostsQuery,
  useAdminCreatePostMutation,
  useAdminUpdatePostMutation,
  useAdminDeletePostMutation,

  useAdminGetUsersQuery,
  useAdminCreateUserMutation,
  useAdminSetUserRoleMutation,
  useAdminGetPermissionsQuery,
  useAdminSetUserPermissionsMutation,
  useAdminDeleteUserMutation,
  useAdminSetUserAboutMutation,

  useAdminGetAuditLogsQuery,

  // admin stats
  useAdminSalesStatsQuery,
  useAdminTopProductsQuery,
  useAdminCategoryViewsQuery,
  useAdminItemViewsQuery,

  // admin orders
  useAdminListOrdersQuery,
  useAdminExportOrdersCsvMutation,
  useAdminUpdateOrderStatusMutation,
  useAdminUpdateOrderStageMutation,

  // coupon
  useApplyCouponValidateMutation,
} = apiSlice;
