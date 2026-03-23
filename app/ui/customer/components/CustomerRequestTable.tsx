"use client";
import React, { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Tag } from "primereact/tag";
import { FilterMatchMode } from "primereact/api";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";

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
  { label: "Purchased", value: "PURCHASED" },
  { label: "At Warehouse", value: "AT_WAREHOUSE" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Done", value: "DONE" },
];

function getStatusSeverity(status: string) {
  switch (status) {
    case "PENDING":
      return "warning";
    case "PURCHASED":
      return "info";
    case "AT_WAREHOUSE":
      return "info";
    case "SHIPPED":
      return "contrast";
    case "DONE":
      return "success";
    default:
      return undefined;
  }
}

function formatStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ");
}

interface CustomerRequestTableProps {
  refreshKey: number;
  customerId: string;
  onDelete?: () => void;
}

export default function CustomerRequestTable({ refreshKey, customerId, onDelete }: CustomerRequestTableProps) {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filters, setFilters] = useState({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  // Edit state
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestData | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 3;

  useEffect(() => {
    setLoading(true);
    fetch("/api/request")
      .then((res) => res.json())
      .then((data: RequestData[]) => {
        setRequests(data.filter((r) => r.customerId === customerId));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey, customerId]);

  const displayedRequests = statusFilter === "ALL" ? requests : requests.filter((r) => r.status === statusFilter);

  const deleteRequest = async (request: RequestData) => {
    try {
      const res = await fetch(`/api/request/${request.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      onDelete?.();
    } catch {
      // silent fail
    }
  };

  const confirmDelete = (request: RequestData) => {
    confirmDialog({
      message: "Are you sure you want to delete this request? Images will also be removed.",
      header: "Confirm Delete",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => deleteRequest(request),
    });
  };

  const deleteBodyTemplate = (rowData: RequestData) => {
    return <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => confirmDelete(rowData)} />;
  };

  // --- Edit logic ---
  const openEditDialog = (request: RequestData) => {
    setEditingRequest(request);
    setEditName(request.name);
    setEditQuantity(request.quantity);
    setEditDescription(request.description);
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setExistingImageUrls(parseImageUrls(request.img_url));
    setEditDialogVisible(true);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const totalSlots = MAX_IMAGES - existingImageUrls.length;
    const combined = [...editImageFiles, ...selected].slice(0, totalSlots);
    setEditImageFiles(combined);
    Promise.all(
      combined.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          }),
      ),
    ).then(setEditImagePreviews);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    const newFiles = editImageFiles.filter((_, i) => i !== index);
    const newPreviews = editImagePreviews.filter((_, i) => i !== index);
    setEditImageFiles(newFiles);
    setEditImagePreviews(newPreviews);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;
    setSaving(true);
    try {
      let finalUrls = [...existingImageUrls];

      // Upload new images if any
      if (editImageFiles.length > 0) {
        const formData = new FormData();
        editImageFiles.forEach((f) => formData.append("files", f));
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { urls } = await uploadRes.json();
          finalUrls = [...finalUrls, ...urls];
        }
      }

      const res = await fetch(`/api/request/${editingRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          quantity: editQuantity,
          description: editDescription,
          img_url: JSON.stringify(finalUrls),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setEditDialogVisible(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const isEditable = (request: RequestData) => request.status === "PENDING";

  const actionsBodyTemplate = (rowData: RequestData) => {
    return (
      <div className="flex align-items-center gap-1">
        <Button
          icon="pi pi-pencil"
          rounded
          text
          severity="info"
          onClick={() => openEditDialog(rowData)}
          disabled={!isEditable(rowData)}
          tooltip={!isEditable(rowData) ? "Cannot edit after purchase" : "Edit request"}
          tooltipOptions={{ position: "top" }}
        />
        <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => confirmDelete(rowData)} />
      </div>
    );
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(value);
  };

  // Body templates
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  const parseImageUrls = (imgUrl: string): string[] => {
    if (!imgUrl) return [];
    try {
      const parsed = JSON.parse(imgUrl);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Legacy single URL format
      if (imgUrl.startsWith("http")) return [imgUrl];
    }
    return [];
  };

  const imageBodyTemplate = (rowData: RequestData) => {
    const urls = parseImageUrls(rowData.img_url);
    if (!urls.length) return <span style={{ color: "#94a3b8" }}>—</span>;
    return (
      <div className="flex gap-1">
        {urls.map((url, idx) => (
          <img
            key={idx}
            src={url}
            alt={`Request ${idx + 1}`}
            style={{ width: "3rem", height: "3rem", objectFit: "cover", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}
          />
        ))}
      </div>
    );
  };

  const descriptionBodyTemplate = (rowData: RequestData) => {
    return <span style={{ color: "#334155" }}>{rowData.description.length > 60 ? rowData.description.slice(0, 60) + "…" : rowData.description}</span>;
  };

  const statusBodyTemplate = (rowData: RequestData) => {
    return <Tag value={formatStatusLabel(rowData.status)} severity={getStatusSeverity(rowData.status)} />;
  };

  const priceBodyTemplate = (rowData: RequestData) => {
    return (
      <span style={{ color: rowData.finalPrice > 0 ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
        {rowData.finalPrice > 0 ? formatCurrency(rowData.finalPrice) : "—"}
      </span>
    );
  };

  const dateBodyTemplate = (rowData: RequestData) => {
    return (
      <span style={{ color: "#64748b" }}>
        {new Date(rowData.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    );
  };

  const statusFilterOptions = [{ label: "All Statuses", value: "ALL" }, ...statusOptions];

  const header = (
    <div className="flex justify-content-between align-items-center flex-wrap gap-2">
      <span className="font-semibold text-lg" style={{ color: "#c2410c" }}>
        My Requests
      </span>
      <div className="flex align-items-center gap-2">
        <Dropdown
          value={statusFilter}
          options={statusFilterOptions}
          onChange={(e) => setStatusFilter(e.value)}
          placeholder="Filter by status"
          className="w-12rem"
        />
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search requests..." />
        </IconField>
      </div>
    </div>
  );

  return (
    <>
      <ConfirmDialog />
      <DataTable
        value={displayedRequests}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25]}
        loading={loading}
        filters={filters}
        globalFilterFields={["name", "description", "status"]}
        header={header}
        emptyMessage="No requests found."
        stripedRows
        removableSort
        dataKey="id"
        className="border-round-xl"
      >
        <Column header="Image" body={imageBodyTemplate} style={{ width: "5rem" }} />
        <Column field="name" header="Name" sortable style={{ minWidth: "10rem" }} />
        <Column field="quantity" header="Qty" sortable style={{ width: "5rem" }} />
        <Column field="description" header="Description" body={descriptionBodyTemplate} sortable style={{ maxWidth: "20rem" }} />
        <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ width: "10rem" }} />
        <Column field="finalPrice" header="Price" body={priceBodyTemplate} sortable />
        <Column field="createdAt" header="Submitted" body={dateBodyTemplate} sortable />
        <Column header="Actions" body={actionsBodyTemplate} headerStyle={{ width: "6rem" }} bodyStyle={{ textAlign: "center" }} />
      </DataTable>

      {/* Edit Request Dialog */}
      <Dialog
        header="Edit Request"
        visible={editDialogVisible}
        onHide={() => setEditDialogVisible(false)}
        style={{ width: "30rem" }}
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
              <InputTextarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full" rows={4} autoResize />
            </div>

            <div className="flex flex-column gap-2">
              <label className="font-semibold text-sm" style={{ color: "#475569" }}>
                Images{" "}
                <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                  ({existingImageUrls.length + editImageFiles.length}/{MAX_IMAGES})
                </span>
              </label>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleEditFileSelect}
                style={{ display: "none" }}
              />

              {/* Existing images */}
              {existingImageUrls.length > 0 || editImagePreviews.length > 0 ? (
                <div className="flex flex-column gap-2">
                  <div className="flex flex-wrap gap-2">
                    {existingImageUrls.map((url, idx) => (
                      <div key={`existing-${idx}`} style={{ position: "relative", display: "inline-block" }}>
                        <img
                          src={url}
                          alt={`Image ${idx + 1}`}
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
                          onClick={() => removeExistingImage(idx)}
                        />
                      </div>
                    ))}
                    {editImagePreviews.map((preview, idx) => (
                      <div key={`new-${idx}`} style={{ position: "relative", display: "inline-block" }}>
                        <img
                          src={preview}
                          alt={`New ${idx + 1}`}
                          style={{ width: "7rem", height: "7rem", objectFit: "cover", borderRadius: "0.75rem", border: "2px solid #f97316" }}
                        />
                        <Button
                          icon="pi pi-times"
                          rounded
                          text
                          severity="danger"
                          size="small"
                          type="button"
                          style={{ position: "absolute", top: "-0.25rem", right: "-0.25rem", width: "1.5rem", height: "1.5rem" }}
                          onClick={() => removeNewImage(idx)}
                        />
                      </div>
                    ))}
                  </div>
                  {existingImageUrls.length + editImageFiles.length < MAX_IMAGES && (
                    <Button
                      label={`Add more (${existingImageUrls.length + editImageFiles.length}/${MAX_IMAGES})`}
                      icon="pi pi-plus"
                      text
                      size="small"
                      type="button"
                      style={{ color: "#f97316", alignSelf: "flex-start" }}
                      onClick={() => editFileInputRef.current?.click()}
                    />
                  )}
                </div>
              ) : (
                <div
                  className="flex flex-column align-items-center justify-content-center gap-2 cursor-pointer border-round-lg"
                  style={{ border: "2px dashed #cbd5e1", padding: "2rem", backgroundColor: "#fafafa" }}
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <i className="pi pi-images" style={{ fontSize: "2rem", color: "#94a3b8" }} />
                  <span className="text-sm" style={{ color: "#64748b" }}>
                    Click to upload images (up to {MAX_IMAGES})
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-content-end gap-2 mt-2">
              <Button label="Cancel" severity="secondary" outlined onClick={() => setEditDialogVisible(false)} />
              <Button
                label="Save Changes"
                icon="pi pi-check"
                loading={saving}
                style={{ backgroundColor: "#f97316", borderColor: "#f97316" }}
                onClick={handleSaveEdit}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
