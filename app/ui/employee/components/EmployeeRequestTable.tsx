"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { DataView } from "primereact/dataview";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { IconField } from "primereact/iconfield";
import { Galleria } from "primereact/galleria";
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
  const [activeImageIndex, setActiveImageIndex] = useState<Record<string, number>>({});
  const [galleriaImages, setGalleriaImages] = useState<string[]>([]);
  const [galleriaActiveIndex, setGalleriaActiveIndex] = useState(0);
  const galleriaRef = useRef<Galleria>(null);

  const openGalleria = (urls: string[], index = 0) => {
    setGalleriaImages(urls);
    setGalleriaActiveIndex(index);
    galleriaRef.current?.show();
  };

  // Edit modal state
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestData | null>(null);
  const [editQuotePrice, setEditQuotePrice] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (e) => {
      const { requests } = JSON.parse(e.data);
      if (Array.isArray(requests)) {
        setRequests(requests);
        setLoading(false);
      }
    };
    source.onerror = () => {};
    return () => source.close();
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
            borderTop: "3px solid #1D4ED8",
            boxShadow: isHovered ? "0 12px 32px rgba(29,78,216,0.10), 0 2px 8px rgba(0,0,0,0.04)" : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)",
            transition: "box-shadow 0.2s ease",
          }}
          onMouseEnter={() => setHoveredId(request.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Image carousel */}
          <div className="flex justify-content-center sm:justify-content-start" style={{ flexShrink: 0 }}>
            {urls.length > 0 ? (
              <div style={{ position: "relative", width: "8rem", height: "8rem" }}>
                <img
                  src={urls[activeImageIndex[request.id] ?? 0]}
                  alt={request.name}
                  onClick={() => openGalleria(urls, activeImageIndex[request.id] ?? 0)}
                  style={{ width: "8rem", height: "8rem", objectFit: "cover", borderRadius: "0.875rem", display: "block", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", cursor: "pointer" }}
                />
                {urls.length > 1 && (activeImageIndex[request.id] ?? 0) > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex((p) => ({ ...p, [request.id]: (p[request.id] ?? 0) - 1 })); }}
                    style={{ position: "absolute", left: "0.25rem", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: "1.5rem", height: "1.5rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  ><i className="pi pi-angle-left" style={{ fontSize: "0.8rem" }} /></button>
                )}
                {urls.length > 1 && (activeImageIndex[request.id] ?? 0) < urls.length - 1 && (
                  <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex((p) => ({ ...p, [request.id]: (p[request.id] ?? 0) + 1 })); }}
                    style={{ position: "absolute", right: "0.25rem", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: "1.5rem", height: "1.5rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  ><i className="pi pi-angle-right" style={{ fontSize: "0.8rem" }} /></button>
                )}
                {urls.length > 1 && (
                  <div style={{ position: "absolute", bottom: "0.4rem", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "0.3rem" }}>
                    {urls.map((_, i) => (
                      <span key={i}
                        onClick={(e) => { e.stopPropagation(); setActiveImageIndex((p) => ({ ...p, [request.id]: i })); }}
                        style={{ width: i === (activeImageIndex[request.id] ?? 0) ? "0.5rem" : "0.35rem", height: i === (activeImageIndex[request.id] ?? 0) ? "0.5rem" : "0.35rem", borderRadius: "50%", background: i === (activeImageIndex[request.id] ?? 0) ? "#fff" : "rgba(255,255,255,0.55)", cursor: "pointer", transition: "all 0.15s" }}
                      />
                    ))}
                  </div>
                )}
                <div onClick={() => openGalleria(urls, activeImageIndex[request.id] ?? 0)}
                  style={{ position: "absolute", top: "0.35rem", right: "0.35rem", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", borderRadius: "50%", width: "1.5rem", height: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <i className="pi pi-arrows-alt" style={{ fontSize: "0.65rem", color: "#fff" }} />
                </div>
              </div>
            ) : (
              <div style={{ width: "8rem", height: "8rem", borderRadius: "0.875rem", background: "linear-gradient(135deg, var(--surface-100) 0%, var(--surface-200) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: request.quotePrice > 0 ? "#10B981" : "var(--surface-400)" }}>
                  {request.quotePrice > 0 ? formatCurrency(request.quotePrice) : "Not set"}
                </span>
              </div>
              <Button
                label="Set Price"
                icon="pi pi-pencil"
                size="small"
                onClick={() => openEditDialog(request)}
                style={{ background: "#10B981", borderColor: "#10B981", borderRadius: "999px", fontSize: "0.78rem" }}
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
            background: "#dbeafe",
            color: "#1D4ED8",
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
      <Galleria
        ref={galleriaRef}
        value={galleriaImages.map((src) => ({ src }))}
        activeIndex={galleriaActiveIndex}
        onItemChange={(e) => setGalleriaActiveIndex(e.index)}
        fullScreen
        showThumbnails={galleriaImages.length > 1}
        showItemNavigators={galleriaImages.length > 1}
        numVisible={3}
        item={(item: { src: string }) => (
          <img src={item.src} alt="" style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: "0.5rem" }} />
        )}
        thumbnail={(item: { src: string }) => (
          <img src={item.src} alt="" style={{ width: "4rem", height: "4rem", objectFit: "cover", borderRadius: "0.5rem" }} />
        )}
      />
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
                style={{ backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" }}
                onClick={confirmSaveEdit}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
