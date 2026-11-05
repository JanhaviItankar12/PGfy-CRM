
import { useState } from "react";
import type { FormEvent } from "react";
import { useLoginMutation } from "../services/authApi";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../app/store";

import { useNavigate } from "react-router-dom";
import { setCredentials } from "../feature/auth/authSlice";

import { store } from "../app/store"; // Import the store to access the state

export interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginProps {
  onLogin?: (credentials: LoginCredentials) => Promise<void>;
  onForgotPassword?: () => void;
}

export default function Login({
  onLogin,
  onForgotPassword,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [login, { isLoading }] = useLoginMutation();

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    //check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    //check password  format and length
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 characters long and contain at least one letter and one number.");
      return;
    }


    try {
      const response = await login({
        email: email.trim(),
        password,
      }).unwrap();



      // Store user and token in Redux
      dispatch(
        setCredentials({
          user: response.user,
          token: response.token,
        })
      );

      console.log("Login response token:", response.token);
      console.log("Redux state:", store.getState().auth);


      // Save authentication details for both roles
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      // Redirect according to user role
      if (response.user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (response.user.role === "SALES_EXECUTIVE") {
        navigate("/executive/dashboard");
      } else {
        setError("Invalid user role.");
      }

    } catch (err: any) {
      setError(
        err?.data?.message ||
        err?.message ||
        "Unable to sign in. Please try again."
      );
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F8FF] px-4 py-8">

      {/* Background decoration */}
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />

      <div className="relative w-full max-w-[420px]">

        {/* Login Card */}
        <div className="rounded-2xl mt-10 border border-blue-100 bg-white p-8 shadow-[0_15px_50px_rgba(30,64,175,0.08)] sm:p-10">

          {/* Logo */}
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 text-2xl font-bold text-white shadow-md shadow-blue-200">
              P
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#163A70]">
                PGfy
              </h2>
              <p className="text-[11px] font-medium tracking-wider text-slate-400">
                MANAGEMENT PORTAL
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to access your PGfy management dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="name@pgfy.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-[#FAFCFF] px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFCFF] px-4 py-3 pr-16 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-slate-500 transition hover:text-blue-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:from-blue-800 hover:to-blue-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          {/* Footer */}
          <div className="mt-8 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-400">
              Secure access for{" "}
              <span className="font-semibold text-slate-600">
                Admins & Sales Executives
              </span>
            </p>
          </div>

        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} PGfy. All rights reserved.
        </p>

      </div>
    </main>
  );
}
