"use client";
import React, { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { FilterMatchMode } from "primereact/api";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Dropdown } from "primereact/dropdown";

interface RequestData {
  id: string;
  customerId: string;
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

interface CustomerRequestTableProps {
  refreshKey: number;
  customerId: string;
}

export default function CustomerRequestTable({ refreshKey, customerId }: CustomerRequestTableProps) {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filters, setFilters] = useState({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

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

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(value);
  };

  // Body templates
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
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
    <DataTable
      value={displayedRequests}
      paginator
      rows={10}
      rowsPerPageOptions={[5, 10, 25]}
      loading={loading}
      filters={filters}
      globalFilterFields={["description", "status"]}
      header={header}
      emptyMessage="No requests found."
      stripedRows
      removableSort
      dataKey="id"
      className="border-round-xl"
    >
      <Column field="description" header="Description" body={descriptionBodyTemplate} sortable style={{ maxWidth: "20rem" }} />
      <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ width: "10rem" }} />
      <Column field="finalPrice" header="Price" body={priceBodyTemplate} sortable />
      <Column field="createdAt" header="Submitted" body={dateBodyTemplate} sortable />
    </DataTable>
  );
}
