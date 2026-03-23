"use client";
import React, { useState, useEffect } from "react";
import { DataTable, DataTableRowEditCompleteEvent } from "primereact/datatable";
import { Column, ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";

interface RequestData {
  id: string;
  customerId: string;
  name: string;
  quantity: number;
  description: string;
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

export default function RequestTable() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filters, setFilters] = useState({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  useEffect(() => {
    fetch("/api/request")
      .then((res) => res.json())
      .then((data: RequestData[]) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const displayedRequests = statusFilter === "ALL" ? requests : requests.filter((r) => r.status === statusFilter);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(value);
  };

  const onStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const onRowEditComplete = async (e: DataTableRowEditCompleteEvent) => {
    const { newData } = e;
    const updated = newData as RequestData;

    try {
      const res = await fetch(`/api/request/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updated.name,
          quantity: updated.quantity,
          quotePrice: updated.quotePrice,
          finalPrice: updated.finalPrice,
          status: updated.status,
          description: updated.description,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      const saved = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    } catch {
      // revert — original data stays
    }
  };

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
      message: `Are you sure you want to delete this request?`,
      header: "Confirm Delete",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => deleteRequest(request),
    });
  };

  // Editors
  const priceEditor = (options: ColumnEditorOptions) => {
    return (
      <InputNumber
        value={options.value}
        onValueChange={(e) => options.editorCallback?.(e.value)}
        mode="currency"
        currency="USD"
        locale="en-US"
        className="w-full"
      />
    );
  };

  const descriptionEditor = (options: ColumnEditorOptions) => {
    return <InputText type="text" value={options.value} onChange={(e) => options.editorCallback?.(e.target.value)} className="w-full" />;
  };

  const nameEditor = (options: ColumnEditorOptions) => {
    return <InputText type="text" value={options.value} onChange={(e) => options.editorCallback?.(e.target.value)} className="w-full" />;
  };

  const quantityEditor = (options: ColumnEditorOptions) => {
    return <InputNumber value={options.value} onValueChange={(e) => options.editorCallback?.(e.value)} min={1} showButtons className="w-full" />;
  };

  const statusEditor = (options: ColumnEditorOptions) => {
    return (
      <Dropdown
        value={options.value}
        options={statusOptions}
        onChange={(e) => options.editorCallback?.(e.value)}
        placeholder="Select Status"
        className="w-full"
      />
    );
  };

  // Body templates
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  const quotePriceBodyTemplate = (rowData: RequestData) => {
    return <span style={{ color: "#334155", fontWeight: 600 }}>{formatCurrency(rowData.quotePrice)}</span>;
  };

  const finalPriceBodyTemplate = (rowData: RequestData) => {
    return (
      <span style={{ color: rowData.finalPrice > 0 ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
        {rowData.finalPrice > 0 ? formatCurrency(rowData.finalPrice) : "—"}
      </span>
    );
  };

  const statusBodyTemplate = (rowData: RequestData) => {
    return <Tag value={formatStatusLabel(rowData.status)} severity={getStatusSeverity(rowData.status)} />;
  };

  const descriptionBodyTemplate = (rowData: RequestData) => {
    return <span style={{ color: "#334155" }}>{rowData.description.length > 60 ? rowData.description.slice(0, 60) + "…" : rowData.description}</span>;
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

  const deleteBodyTemplate = (rowData: RequestData) => {
    return <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => confirmDelete(rowData)} />;
  };

  const statusFilterOptions = [{ label: "All Statuses", value: "ALL" }, ...statusOptions];

  const header = (
    <div className="flex justify-content-between align-items-center flex-wrap gap-2">
      <span className="font-semibold text-lg" style={{ color: "#4338ca" }}>
        Customer Requests
      </span>
      <div className="flex align-items-center gap-2">
        <Dropdown
          value={statusFilter}
          options={statusFilterOptions}
          onChange={(e) => onStatusFilterChange(e.value)}
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
        globalFilterFields={["name", "description", "status", "customerId"]}
        header={header}
        emptyMessage="No requests found."
        stripedRows
        removableSort
        editMode="row"
        dataKey="id"
        onRowEditComplete={onRowEditComplete}
        className="border-round-xl"
      >
        <Column
          field="name"
          header="Name"
          body={(rowData: RequestData) => <span style={{ color: "#334155" }}>{rowData.name}</span>}
          editor={nameEditor}
          sortable
          style={{ minWidth: "10rem" }}
        />
        <Column field="quantity" header="Qty" editor={quantityEditor} sortable style={{ width: "6rem" }} />
        <Column
          field="description"
          header="Description"
          body={descriptionBodyTemplate}
          editor={descriptionEditor}
          sortable
          style={{ maxWidth: "20rem" }}
        />
        <Column field="quotePrice" header="Quote Price" body={quotePriceBodyTemplate} editor={priceEditor} sortable />
        <Column field="finalPrice" header="Final Price" body={finalPriceBodyTemplate} editor={priceEditor} sortable />
        <Column field="status" header="Status" body={statusBodyTemplate} editor={statusEditor} sortable />
        <Column field="createdAt" header="Created" body={dateBodyTemplate} sortable />
        <Column rowEditor headerStyle={{ width: "7rem" }} bodyStyle={{ textAlign: "center" }} />
        <Column body={deleteBodyTemplate} headerStyle={{ width: "4rem" }} bodyStyle={{ textAlign: "center" }} />
      </DataTable>
    </>
  );
}
