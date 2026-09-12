"use client";

import { useEffect, useState } from "react";
import ExportEnquiryForm from "./ExportEnquiryForm";
import ExportEnquiryTable from "./ExportEnquiryTable";
import {
  ExportEnquiry,
} from "./ExportEnquiryTypes";
import {
  loadExportEnquiries,
  saveExportEnquiries,
  getNextExportEnquiryNo,
} from "./ExportEnquiryStorage";

export default function ExportEnquiryMaster() {
  const [enquiries, setEnquiries] = useState<
    ExportEnquiry[]
  >([]);

  const [editingEnquiry, setEditingEnquiry] =
    useState<ExportEnquiry | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedEnquiries =
      loadExportEnquiries();

    setEnquiries(storedEnquiries);
    setLoading(false);
  }, []);

  function handleSave(
    enquiry: ExportEnquiry
  ) {
    setEnquiries((current) => {
      const existingIndex = current.findIndex(
        (item) => item.id === enquiry.id
      );

      let updated: ExportEnquiry[];

      if (existingIndex >= 0) {
        updated = current.map((item) =>
          item.id === enquiry.id
            ? enquiry
            : item
        );
      } else {
        updated = [enquiry, ...current];
      }

      saveExportEnquiries(updated);

      return updated;
    });

    setEditingEnquiry(null);
  }

  function handleEdit(
    enquiry: ExportEnquiry
  ) {
    setEditingEnquiry(enquiry);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleDelete(id: string) {
    setEnquiries((current) => {
      const updated = current.filter(
        (item) => item.id !== id
      );

      saveExportEnquiries(updated);

      return updated;
    });

    if (editingEnquiry?.id === id) {
      setEditingEnquiry(null);
    }
  }

  function handleReset() {
    setEditingEnquiry(null);
  }

  function handleNewEnquiry() {
    setEditingEnquiry(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const nextEnquiryNo =
    getNextExportEnquiryNo(enquiries);

  if (loading) {
    return (
      <div
        style={{
          padding: 30,
          textAlign: "center",
          color: "#64748b",
          fontSize: 14,
        }}
      >
        Loading Export Enquiries...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      {/* PAGE HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Export Enquiry
          </h1>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            International Export Enquiry Management
          </div>
        </div>

        <button
          type="button"
          onClick={handleNewEnquiry}
          style={{
            height: 36,
            padding: "0 16px",
            border: "none",
            borderRadius: 5,
            background: "#1d4ed8",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New Enquiry
        </button>
      </div>

      {/* FORM */}
      <ExportEnquiryForm
        key={
          editingEnquiry
            ? editingEnquiry.id
            : `new-${nextEnquiryNo}`
        }
        enquiries={enquiries}
        editingEnquiry={editingEnquiry}
        onSave={handleSave}
        onReset={handleReset}
      />

      {/* REGISTER */}
      <ExportEnquiryTable
        enquiries={enquiries}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}