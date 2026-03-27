import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl p-8 space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
        <p className="text-sm text-gray-500">You do not have permission to view that page.</p>
        <Link
          href="/signin"
          className="inline-block mt-2 rounded-lg bg-slate-900 text-white px-6 py-2 text-sm font-semibold hover:bg-slate-800 transition"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
