"use client";

import { useEffect, useState } from "react";
import ExportQuotationForm from "./ExportQuotationForm";
import ExportQuotationTable from "./ExportQuotationTable";
import {
  loadExportQuotations,
  saveExportQuotations,
} from "./ExportQuotationStorage";
import { ExportQuotation } from "./ExportQuotationTypes";
import { ExportEnquiry } from "../enquiry/ExportEnquiryTypes";
import { loadExportEnquiries } from "../enquiry/ExportEnquiryStorage";

export default function ExportQuotationMaster() {
  const [quotations, setQuotations] = useState<ExportQuotation[]>([]);
  const [enquiries, setEnquiries] = useState<ExportEnquiry[]>([]);
  const [editingQuotation, setEditingQuotation] =
    useState<ExportQuotation | null>(null);

  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    setQuotations(loadExportQuotations());
    setEnquiries(loadExportEnquiries());
  }, []);

  function handleSave(quotation: ExportQuotation) {
    const currentQuotations = loadExportQuotations();

    const existingIndex = currentQuotations.findIndex(
      (item) => item.id === quotation.id
    );

    let updatedQuotations: ExportQuotation[];

    if (existingIndex >= 0) {
      updatedQuotations = [...currentQuotations];

      updatedQuotations[existingIndex] = quotation;
    } else {
      updatedQuotations = [
        ...currentQuotations,
        quotation,
      ];
    }

    saveExportQuotations(updatedQuotations);

    const newestFirst = [...updatedQuotations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    setQuotations(newestFirst);
    setEditingQuotation(null);
    setFormKey((value) => value + 1);
  }

  function handleEdit(quotation: ExportQuotation) {
    setEditingQuotation(quotation);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleDelete(quotation: ExportQuotation) {
    const currentQuotations = loadExportQuotations();

    const updatedQuotations = currentQuotations.filter(
      (item) => item.id !== quotation.id
    );

    saveExportQuotations(updatedQuotations);

    const newestFirst = [...updatedQuotations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    setQuotations(newestFirst);

    if (editingQuotation?.id === quotation.id) {
      setEditingQuotation(null);
      setFormKey((value) => value + 1);
    }
  }

  function handleReset() {
    setEditingQuotation(null);
    setFormKey((value) => value + 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-[1800px]">
        <ExportQuotationForm
          key={formKey}
          quotations={quotations}
          enquiries={enquiries}
          editingQuotation={editingQuotation}
          onSave={handleSave}
          onReset={handleReset}
        />

        <ExportQuotationTable
          quotations={quotations}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}