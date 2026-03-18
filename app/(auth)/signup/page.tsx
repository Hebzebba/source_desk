"use client";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { signup, SignupErrors } from "../../action/auth";

export default function SignupForm() {
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [state, action, pending] = useActionState(signup, undefined);

  const errors = (state?.errors ?? {}) as SignupErrors;

  useEffect(() => {
    if (errors.form?.length) {
      toast.error(errors.form.join(" "));
    }
  }, [errors.form]);

  useEffect(() => {
    if (state?.success) {
      toast.success("Account created successfully");
      setValues({ firstName: "", lastName: "", email: "", password: "" });
    }
  }, [state?.success]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 px-4">
        <form
          action={action}
          className="w-full max-w-md rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl p-8 space-y-6"
        >
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              Create your account
            </h2>
            <p className="text-sm text-gray-500">Start your journey with us</p>
          </div>

          {/* First Name */}
          <div className="space-y-1">
            <label
              htmlFor="firstName"
              className="text-xs font-medium text-gray-600"
            >
              First Name
            </label>

            <input
              id="firstName"
              name="firstName"
              value={values.firstName}
              onChange={onChange}
              placeholder="John"
              className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            />

            {errors.firstName?.map((err) => (
              <p key={err} className="text-xs text-red-500">
                {err}
              </p>
            ))}
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <label
              htmlFor="lastName"
              className="text-xs font-medium text-gray-600"
            >
              Last Name
            </label>

            <input
              id="lastName"
              name="lastName"
              value={values.lastName}
              onChange={onChange}
              placeholder="Doe"
              className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            />

            {errors.lastName?.map((err) => (
              <p key={err} className="text-xs text-red-500">
                {err}
              </p>
            ))}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-medium text-gray-600"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              value={values.email}
              onChange={onChange}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            />

            {errors.email?.map((err) => (
              <p key={err} className="text-xs text-red-500">
                {err}
              </p>
            ))}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-xs font-medium text-gray-600"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={values.password}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            />

            {errors.password?.map((err) => (
              <p key={err} className="text-xs text-red-500">
                {err}
              </p>
            ))}
          </div>

          {/* Submit */}
          <button
            disabled={pending}
            type="submit"
            className="w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-800 focus:ring-2 focus:ring-black/20 disabled:opacity-50"
          >
            {pending ? "Creating account..." : "Sign Up"}
          </button>

          {/* Link */}
          <div className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a
              href="/signin"
              className="font-medium text-gray-700 hover:text-black transition"
            >
              Sign in
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
