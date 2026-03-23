"use client";
import React, { useState, useEffect } from "react";
import { DataTable, DataTableRowEditCompleteEvent } from "primereact/datatable";
import { Column, ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
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

export default function EmployeeRequestTable() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
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

  const displayedRequests = requests.filter((r) => r.status === "PENDING");

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(value);
  };

  const onRowEditComplete = async (e: DataTableRowEditCompleteEvent) => {
    const { newData } = e;
    const updated = newData as RequestData;

    try {
      const res = await fetch(`/api/request/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotePrice: updated.quotePrice,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      const saved = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    } catch {
      // revert — original data stays
    }
  };

  // Editors — employee can only set quote price and status
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

  // Body templates
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  const quotePriceBodyTemplate = (rowData: RequestData) => {
    return <span style={{ color: "#334155", fontWeight: 600 }}>{formatCurrency(rowData.quotePrice)}</span>;
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

  const header = (
    <div className="flex justify-content-between align-items-center flex-wrap gap-2">
      <span className="font-semibold text-lg" style={{ color: "#4338ca" }}>
        Pending Requests
      </span>
      <IconField iconPosition="left">
        <InputIcon className="pi pi-search" />
        <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search requests..." />
      </IconField>
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
      <Column field="name" header="Name" sortable style={{ minWidth: "10rem" }} />
      <Column field="quantity" header="Qty" sortable style={{ width: "5rem" }} />
      <Column field="description" header="Description" body={descriptionBodyTemplate} sortable style={{ maxWidth: "20rem" }} />
      <Column field="quotePrice" header="Quote Price" body={quotePriceBodyTemplate} editor={priceEditor} sortable />
      <Column field="createdAt" header="Created" body={dateBodyTemplate} sortable />
      <Column rowEditor headerStyle={{ width: "7rem" }} bodyStyle={{ textAlign: "center" }} />
    </DataTable>
  );
}
