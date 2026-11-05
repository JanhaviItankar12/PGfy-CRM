import { baseApi } from "./baseApi";
import type { User } from "../feature/auth/authSlice";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

interface MeResponse {
  user: User;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Login
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),

    
  }),
});

export const {
  useLoginMutation,
 
} = authApi;