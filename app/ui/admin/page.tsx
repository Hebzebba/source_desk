// Example: app/dashboard/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./components/AdminDashboardClient";
import { PrimeReactProvider } from "primereact/api";
import SessionWrapper from "./components/SessionWrapper";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/signin");
  if (session.user.role !== "admin") redirect("/unauthorized");

  return (
    <SessionWrapper>
      <PrimeReactProvider>
        <AdminDashboardClient />
      </PrimeReactProvider>
    </SessionWrapper>
  );
}
