"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import EmployeeRequestTable from "./EmployeeRequestTable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";

import { Button } from "primereact/button";
import { Sidebar } from "primereact/sidebar";
import { Badge } from "primereact/badge";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import { Ripple } from "primereact/ripple";

const SIDEBAR_LINKS = [
  { key: "dashboard", label: "Dashboard", icon: "pi pi-chart-bar", iconColor: "#6366f1" },
  { key: "requests", label: "Requests", icon: "pi pi-clipboard", iconColor: "#f59e0b" },
];

interface RequestData {
  id: string;
  customerId: string;
  description: string;
  quotePrice: number;
  finalPrice: number;
  status: string;
  createdAt: string;
}

export default function EmployeeDashboardClient() {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState("dashboard");
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    fetch("/api/request")
      .then((res) => res.json())
      .then((data: RequestData[]) => {
        setRequests(data);
      })
      .finally(() => setDashboardLoading(false));
  }, []);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const quotedCount = requests.filter((r) => r.quotePrice > 0).length;
  const completedCount = requests.filter((r) => r.status === "DONE").length;

  const summary = [
    { icon: "pi pi-clock", bg: "#fff7ed", iconColor: "#f59e0b", label: "Pending Requests", value: pendingCount },
    { icon: "pi pi-dollar", bg: "#eff6ff", iconColor: "#3b82f6", label: "Quoted", value: quotedCount },
    { icon: "pi pi-check-circle", bg: "#f0fdf4", iconColor: "#16a34a", label: "Completed", value: completedCount },
  ];

  const sidebarContent = (
    <div className="flex flex-column h-full">
      <div className="flex align-items-center gap-2 px-3 pt-3 pb-2">
        <i className="pi pi-bolt" style={{ fontSize: "1.5rem", color: "#6366f1" }} />
        <span className="text-xl font-bold" style={{ color: "#4338ca" }}>
          SourceDesk
        </span>
      </div>
      <Divider className="my-2" />
      <nav className="flex flex-column gap-1 px-2 grow">
        {SIDEBAR_LINKS.map((link) => {
          const isActive = activeRoute === link.key;
          return (
            <div
              key={link.key}
              className="flex align-items-center gap-3 px-3 py-2 border-round-lg cursor-pointer transition-colors transition-duration-200 p-ripple"
              style={{ backgroundColor: isActive ? "#eef2ff" : undefined }}
              onClick={() => {
                setActiveRoute(link.key);
                setSidebarOpen(false);
              }}
            >
              <i className={link.icon} style={{ fontSize: "1.1rem", color: link.iconColor }} />
              <span className="font-semibold" style={{ color: isActive ? "#4f46e5" : "#64748b" }}>
                {link.label}
              </span>
              <Ripple />
            </div>
          );
        })}
      </nav>
      <Divider className="my-2" />
      <div className="px-3 pb-3">
        <div className="flex align-items-center gap-2 mb-2">
          <Avatar
            label={session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "E"}
            shape="circle"
            size="normal"
            style={{ backgroundColor: "#14b8a6", color: "#fff" }}
          />
          <div className="flex-1">
            <div className="font-semibold text-sm" style={{ color: "#334155" }}>
              {session?.user?.name || "Employee"}
            </div>
            <div className="text-xs" style={{ color: "#94a3b8" }}>
              {session?.user?.email || ""}
            </div>
          </div>
        </div>
        <Button
          label="Logout"
          icon="pi pi-sign-out"
          severity="secondary"
          outlined
          size="small"
          className="w-full"
          onClick={() => signOut({ callbackUrl: "/signin" })}
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen surface-ground">
      {/* Desktop Sidebar */}
      <div className="hidden md:block surface-card shadow-2 fixed left-0 top-0 h-screen overflow-y-auto z-5" style={{ width: "260px" }}>
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <Sidebar visible={sidebarOpen} onHide={() => setSidebarOpen(false)} className="w-18rem p-0" showCloseIcon={false}>
        {sidebarContent}
      </Sidebar>

      {/* Main content */}
      <div className="flex-1 flex flex-column min-h-screen employee-main" style={{ marginLeft: 0 }}>
        <style>{`@media (min-width: 768px) { .employee-main { margin-left: 260px !important; } }`}</style>
        {/* Header */}
        <div className="shadow-2 px-4 py-3 flex align-items-center justify-content-between sticky top-0 z-4" style={{ backgroundColor: "#ffffff" }}>
          <div className="flex align-items-center gap-3">
            <Button icon="pi pi-bars" text rounded className="md:hidden" onClick={() => setSidebarOpen(true)} />
            <div>
              <div className="text-xl font-bold" style={{ color: "#4338ca" }}>
                {SIDEBAR_LINKS.find((l) => l.key === activeRoute)?.label}
              </div>
              <div className="text-sm" style={{ color: "#94a3b8" }}>
                {activeRoute === "dashboard" ? "Overview & quote management" : "View and set quote prices"}
              </div>
            </div>
          </div>
          <div className="flex align-items-center gap-3">
            <Button icon="pi pi-bell" text rounded className="p-overlay-badge">
              <Badge value={String(pendingCount)} severity="danger" />
            </Button>
            <Avatar
              label={session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "E"}
              shape="circle"
              className="hidden md:flex"
              style={{ backgroundColor: "#14b8a6", color: "#fff" }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="p-3 md:p-5 flex-1">
          {activeRoute === "dashboard" && (
            <div className="flex flex-column gap-4">
              {/* Summary cards */}
              <div className="grid">
                {summary.map((item) => (
                  <div key={item.label} className="col-12 sm:col-6 lg:col-4">
                    <div className="surface-card border-round-xl shadow-2 p-4 flex align-items-center gap-4 h-full">
                      <div
                        className="flex align-items-center justify-content-center border-round-lg"
                        style={{ width: "3rem", height: "3rem", backgroundColor: item.bg }}
                      >
                        <i className={item.icon} style={{ fontSize: "1.3rem", color: item.iconColor }} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold" style={{ color: "#4338ca" }}>
                          {item.value}
                        </div>
                        <div className="text-sm mt-1" style={{ color: "#64748b" }}>
                          {item.label}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeRoute === "requests" && (
            <div className="surface-card border-round-xl shadow-2 p-4">
              <EmployeeRequestTable />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
