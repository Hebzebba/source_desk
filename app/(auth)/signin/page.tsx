"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProgressSpinner } from "primereact/progressspinner";
import toast, { Toaster } from "react-hot-toast";

async function login(e: React.FormEvent<HTMLFormElement>, setLoading: (v: boolean) => void) {
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
    // useEffect handles role-based redirect once session updates
  } else if (res?.error) {
    toast.error("Invalid credentials");
  }
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      const role = session.user.role;
      if (role === "admin") router.replace("/ui/admin");
      else if (role === "employee") router.replace("/ui/employee");
      else router.replace("/ui/customer");
    }
  }, [status, session, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200">
        <ProgressSpinner style={{ width: "50px", height: "50px" }} strokeWidth="4" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 px-4">
        <form
          onSubmit={(e) => login(e, setLoading)}
          className="w-full max-w-md rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl p-8 space-y-6"
        >
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Sign in</h2>
            <p className="text-sm text-gray-500">Welcome back! Please enter your credentials.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">
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
              <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1">
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
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="mx-3 text-xs text-gray-400">or</span>
            <div className="flex-grow border-t border-gray-200" />
          </div>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/signin" }, { prompt: "select_account" })}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>
          <div className="text-center pt-2">
            <span className="text-xs text-gray-500">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="underline hover:text-slate-900 transition">
                Sign up
              </a>
            </span>
          </div>
        </form>
      </div>
    </>
  );
}
