import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const baseApi = createApi({
  reducerPath: "api",

  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL + "/api",

    prepareHeaders: (headers, { getState }) => {
        const state = getState() as { auth: { token: string | null } };
      const token = state.auth?.token;

      console.log("Token from state:", token); // Debugging line

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),

  tagTypes: [
    "User",
    "Leads",
    "Calls",
    "FollowUps",
    "Dashboard",
    "Executives"
  ],

  endpoints: () => ({}),
});