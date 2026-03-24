"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [sortKey, setSortKey] = useState("!createdAt");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<0 | 1 | -1>(-1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
          quotedById: session?.user?.id,
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
    const isHovered = hoveredId === request.id;

    return (
      <div className="col-12 p-2">
        <div
          className="surface-card border-round-2xl p-4 flex flex-column sm:flex-row gap-4"
          style={{
            border: "1px solid var(--surface-200)",
            borderTop: "3px solid #059669",
            boxShadow: isHovered ? "0 12px 32px rgba(5,150,105,0.10), 0 2px 8px rgba(0,0,0,0.04)" : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)",
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
            {/* Title + action */}
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
              <Button
                icon="pi pi-tag"
                rounded
                text
                severity="info"
                onClick={() => openEditDialog(request)}
                tooltip="Set quote price"
                tooltipOptions={{ position: "top" }}
                style={{ flexShrink: 0 }}
              />
            </div>

            {/* Meta chips */}
            <div className="flex align-items-center gap-2 flex-wrap">
              {[
                { icon: "pi-box", label: `Qty ${request.quantity}` },
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
            </div>

            {/* Footer */}
            <div
              className="flex align-items-center justify-content-between pt-3"
              style={{ borderTop: "1px solid var(--surface-200)", marginTop: "auto" }}
            >
              <div className="flex flex-column gap-1">
                <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-color-secondary)" }}>
                  Quote Price
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: request.quotePrice > 0 ? "#059669" : "var(--surface-400)" }}>
                  {request.quotePrice > 0 ? formatCurrency(request.quotePrice) : "Not set"}
                </span>
              </div>
              <Button
                label="Set Price"
                icon="pi pi-pencil"
                size="small"
                onClick={() => openEditDialog(request)}
                style={{ background: "#059669", borderColor: "#059669", borderRadius: "999px", fontSize: "0.78rem" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const header = (
    <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-3">
      <div className="flex align-items-center gap-2">
        <span className="font-bold text-900" style={{ fontSize: "1.1rem" }}>Pending Requests</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#d1fae5",
            color: "#047857",
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
                style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                onClick={confirmSaveEdit}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
