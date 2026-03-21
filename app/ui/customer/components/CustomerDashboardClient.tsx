"use client";
import { useRef, useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import CustomerRequestTable from "./CustomerRequestTable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";

import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import { Sidebar } from "primereact/sidebar";
import { Badge } from "primereact/badge";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import { Ripple } from "primereact/ripple";

const SIDEBAR_LINKS = [
  { key: "dashboard", label: "Dashboard", icon: "pi pi-home", iconColor: "#f97316" },
  { key: "requests", label: "My Requests", icon: "pi pi-list", iconColor: "#3b82f6" },
];

interface RequestData {
  id: string;
  customerId: string;
  description: string;
  img_url: string;
  quotePrice: number;
  finalPrice: number;
  status: string;
  createdAt: string;
}

export default function CustomerDashboardClient() {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState("dashboard");
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({ description: "" });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [requestRefreshKey, setRequestRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 3;

  const customerId = session?.user?.id;

  useEffect(() => {
    fetch("/api/request")
      .then((res) => res.json())
      .then((data: RequestData[]) => {
        setRequests(data.filter((r) => r.customerId === customerId));
      })
      .finally(() => setDashboardLoading(false));
  }, [customerId]);

  const myRequests = requests;

  const pendingCount = myRequests.filter((r) => r.status === "PENDING").length;
  const inProgressCount = myRequests.filter((r) => ["PURCHASED", "AT_WAREHOUSE", "SHIPPED"].includes(r.status)).length;
  const completedCount = myRequests.filter((r) => r.status === "DONE").length;

  const summary = [
    { icon: "pi pi-inbox", bg: "#fff7ed", iconColor: "#f97316", label: "Total Requests", value: myRequests.length },
    { icon: "pi pi-clock", bg: "#fefce8", iconColor: "#eab308", label: "Pending", value: pendingCount },
    { icon: "pi pi-spin pi-spinner", bg: "#eff6ff", iconColor: "#3b82f6", label: "In Progress", value: inProgressCount },
    { icon: "pi pi-check-circle", bg: "#f0fdf4", iconColor: "#16a34a", label: "Completed", value: completedCount },
  ];

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return;
    setSubmitting(true);
    try {
      let imgUrl = "";

      // Upload images to MinIO if any were selected
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append("files", f));
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const { urls } = await uploadRes.json();
          imgUrl = JSON.stringify(urls);
        }
      }

      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          description: requestForm.description,
          img_url: imgUrl,
        }),
      });
      if (res.ok) {
        const newReq = await res.json();
        setRequests((prev) => [...prev, newReq]);
        setRequestRefreshKey((k) => k + 1);
        setShowNewRequest(false);
        setRequestForm({ description: "" });
        setImageFiles([]);
        setImagePreviews([]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const combined = [...imageFiles, ...selected].slice(0, MAX_IMAGES);
    setImageFiles(combined);

    // Generate previews for all files
    Promise.all(
      combined.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          }),
      ),
    ).then(setImagePreviews);

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Recent requests for dashboard (last 5)
  const recentRequests = [...myRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  function getStatusColor(status: string) {
    switch (status) {
      case "PENDING":
        return "#f59e0b";
      case "PURCHASED":
        return "#6366f1";
      case "AT_WAREHOUSE":
        return "#3b82f6";
      case "SHIPPED":
        return "#0ea5e9";
      case "DONE":
        return "#16a34a";
      default:
        return "#94a3b8";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PENDING":
        return "pi pi-clock";
      case "PURCHASED":
        return "pi pi-shopping-cart";
      case "AT_WAREHOUSE":
        return "pi pi-box";
      case "SHIPPED":
        return "pi pi-truck";
      case "DONE":
        return "pi pi-check-circle";
      default:
        return "pi pi-circle";
    }
  }

  function formatStatus(status: string) {
    return status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ");
  }

  const sidebarContent = (
    <div className="flex flex-column h-full">
      <div className="flex align-items-center gap-2 px-3 pt-3 pb-2">
        <i className="pi pi-bolt" style={{ fontSize: "1.5rem", color: "#f97316" }} />
        <span className="text-xl font-bold" style={{ color: "#c2410c" }}>
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
              style={{ backgroundColor: isActive ? "#fff7ed" : undefined }}
              onClick={() => {
                setActiveRoute(link.key);
                setSidebarOpen(false);
              }}
            >
              <i className={link.icon} style={{ fontSize: "1.1rem", color: link.iconColor }} />
              <span className="font-semibold" style={{ color: isActive ? "#c2410c" : "#64748b" }}>
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
            label={session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "C"}
            shape="circle"
            size="normal"
            style={{ backgroundColor: "#f97316", color: "#fff" }}
          />
          <div className="flex-1">
            <div className="font-semibold text-sm" style={{ color: "#334155" }}>
              {session?.user?.name || "Customer"}
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
      <div className="flex-1 flex flex-column min-h-screen customer-main" style={{ marginLeft: 0 }}>
        <style>{`@media (min-width: 768px) { .customer-main { margin-left: 260px !important; } }`}</style>
        {/* Header */}
        <div className="shadow-2 px-4 py-3 flex align-items-center justify-content-between sticky top-0 z-4" style={{ backgroundColor: "#ffffff" }}>
          <div className="flex align-items-center gap-3">
            <Button icon="pi pi-bars" text rounded className="md:hidden" onClick={() => setSidebarOpen(true)} />
            <div>
              <div className="text-xl font-bold" style={{ color: "#c2410c" }}>
                {SIDEBAR_LINKS.find((l) => l.key === activeRoute)?.label}
              </div>
              <div className="text-sm" style={{ color: "#94a3b8" }}>
                {activeRoute === "dashboard" ? "Track your sourcing requests" : "View all your submitted requests"}
              </div>
            </div>
          </div>
          <div className="flex align-items-center gap-3">
            {pendingCount > 0 && (
              <Button icon="pi pi-bell" text rounded className="p-overlay-badge">
                <Badge value={String(pendingCount)} severity="warning" />
              </Button>
            )}
            <Avatar
              label={session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "C"}
              shape="circle"
              className="hidden md:flex"
              style={{ backgroundColor: "#f97316", color: "#fff" }}
            />
            <Button
              label="New Request"
              icon="pi pi-plus"
              size="small"
              style={{ backgroundColor: "#f97316", borderColor: "#f97316" }}
              onClick={() => setShowNewRequest(true)}
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
                  <div key={item.label} className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl shadow-2 p-4 flex align-items-center gap-4 h-full">
                      <div
                        className="flex align-items-center justify-content-center border-round-lg"
                        style={{ width: "3rem", height: "3rem", backgroundColor: item.bg }}
                      >
                        <i className={item.icon} style={{ fontSize: "1.3rem", color: item.iconColor }} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold" style={{ color: "#c2410c" }}>
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

              {/* Recent Requests */}
              <div className="surface-card border-round-xl shadow-2 p-4">
                <div className="flex align-items-center justify-content-between mb-3">
                  <span className="font-semibold text-lg" style={{ color: "#c2410c" }}>
                    Recent Requests
                  </span>
                  {myRequests.length > 5 && (
                    <Button label="View All" link size="small" style={{ color: "#f97316" }} onClick={() => setActiveRoute("requests")} />
                  )}
                </div>
                {recentRequests.length === 0 ? (
                  <div className="flex flex-column align-items-center py-6 gap-3">
                    <i className="pi pi-inbox" style={{ fontSize: "3rem", color: "#cbd5e1" }} />
                    <span style={{ color: "#94a3b8" }}>No requests yet. Submit your first request!</span>
                    <Button
                      label="New Request"
                      icon="pi pi-plus"
                      size="small"
                      style={{ backgroundColor: "#f97316", borderColor: "#f97316" }}
                      onClick={() => setShowNewRequest(true)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-column gap-2">
                    {recentRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex align-items-center gap-3 p-3 border-round-lg"
                        style={{ backgroundColor: "#fafafa", border: "1px solid #f1f5f9" }}
                      >
                        <div
                          className="flex align-items-center justify-content-center border-round-lg shrink-0"
                          style={{ width: "2.5rem", height: "2.5rem", backgroundColor: getStatusColor(req.status) + "18" }}
                        >
                          <i className={getStatusIcon(req.status)} style={{ fontSize: "1rem", color: getStatusColor(req.status) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium text-sm"
                            style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {req.description}
                          </div>
                          <div className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                            {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                        <div className="flex align-items-center gap-2 shrink-0">
                          {req.quotePrice > 0 && (
                            <span className="text-sm font-semibold" style={{ color: "#16a34a" }}>
                              {req.quotePrice.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                            </span>
                          )}
                          <span
                            className="text-xs font-semibold px-2 py-1 border-round-lg"
                            style={{ backgroundColor: getStatusColor(req.status) + "18", color: getStatusColor(req.status) }}
                          >
                            {formatStatus(req.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Flow Guide */}
              <div className="surface-card border-round-xl shadow-2 p-4">
                <div className="font-semibold text-lg mb-3" style={{ color: "#c2410c" }}>
                  How It Works
                </div>
                <div className="flex flex-wrap gap-2 align-items-center justify-content-center">
                  {[
                    { status: "PENDING", label: "Submit Request", icon: "pi pi-send" },
                    { status: "PURCHASED", label: "Item Purchased", icon: "pi pi-shopping-cart" },
                    { status: "AT_WAREHOUSE", label: "At Warehouse", icon: "pi pi-box" },
                    { status: "SHIPPED", label: "Shipped", icon: "pi pi-truck" },
                    { status: "DONE", label: "Delivered", icon: "pi pi-check-circle" },
                  ].map((step, idx, arr) => (
                    <div key={step.status} className="flex align-items-center gap-2">
                      <div className="flex flex-column align-items-center gap-1">
                        <div
                          className="flex align-items-center justify-content-center border-round-lg"
                          style={{ width: "2.5rem", height: "2.5rem", backgroundColor: getStatusColor(step.status) + "18" }}
                        >
                          <i className={step.icon} style={{ fontSize: "1rem", color: getStatusColor(step.status) }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: "#64748b" }}>
                          {step.label}
                        </span>
                      </div>
                      {idx < arr.length - 1 && <i className="pi pi-arrow-right text-sm" style={{ color: "#cbd5e1", marginBottom: "1.2rem" }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeRoute === "requests" && (
            <div className="surface-card border-round-xl shadow-2 p-4">
              <CustomerRequestTable refreshKey={requestRefreshKey} customerId={customerId || ""} />
            </div>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      <Dialog
        header="Submit a New Request"
        visible={showNewRequest}
        onHide={() => setShowNewRequest(false)}
        style={{ width: "30rem" }}
        modal
        draggable={false}
        className="border-round-xl"
      >
        <form onSubmit={handleSubmitRequest} className="flex flex-column gap-4 pt-2">
          <div className="flex flex-column gap-2">
            <label htmlFor="req-desc" className="font-semibold text-sm" style={{ color: "#475569" }}>
              What are you looking for?
            </label>
            <InputTextarea
              id="req-desc"
              required
              value={requestForm.description}
              onChange={(e) => setRequestForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full"
              rows={4}
              placeholder="Describe the product or item you need sourced..."
              autoResize
            />
          </div>
          <div className="flex flex-column gap-2">
            <label className="font-semibold text-sm" style={{ color: "#475569" }}>
              Attach Image <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            {imagePreviews.length > 0 ? (
              <div className="flex flex-column gap-2">
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} style={{ position: "relative", display: "inline-block" }}>
                      <img
                        src={preview}
                        alt={`Preview ${idx + 1}`}
                        style={{ width: "7rem", height: "7rem", objectFit: "cover", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}
                      />
                      <Button
                        icon="pi pi-times"
                        rounded
                        text
                        severity="danger"
                        size="small"
                        type="button"
                        style={{ position: "absolute", top: "-0.25rem", right: "-0.25rem", width: "1.5rem", height: "1.5rem" }}
                        onClick={() => removeImage(idx)}
                      />
                    </div>
                  ))}
                </div>
                {imageFiles.length < MAX_IMAGES && (
                  <Button
                    label={`Add more (${imageFiles.length}/${MAX_IMAGES})`}
                    icon="pi pi-plus"
                    text
                    size="small"
                    type="button"
                    style={{ color: "#f97316", alignSelf: "flex-start" }}
                    onClick={() => fileInputRef.current?.click()}
                  />
                )}
              </div>
            ) : (
              <div
                className="flex flex-column align-items-center justify-content-center gap-2 cursor-pointer border-round-lg"
                style={{ border: "2px dashed #cbd5e1", padding: "2rem", backgroundColor: "#fafafa" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="pi pi-images" style={{ fontSize: "2rem", color: "#94a3b8" }} />
                <span className="text-sm" style={{ color: "#64748b" }}>
                  Click to upload images (up to 3)
                </span>
                <span className="text-xs" style={{ color: "#94a3b8" }}>
                  JPEG, PNG, WebP, GIF — Max 5MB each
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-content-end gap-2 mt-2">
            <Button label="Cancel" severity="secondary" outlined onClick={() => setShowNewRequest(false)} type="button" />
            <Button
              label="Submit Request"
              icon="pi pi-send"
              type="submit"
              loading={submitting}
              style={{ backgroundColor: "#f97316", borderColor: "#f97316" }}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
