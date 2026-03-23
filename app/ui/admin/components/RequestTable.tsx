"use client";
import React, { useState, useEffect } from "react";
import { DataView } from "primereact/dataview";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
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
  switch (status) {
    case "PENDING":
      return { backgroundColor: "#fef3c7", color: "#92400e" };
    case "QUOTED":
      return { backgroundColor: "#dbeafe", color: "#1e40af" };
    case "APPROVED":
      return { backgroundColor: "#dcfce7", color: "#166534" };
    case "PURCHASED":
      return { backgroundColor: "#f3e8ff", color: "#6b21a8" };
    case "AT_WAREHOUSE":
      return { backgroundColor: "#e0e7ff", color: "#3730a3" };
    case "SHIPPED":
      return { backgroundColor: "#ccfbf1", color: "#115e59" };
    case "DONE":
      return { backgroundColor: "#d1fae5", color: "#065f46" };
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

    return (
      <div className="col-12 md:col-6 xl:col-4 p-2">
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "0.75rem",
            overflow: "hidden",
            backgroundColor: "#fff",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Image */}
          {urls.length > 0 ? (
            <div style={{ position: "relative" }}>
              <img src={urls[0]} alt={request.name} style={{ width: "100%", height: "10rem", objectFit: "cover" }} />
              {urls.length > 1 && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "0.5rem",
                    right: "0.5rem",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    borderRadius: "0.5rem",
                    padding: "0.125rem 0.5rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  +{urls.length - 1}
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: "10rem",
                backgroundColor: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="pi pi-image" style={{ fontSize: "2.5rem", color: "#cbd5e1" }} />
            </div>
          )}

          {/* Details */}
          <div className="flex flex-column gap-2 p-3" style={{ flex: 1 }}>
            <div className="flex align-items-center justify-content-between gap-2">
              <span
                className="font-bold"
                style={{ color: "#1e293b", fontSize: "1.05rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {request.name}
              </span>
              <Tag value={formatStatusLabel(request.status)} style={getStatusStyle(request.status)} />
            </div>

            <span className="text-sm" style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {request.description || "No description"}
            </span>

            <div className="flex align-items-center gap-3 flex-wrap" style={{ color: "#64748b", fontSize: "0.8rem" }}>
              <span>
                <i className="pi pi-box mr-1" style={{ fontSize: "0.75rem" }} />
                Qty: {request.quantity}
              </span>
              <span>•</span>
              <span>
                <i className="pi pi-calendar mr-1" style={{ fontSize: "0.75rem" }} />
                {new Date(request.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <span>•</span>
              <span>
                <i className="pi pi-user mr-1" style={{ fontSize: "0.75rem" }} />
                {request.customerId.slice(0, 8)}…
              </span>
            </div>

            <div className="flex align-items-center gap-4 mt-1">
              <div className="flex flex-column">
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Quote</span>
                <span style={{ color: "#334155", fontWeight: 600 }}>{formatCurrency(request.quotePrice)}</span>
              </div>
              <div className="flex flex-column">
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Final</span>
                <span style={{ color: request.finalPrice > 0 ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
                  {request.finalPrice > 0 ? formatCurrency(request.finalPrice) : "—"}
                </span>
              </div>
            </div>

            <div className="flex align-items-center justify-content-end gap-1 mt-auto pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
              <Button
                icon="pi pi-pencil"
                rounded
                text
                severity="info"
                onClick={() => openEditDialog(request)}
                tooltip="Edit"
                tooltipOptions={{ position: "top" }}
              />
              <Button
                icon="pi pi-trash"
                rounded
                text
                severity="danger"
                onClick={() => confirmDelete(request)}
                tooltip="Delete"
                tooltipOptions={{ position: "top" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const header = (
    <div className="flex justify-content-between align-items-center flex-wrap gap-2">
      <span className="font-semibold text-lg" style={{ color: "#4338ca" }}>
        Customer Requests
      </span>
      <div className="flex align-items-center gap-2">
        <Dropdown value={sortKey} options={sortOptions} onChange={(e) => onSortChange(e.value)} placeholder="Sort by" className="w-11rem" />
        <Dropdown
          value={statusFilter}
          options={statusFilterOptions}
          onChange={(e) => setStatusFilter(e.value)}
          placeholder="Filter by status"
          className="w-12rem"
        />
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Search requests..." />
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
        layout="grid"
        paginator
        rows={9}
        rowsPerPageOptions={[9, 18, 36]}
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
              />
            </div>

            <div className="flex justify-content-end gap-2 mt-2">
              <Button label="Cancel" severity="secondary" outlined onClick={() => setEditDialogVisible(false)} />
              <Button
                label="Save Changes"
                icon="pi pi-check"
                loading={saving}
                style={{ backgroundColor: "#4338ca", borderColor: "#4338ca" }}
                onClick={confirmSaveEdit}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
