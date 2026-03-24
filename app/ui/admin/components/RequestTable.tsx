"use client";
import React, { useState, useEffect } from "react";
import { DataView } from "primereact/dataview";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";

interface RequestData {
  id: string;
  customerId: string;
  name: string;
  quantity: number;
  description: string;
  img_url: string;
  quotePrice: number;
  finalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: { firstName: string; lastName: string };
  quotedBy?: { firstName: string; lastName: string } | null;
}

const statusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "Quoted", value: "QUOTED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Purchased", value: "PURCHASED" },
  { label: "At Warehouse", value: "AT_WAREHOUSE" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Done", value: "DONE" },
];

const sortOptions = [
  { label: "Newest First", value: "!createdAt" },
  { label: "Oldest First", value: "createdAt" },
  { label: "Name A-Z", value: "name" },
  { label: "Name Z-A", value: "!name" },
];

function getStatusStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = { border: "1px solid" };
  switch (status) {
    case "PENDING":
      return { ...base, backgroundColor: "#fffbeb", color: "#b45309", borderColor: "#fde68a" };
    case "QUOTED":
      return { ...base, backgroundColor: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" };
    case "APPROVED":
      return { ...base, backgroundColor: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" };
    case "PURCHASED":
      return { ...base, backgroundColor: "#faf5ff", color: "#7e22ce", borderColor: "#e9d5ff" };
    case "AT_WAREHOUSE":
      return { ...base, backgroundColor: "#eef2ff", color: "#2563eb", borderColor: "#c7d2fe" };
    case "SHIPPED":
      return { ...base, backgroundColor: "#f0fdfa", color: "#0f766e", borderColor: "#99f6e4" };
    case "DONE":
      return { ...base, backgroundColor: "#f0fdf4", color: "#166534", borderColor: "#86efac" };
    default:
      return {};
  }
}

function formatStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ");
}

function parseImageUrls(imgUrl: string): string[] {
  if (!imgUrl) return [];
  try {
    const parsed = JSON.parse(imgUrl);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    if (imgUrl.startsWith("http")) return [imgUrl];
  }
  return [];
}

