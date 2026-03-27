"use client";
import React, { useState, useEffect } from "react";
import { DataTable, DataTableRowEditCompleteEvent } from "primereact/datatable";
import { Column, ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Avatar } from "primereact/avatar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

const roleOptions = [
  { label: "Admin", value: "ADMIN" },
  { label: "Employee", value: "EMPLOYEE" },
  { label: "Customer", value: "CUSTOMER" },
];

export default function EmployeeTable({ refreshKey }: { refreshKey?: number }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (e) => {
      const { users } = JSON.parse(e.data);
      if (Array.isArray(users)) {
        setEmployees(users);
        setLoading(false);
      }
    };
    source.onerror = () => {};
    return () => source.close();
  }, []);

  useEffect(() => {
    if (refreshKey === 0) return;
    setLoading(true);
    fetch("/api/user", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Employee[]) => setEmployees(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(value);
  };

  const onRowEditComplete = async (e: DataTableRowEditCompleteEvent) => {
    const { newData } = e;
    const updated = newData as Employee;

    try {
      const res = await fetch(`/api/user/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          role: updated.role,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      const saved = await res.json();
      setEmployees((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
    } catch {
      // revert — do nothing, original data stays
    }
  };

  const deleteEmployee = async (employee: Employee) => {
    try {
      const res = await fetch(`/api/user/${employee.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
    } catch {
      // silent fail
    }
  };

  const confirmDelete = (employee: Employee) => {
    confirmDialog({
      message: `Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`,
      header: "Confirm Delete",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => deleteEmployee(employee),
    });
  };

  const textEditor = (options: ColumnEditorOptions) => {
    return <InputText type="text" value={options.value} onChange={(e) => options.editorCallback?.(e.target.value)} className="w-full" />;
  };

  const roleEditor = (options: ColumnEditorOptions) => {
    return (
      <Dropdown
        value={options.value}
        options={roleOptions}
        onChange={(e) => options.editorCallback?.(e.value)}
        placeholder="Select Role"
        className="w-full"
      />
    );
  };

  const nameBodyTemplate = (rowData: Employee) => {
    return (
      <div className="flex align-items-center gap-2">
        <Avatar
          label={`${rowData.firstName[0]}${rowData.lastName[0]}`}
          shape="circle"
          size="normal"
          style={{ backgroundColor: "#6366f1", color: "#fff", fontSize: "0.8rem" }}
        />
        <span className="font-semibold" style={{ color: "#334155" }}>
          {rowData.firstName} {rowData.lastName}
        </span>
      </div>
    );
  };

  const emailBodyTemplate = (rowData: Employee) => {
    return <span style={{ color: "#64748b" }}>{rowData.email}</span>;
  };

  const roleBodyTemplate = (rowData: Employee) => {
    const severity = rowData.role === "ADMIN" ? "danger" : rowData.role === "EMPLOYEE" ? "info" : "success";
    return <Tag value={rowData.role} severity={severity} />;
  };

  const dateBodyTemplate = (rowData: Employee) => {
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

  const deleteBodyTemplate = (rowData: Employee) => {
    return <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => confirmDelete(rowData)} />;
  };

  const header = (
    <div className="flex justify-content-between align-items-center">
      <span className="font-semibold text-lg" style={{ color: "#4338ca" }}>
        Users
      </span>
      <IconField iconPosition="left">
        <InputIcon className="pi pi-search" />
        <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search users..." />
      </IconField>
    </div>
  );

  return (
    <>
      <ConfirmDialog />
      <DataTable
        value={employees}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25]}
        loading={loading}
        filters={filters}
        globalFilterFields={["firstName", "lastName", "email", "role"]}
        header={header}
        emptyMessage="No users found."
        stripedRows
        removableSort
        editMode="row"
        dataKey="id"
        onRowEditComplete={onRowEditComplete}
        scrollable
        scrollHeight="flex"
        tableStyle={{ minWidth: "60rem" }}
        className="border-round-xl"
      >
        <Column header="Name" body={nameBodyTemplate} sortable sortField="firstName" style={{ minWidth: "10rem" }} />
        <Column field="firstName" header="First Name" editor={textEditor} sortable style={{ display: "none" }} />
        <Column field="lastName" header="Last Name" editor={textEditor} sortable style={{ display: "none" }} />
        <Column field="email" header="Email" body={emailBodyTemplate} editor={textEditor} sortable style={{ minWidth: "12rem" }} />
        <Column field="role" header="Role" body={roleBodyTemplate} editor={roleEditor} sortable style={{ minWidth: "8rem" }} />
        <Column field="createdAt" header="Joined" body={dateBodyTemplate} sortable style={{ minWidth: "10rem" }} />
        <Column rowEditor frozen alignFrozen="right" headerStyle={{ width: "5rem" }} bodyStyle={{ textAlign: "center" }} />
        <Column body={deleteBodyTemplate} frozen alignFrozen="right" headerStyle={{ width: "3rem" }} bodyStyle={{ textAlign: "center" }} />
      </DataTable>
    </>
  );
}
