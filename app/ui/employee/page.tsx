import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EmployeeDashboardClient from "./components/EmployeeDashboardClient";
import { PrimeReactProvider } from "primereact/api";
import SessionWrapper from "./components/SessionWrapper";

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/signin");
  if (session.user.role !== "employee") redirect("/unauthorized");

  return (
    <SessionWrapper>
      <PrimeReactProvider>
        <EmployeeDashboardClient />
      </PrimeReactProvider>
    </SessionWrapper>
  );
}