export default function RequestTable() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("!createdAt");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<0 | 1 | -1>(-1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Edit modal state
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestData | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editDescription, setEditDescription] = useState("");
  const [editQuotePrice, setEditQuotePrice] = useState(0);
  const [editFinalPrice, setEditFinalPrice] = useState(0);
  const [editStatus, setEditStatus] = useState("PENDING");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchRequests = () => {
      fetch("/api/request", { cache: "no-store" })
        .then((res) => res.json())
        .then((data: RequestData[]) => {
          setRequests(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchValue) {
      const s = searchValue.toLowerCase();
      return r.name.toLowerCase().includes(s) || r.description.toLowerCase().includes(s) || r.customerId.toLowerCase().includes(s);
    }
    return true;
  });

  const onSortChange = (value: string) => {
    setSortKey(value);
    if (value.startsWith("!")) {
      setSortField(value.substring(1));
      setSortOrder(-1);
    } else {
      setSortField(value);
      setSortOrder(1);
    }
  };

  // --- Edit modal logic ---
  const openEditDialog = (request: RequestData) => {
    setEditingRequest(request);
    setEditName(request.name);
    setEditQuantity(request.quantity);
    setEditDescription(request.description);
    setEditQuotePrice(request.quotePrice);
    setEditFinalPrice(request.finalPrice);
    setEditStatus(request.status);
    setEditDialogVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/request/${editingRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          quantity: editQuantity,
          description: editDescription,
          quotePrice: editQuotePrice,
          finalPrice: editFinalPrice,
          status: editStatus,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setRequests((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        setEditDialogVisible(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmSaveEdit = () => {
    confirmDialog({
      message: "Are you sure you want to save these changes?",
      header: "Confirm Update",
      icon: "pi pi-question-circle",
      acceptClassName: "p-button-success",
      accept: handleSaveEdit,
    });
  };

  // --- Delete logic ---
  const deleteRequest = async (request: RequestData) => {
    try {
      const res = await fetch(`/api/request/${request.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch {
      // silent fail
    }
  };

  const confirmDelete = (request: RequestData) => {
    confirmDialog({
      message: "Are you sure you want to delete this request?",
      header: "Confirm Delete",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => deleteRequest(request),
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  const statusFilterOptions = [{ label: "All Statuses", value: "ALL" }, ...statusOptions];

  const itemTemplate = (request: RequestData) => {
    const urls = parseImageUrls(request.img_url);
    const isHovered = hoveredId === request.id;

    return (
      <div className="col-12 p-2">
        <div
          className="surface-card border-round-2xl p-4 flex flex-column sm:flex-row gap-4"
          style={{
            border: "1px solid var(--surface-200)",
            borderTop: "3px solid #2563eb",
            boxShadow: isHovered ? "0 12px 32px rgba(37,99,235,0.10), 0 2px 8px rgba(0,0,0,0.04)" : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)",
            transition: "box-shadow 0.2s ease",
          }}
          onMouseEnter={() => setHoveredId(request.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Thumbnail */}
          <div className="flex justify-content-center sm:justify-content-start" style={{ position: "relative", flexShrink: 0 }}>
            {urls.length > 0 ? (
              <>
                <img
                  src={urls[0]}
                  alt={request.name}
                  style={{ width: "8rem", height: "8rem", objectFit: "cover", borderRadius: "0.875rem", display: "block", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
                />
                {urls.length > 1 && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "0.5rem",
                      right: "0.5rem",
                      background: "rgba(0,0,0,0.60)",
                      backdropFilter: "blur(4px)",
                      color: "#fff",
                      borderRadius: "999px",
                      padding: "0.1rem 0.5rem",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                    }}
                  >
                    +{urls.length - 1}
                  </span>
                )}
              </>
            ) : (
              <div
                style={{
                  width: "8rem",
                  height: "8rem",
                  borderRadius: "0.875rem",
                  background: "linear-gradient(135deg, var(--surface-100) 0%, var(--surface-200) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="pi pi-image" style={{ fontSize: "2.25rem", color: "var(--surface-400)" }} />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-column gap-3" style={{ minWidth: 0 }}>
            {/* Title + status */}
            <div className="flex align-items-start justify-content-between gap-2">
              <div className="flex flex-column gap-1" style={{ minWidth: 0 }}>
                <span className="font-bold text-900" style={{ fontSize: "1.05rem", lineHeight: 1.3 }}>
                  {request.name}
                </span>
                <p
                  className="m-0"
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-color-secondary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {request.description || "No description provided"}
                </p>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  flexShrink: 0,
                  ...getStatusStyle(request.status),
                }}
              >
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                {formatStatusLabel(request.status)}
              </span>
            </div>

            {/* Meta chips */}
            <div className="flex align-items-center gap-2 flex-wrap">
              {[
                { icon: "pi-box", label: `Qty ${request.quantity}` },
                {
                  icon: "pi-user",
                  label: request.user ? `${request.user.firstName} ${request.user.lastName}` : `${request.customerId.slice(0, 8)}…`,
                },
                { icon: "pi-calendar", label: new Date(request.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "999px",
                    background: "var(--surface-100)",
                    color: "var(--text-color-secondary)",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  <i className={`pi ${icon}`} style={{ fontSize: "0.68rem" }} />
                  {label}
                </span>
              ))}
              {request.quotedBy && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "999px",
                    background: "#eef2ff",
                    color: "#4338ca",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  <i className="pi pi-tag" style={{ fontSize: "0.68rem" }} />
                  Quoted by {request.quotedBy.firstName} {request.quotedBy.lastName}
                </span>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex align-items-center justify-content-between pt-3"
              style={{ borderTop: "1px solid var(--surface-200)", marginTop: "auto" }}
            >
              <div className="flex gap-4">
                <div className="flex flex-column gap-1">
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-color-secondary)" }}>Quote</span>
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-color)" }}>{formatCurrency(request.quotePrice)}</span>
                </div>
                <div className="flex flex-column gap-1">
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-color-secondary)" }}>Final</span>
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: request.finalPrice > 0 ? "#059669" : "var(--surface-400)" }}>
                    {request.finalPrice > 0 ? formatCurrency(request.finalPrice) : "—"}
                  </span>
                </div>
              </div>
              <div className="flex align-items-center gap-1">
                <Button icon="pi pi-pencil" rounded text severity="info" onClick={() => openEditDialog(request)} tooltip="Edit" tooltipOptions={{ position: "top" }} />
                <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => confirmDelete(request)} tooltip="Delete" tooltipOptions={{ position: "top" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const header = (
    <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-3">
      <div className="flex align-items-center gap-2">
        <span className="font-bold text-900" style={{ fontSize: "1.1rem" }}>Customer Requests</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#dbeafe",
            color: "#1d4ed8",
            borderRadius: "999px",
            padding: "0.1rem 0.55rem",
            fontSize: "0.72rem",
            fontWeight: 700,
            minWidth: "1.5rem",
          }}
        >
          {filteredRequests.length}
        </span>
      </div>
      <div className="flex align-items-center gap-2 flex-wrap">
        <Dropdown value={sortKey} options={sortOptions} onChange={(e) => onSortChange(e.value)} placeholder="Sort by" className="w-11rem" />
        <Dropdown value={statusFilter} options={statusFilterOptions} onChange={(e) => setStatusFilter(e.value)} placeholder="Filter by status" className="w-12rem" />
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Search requests..." className="w-full" />
        </IconField>
      </div>
    </div>
  );

  return (
    <>
      <ConfirmDialog />
      <DataView
        value={filteredRequests}
        itemTemplate={itemTemplate}
        layout="list"
        paginator
        rows={6}
        rowsPerPageOptions={[6, 12, 24]}
        sortField={sortField}
        sortOrder={sortOrder}
        header={header}
        loading={loading}
        emptyMessage="No requests found."
      />

      {/* Edit Request Dialog */}
      <Dialog
        header="Edit Request"
        visible={editDialogVisible}
        onHide={() => setEditDialogVisible(false)}
        style={{ width: "32rem" }}
        modal
        draggable={false}
        className="border-round-xl"
      >
        {editingRequest && (
          <div className="flex flex-column gap-4 pt-2">
            <div className="flex flex-column gap-2">
              <label className="font-semibold text-sm" style={{ color: "#475569" }}>
                Product Name
              </label>
              <InputText value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full" />
            </div>

            <div className="flex flex-column gap-2">
              <label className="font-semibold text-sm" style={{ color: "#475569" }}>
                Quantity
              </label>
              <InputNumber value={editQuantity} onValueChange={(e) => setEditQuantity(e.value ?? 1)} min={1} showButtons className="w-full" />
            </div>

            <div className="flex flex-column gap-2">
              <label className="font-semibold text-sm" style={{ color: "#475569" }}>
                Description
              </label>
              <InputTextarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full" rows={3} autoResize />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-column gap-2 flex-1">
                <label className="font-semibold text-sm" style={{ color: "#475569" }}>
                  Quote Price
                </label>
                <InputNumber
                  value={editQuotePrice}
                  onValueChange={(e) => setEditQuotePrice(e.value ?? 0)}
                  mode="currency"
                  currency="USD"
                  locale="en-US"
                  className="w-full"
                />
              </div>
              <div className="flex flex-column gap-2 flex-1">
                <label className="font-semibold text-sm" style={{ color: "#475569" }}>
                  Final Price
                </label>
                <InputNumber
                  value={editFinalPrice}
                  onValueChange={(e) => setEditFinalPrice(e.value ?? 0)}
                  mode="currency"
                  currency="USD"
                  locale="en-US"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex flex-column gap-2">
              <label className="font-semibold text-sm" style={{ color: "#475569" }}>
                Status
              </label>
              <Dropdown
                value={editStatus}
                options={statusOptions}
                onChange={(e) => setEditStatus(e.value)}
                placeholder="Select Status"
                className="w-full"
                disabled={editStatus === "QUOTED"}
              />
              {editStatus === "QUOTED" && (
                <small className="flex align-items-center gap-1" style={{ color: "#b45309" }}>
                  <i className="pi pi-lock" style={{ fontSize: "0.75rem" }} />
                  Waiting for customer to approve the quote
                </small>
              )}
            </div>

            <div className="flex justify-content-end gap-2 mt-2">
              <Button label="Cancel" severity="secondary" outlined onClick={() => setEditDialogVisible(false)} />
              <Button
                label="Save Changes"
                icon="pi pi-check"
                loading={saving}
                style={{ backgroundColor: "#2563eb", borderColor: "#2563eb" }}
                onClick={confirmSaveEdit}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
