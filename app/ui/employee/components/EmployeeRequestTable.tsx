"use client";
import React, { useState, useEffect } from "react";
import { DataView } from "primereact/dataview";
import { InputText } from "primereact/inputtext";
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
}

const sortOptions = [
  { label: "Newest First", value: "!createdAt" },
  { label: "Oldest First", value: "createdAt" },
  { label: "Name A-Z", value: "name" },
  { label: "Name Z-A", value: "!name" },
];

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

export default function EmployeeRequestTable() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [sortKey, setSortKey] = useState("!createdAt");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<0 | 1 | -1>(-1);

  // Edit modal state
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestData | null>(null);
  const [editQuotePrice, setEditQuotePrice] = useState(0);
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
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredRequests = requests
    .filter((r) => r.status === "PENDING")
    .filter((r) => {
      if (!searchValue) return true;
      const s = searchValue.toLowerCase();
      return r.name.toLowerCase().includes(s) || r.description.toLowerCase().includes(s);
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
    setEditQuotePrice(request.quotePrice);
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
          quotePrice: editQuotePrice,
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
      message: "Are you sure you want to save the quote price?",
      header: "Confirm Update",
      icon: "pi pi-question-circle",
      acceptClassName: "p-button-success",
      accept: handleSaveEdit,
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

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
            </div>

            <div className="flex align-items-center gap-4 mt-1">
              <div className="flex flex-column">
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Quote Price</span>
                <span style={{ color: request.quotePrice > 0 ? "#0d9488" : "#94a3b8", fontWeight: 600 }}>
                  {request.quotePrice > 0 ? formatCurrency(request.quotePrice) : "—"}
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
                tooltip="Set quote price"
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
      <span className="font-semibold text-lg" style={{ color: "#0d9488" }}>
        Pending Requests
      </span>
      <div className="flex align-items-center gap-2">
        <Dropdown value={sortKey} options={sortOptions} onChange={(e) => onSortChange(e.value)} placeholder="Sort by" className="w-11rem" />
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

      {/* Edit Quote Price Dialog */}
      <Dialog
        header="Set Quote Price"
        visible={editDialogVisible}
        onHide={() => setEditDialogVisible(false)}
        style={{ width: "24rem" }}
        modal
        draggable={false}
        className="border-round-xl"
      >
        {editingRequest && (
          <div className="flex flex-column gap-4 pt-2">
            <div className="flex flex-column gap-1">
              <span className="text-sm" style={{ color: "#94a3b8" }}>
                Request
              </span>
              <span className="font-semibold" style={{ color: "#334155" }}>
                {editingRequest.name}
              </span>
            </div>

            <div className="flex flex-column gap-2">
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

            <div className="flex justify-content-end gap-2 mt-2">
              <Button label="Cancel" severity="secondary" outlined onClick={() => setEditDialogVisible(false)} />
              <Button
                label="Save"
                icon="pi pi-check"
                loading={saving}
                style={{ backgroundColor: "#0d9488", borderColor: "#0d9488" }}
                onClick={confirmSaveEdit}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
