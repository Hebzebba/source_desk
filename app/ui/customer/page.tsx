import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CustomerDashboardClient from "./components/CustomerDashboardClient";
import { PrimeReactProvider } from "primereact/api";
import SessionWrapper from "./components/SessionWrapper";

export default async function CustomerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/signin");
  if (session.user.role !== "customer") redirect("/unauthorized");

  return (
    <SessionWrapper>
      <PrimeReactProvider>
        <CustomerDashboardClient />
      </PrimeReactProvider>
    </SessionWrapper>
  );
}
