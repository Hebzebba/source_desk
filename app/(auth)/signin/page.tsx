"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

async function login(
  e: React.FormEvent<HTMLFormElement>,
  setLoading: (v: boolean) => void,
  router: ReturnType<typeof useRouter>,
) {
  e.preventDefault();
  setLoading(true);
  const form = new FormData(e.currentTarget);
  const res = await signIn("credentials", {
    email: form.get("email"),
    password: form.get("password"),
    redirect: false,
  });
  setLoading(false);

  if (res?.ok && !res.error) {
    toast.success("Login successful!");

    // Wait for session to update, then fetch it
    setTimeout(async () => {
      const session = await getSession();
      if (session?.user?.role === "admin") {
        router.push("/ui/admin");
      } else if (session?.user?.role === "employee") {
        router.push("/ui/employee");
      } else {
        router.push("/ui/customer");
      }
    }, 500);
  } else if (res?.error) {
    toast.error("Invalid credentials");
  }
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 px-4">
        <form
          onSubmit={(e) => login(e, setLoading, router)}
          className="w-full max-w-md rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl p-8 space-y-6"
        >
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Sign in</h2>
            <p className="text-sm text-gray-500">
              Welcome back! Please enter your credentials.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-gray-900 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-gray-900 shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 text-white py-2 font-semibold hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="text-center pt-2">
            <span className="text-xs text-gray-500">
              Don&apos;t have an account?{" "}
              <a
                href="/signup"
                className="underline hover:text-slate-900 transition"
              >
                Sign up
              </a>
            </span>
          </div>
        </form>
      </div>
    </>
  );
}
