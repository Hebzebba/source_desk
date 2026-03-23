"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import RequestTable from "./RequestTable";
import EmployeeTable from "./EmployeeTable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";

import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { Sidebar } from "primereact/sidebar";
import { Badge } from "primereact/badge";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import { Ripple } from "primereact/ripple";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Bar = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), {
  ssr: false,
});

const SIDEBAR_LINKS = [
  { key: "dashboard", label: "Dashboard", icon: "pi pi-chart-bar", iconColor: "#6366f1" },
  { key: "users", label: "Users", icon: "pi pi-users", iconColor: "#14b8a6" },
  { key: "requests", label: "Requests", icon: "pi pi-clipboard", iconColor: "#f59e0b" },
];

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

interface RequestData {
  id: string;
  customerId: string;
  description: string;
  quotePrice: number;
  finalPrice: number;
  status: string;
  createdAt: string;
}

function getMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function AdminDashboardClient() {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [activeRoute, setActiveRoute] = useState("dashboard");
  const [users, setUsers] = useState<UserData[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [employeeRefreshKey, setEmployeeRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = () => {
      Promise.all([
        fetch("/api/user", { cache: "no-store" }).then((res) => res.json()),
        fetch("/api/request", { cache: "no-store" }).then((res) => res.json()),
      ])
        .then(([userData, requestData]) => {
          setUsers(Array.isArray(userData) ? userData : []);
          setRequests(Array.isArray(requestData) ? requestData : []);
        })
        .finally(() => setDashboardLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Build employee chart: employees created per month (last 6 months)
  const employeesByMonth = (() => {
    const now = new Date();
    const labels: string[] = [];
    const counts: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      labels.push(label);
      const month = d.getMonth();
      const year = d.getFullYear();
      counts.push(
        users.filter((u) => {
          const created = new Date(u.createdAt);
          return created.getMonth() === month && created.getFullYear() === year;
        }).length,
      );
    }
    return { labels, counts };
  })();

  const employeeStats = {
    labels: employeesByMonth.labels,
    datasets: [
      {
        label: "Users Added",
        data: employeesByMonth.counts,
        backgroundColor: "rgba(99, 102, 241, 0.6)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const statusLabels = ["PENDING", "PURCHASED", "AT_WAREHOUSE", "SHIPPED", "DONE"];
  const statusColors = {
    bg: ["rgba(245, 158, 11, 0.7)", "rgba(99, 102, 241, 0.7)", "rgba(59, 130, 246, 0.7)", "rgba(14, 165, 233, 0.7)", "rgba(16, 185, 129, 0.7)"],
    border: ["rgba(245, 158, 11, 1)", "rgba(99, 102, 241, 1)", "rgba(59, 130, 246, 1)", "rgba(14, 165, 233, 1)", "rgba(16, 185, 129, 1)"],
  };
  const requestStats = {
    labels: statusLabels.map((s) => s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")),
    datasets: [
      {
        label: "Requests",
        data: statusLabels.map((s) => requests.filter((r) => r.status === s).length),
        backgroundColor: statusColors.bg,
        borderColor: statusColors.border,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "rgba(0,0,0,0.05)" }, beginAtZero: true },
    },
  };

  const employeeCount = users.filter((u) => u.role === "EMPLOYEE").length;
  const customerCount = users.filter((u) => u.role === "CUSTOMER").length;

  const summary = [
    { icon: "pi pi-clipboard", bg: "#eff6ff", iconColor: "#3b82f6", label: "Total Requests", value: requests.length },
    { icon: "pi pi-users", bg: "#f0fdfa", iconColor: "#14b8a6", label: "Customers", value: customerCount },
    { icon: "pi pi-user-plus", bg: "#faf5ff", iconColor: "#a855f7", label: "Employees", value: employeeCount },
  ];

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...employeeForm, role: "EMPLOYEE" }),
    });
    if (res.ok) {
      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setEmployeeRefreshKey((k) => k + 1);
    }
    setShowModal(false);
    setEmployeeForm({ firstName: "", lastName: "", email: "", password: "" });
  }

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
            label={session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "A"}
            shape="circle"
            size="normal"
            style={{ backgroundColor: "#6366f1", color: "#fff" }}
          />
          <div className="flex-1">
            <div className="font-semibold text-sm" style={{ color: "#334155" }}>
              {session?.user?.name || "Admin"}
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
    <div className="flex min-h-screen" style={{ backgroundColor: "#f1f5f9" }}>
      {/* Desktop Sidebar */}
      <div
        className="hidden md:block shadow-2 fixed left-0 top-0 h-screen overflow-y-auto z-5"
        style={{ width: "260px", backgroundColor: "#ffffff" }}
      >
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <Sidebar visible={sidebarOpen} onHide={() => setSidebarOpen(false)} className="w-18rem p-0" showCloseIcon={false}>
        {sidebarContent}
      </Sidebar>

      {/* Main content */}
      <div className="flex-1 flex flex-column min-h-screen admin-main" style={{ marginLeft: 0, minWidth: 0 }}>
        <style>{`@media (min-width: 768px) { .admin-main { margin-left: 260px !important; } }`}</style>
        {/* Header */}
        <div className="shadow-2 px-4 py-3 flex align-items-center justify-content-between sticky top-0 z-4" style={{ backgroundColor: "#ffffff" }}>
          <div className="flex align-items-center gap-3">
            <Button icon="pi pi-bars" text rounded className="md:hidden" onClick={() => setSidebarOpen(true)} />
            <div>
              <div className="text-xl font-bold" style={{ color: "#4338ca" }}>
                {SIDEBAR_LINKS.find((l) => l.key === activeRoute)?.label}
              </div>
              <div className="text-sm" style={{ color: "#94a3b8" }}>
                {activeRoute === "dashboard"
                  ? "Project overview & management"
                  : activeRoute === "users"
                    ? "Manage your users"
                    : "View and update customer requests"}
              </div>
            </div>
          </div>
          <div className="flex align-items-center gap-3">
            <Button icon="pi pi-bell" text rounded className="p-overlay-badge">
              <Badge value="3" severity="danger" />
            </Button>
            <Avatar
              label={session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "A"}
              shape="circle"
              className="hidden md:flex"
              style={{ backgroundColor: "#6366f1", color: "#fff" }}
            />
            {activeRoute === "users" && <Button label="New User" icon="pi pi-user-plus" size="small" onClick={() => setShowModal(true)} />}
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
              {/* Charts */}
              <div className="grid">
                <div className="col-12 md:col-6">
                  <div className="surface-card border-round-xl shadow-2 p-4 h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                      <span className="font-semibold" style={{ color: "#334155" }}>
                        Requests Overview
                      </span>
                      <i className="pi pi-ellipsis-h cursor-pointer" style={{ color: "#cbd5e1" }} />
                    </div>
                    <Bar data={requestStats} options={chartOptions} />
                  </div>
                </div>
                <div className="col-12 md:col-6">
                  <div className="surface-card border-round-xl shadow-2 p-4 h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                      <span className="font-semibold" style={{ color: "#334155" }}>
                        Users Added
                      </span>
                      <i className="pi pi-ellipsis-h cursor-pointer" style={{ color: "#cbd5e1" }} />
                    </div>
                    <Bar data={employeeStats} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRoute === "users" && (
            <div className="surface-card border-round-xl shadow-2 p-4" style={{ overflow: "auto" }}>
              <EmployeeTable refreshKey={employeeRefreshKey} />
            </div>
          )}

          {activeRoute === "requests" && (
            <div className="surface-card border-round-xl shadow-2 p-4" style={{ overflow: "auto" }}>
              <RequestTable />
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      <Dialog
        header="Add User"
        visible={showModal}
        onHide={() => setShowModal(false)}
        style={{ width: "28rem" }}
        modal
        draggable={false}
        className="border-round-xl"
      >
        <form onSubmit={handleAddEmployee} className="flex flex-column gap-4 pt-2">
          <div className="flex flex-column gap-2">
            <label htmlFor="emp-firstName" className="font-semibold text-sm" style={{ color: "#475569" }}>
              First Name
            </label>
            <InputText
              id="emp-firstName"
              required
              value={employeeForm.firstName}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, firstName: e.target.value }))}
              className="w-full"
              placeholder="Enter first name"
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="emp-lastName" className="font-semibold text-sm" style={{ color: "#475569" }}>
              Last Name
            </label>
            <InputText
              id="emp-lastName"
              required
              value={employeeForm.lastName}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, lastName: e.target.value }))}
              className="w-full"
              placeholder="Enter last name"
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="emp-email" className="font-semibold text-sm" style={{ color: "#475569" }}>
              Email
            </label>
            <InputText
              id="emp-email"
              type="email"
              required
              value={employeeForm.email}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full"
              placeholder="Enter employee email"
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="emp-password" className="font-semibold text-sm" style={{ color: "#475569" }}>
              Password
            </label>
            <InputText
              id="emp-password"
              type="password"
              required
              value={employeeForm.password}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full"
              placeholder="Enter password"
            />
          </div>
          <div className="flex justify-content-end gap-2 mt-2">
            <Button label="Cancel" severity="secondary" outlined onClick={() => setShowModal(false)} type="button" />
            <Button label="Add User" icon="pi pi-check" type="submit" />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
