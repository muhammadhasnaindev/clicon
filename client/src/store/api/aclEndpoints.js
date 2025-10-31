// frontend/src/store/api/aboutApi.js
/**
 * aboutApi
 * Short: Public About endpoints + admin “about” edits.
 
 */

import { apiSlice } from "./apiSlice";

export const aboutApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public About data (hero + team list)
    getAbout: builder.query({
      query: () => "/about",
      providesTags: ["About"],
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }),

    // Admin: edit About page hero/section
    updateAbout: builder.mutation({
      query: (body) => ({ url: "/admin/pages/about", method: "PUT", body }),
      invalidatesTags: ["About"],
    }),

    // Admin: per-user team settings (showOnAbout, title, order, avatar)
    setUserAbout: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/users/${id}/about`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Users", "About"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAboutQuery,          // keep name here (canonical)
  useUpdateAboutMutation,
  useSetUserAboutMutation,
} = aboutApi;
