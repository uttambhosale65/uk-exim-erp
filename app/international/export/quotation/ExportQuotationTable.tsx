"use client";

import { useMemo, useState } from "react";
import { ExportQuotation } from "./ExportQuotationTypes";
import ExportQuotationPrint from "./ExportQuotationPrint";

type ExportQuotationTableProps = {
  quotations: ExportQuotation[];
  onEdit: (quotation: ExportQuotation) => void;
  onDelete: (quotation: ExportQuotation) => void;
};

function formatDate(value: string): string {
  if (!value) return "-";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatAmount(value: number): string {
  return Number(value || 0).toFixed(2);
}

export default function ExportQuotationTable({
  quotations,
  onEdit,
  onDelete,
}: ExportQuotationTableProps) {
  const [search, setSearch] = useState("");

  const [printingQuotation, setPrintingQuotation] =
    useState<ExportQuotation | null>(null);

  const filteredQuotations = useMemo(() => {
    const query = search.trim().toLowerCase();

    const sorted = [...quotations].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      return dateB - dateA;
    });

    if (!query) {
      return sorted;
    }

    return sorted.filter((quotation) => {
      const productText = quotation.items
        .map(
          (item) =>
            `${item.productCode} ${item.productName} ${item.customerRequirement}`
        )
        .join(" ");

      const searchableText = [
        quotation.quotationNo,
        quotation.quotationDate,
        quotation.enquiryNo,
        quotation.customerCode,
        quotation.customerName,
        quotation.contactPerson,
        quotation.country,
        quotation.currency,
        quotation.incoterm,
        quotation.paymentTerms,
        quotation.status,
        quotation.remarks,
        productText,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [quotations, search]);

  function handleDelete(quotation: ExportQuotation) {
    const confirmed = window.confirm(
      `Delete quotation ${quotation.quotationNo}?`
    );

    if (!confirmed) return;

    onDelete(quotation);
  }

  /*
   * PRINT PREVIEW
   *
   * Register मधील एखाद्या quotation चा Print button
   * click केल्यावर selected quotation इथे येईल.
   *
   * Existing Register data delete किंवा modify होत नाही.
   */
  if (printingQuotation) {
    return (
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPrintingQuotation(null)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back to Quotation Register
          </button>

          <div className="text-sm font-medium text-gray-600">
            Preview: {printingQuotation.quotationNo}
          </div>
        </div>

        <ExportQuotationPrint
          quotation={printingQuotation}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Export Quotation Register
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage, review and print export quotations.
          </p>
        </div>

        <div className="w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search quotation, customer, product..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-[1500px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border-b px-3 py-3 font-semibold">
                Quotation No.
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Date
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Enquiry No.
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Customer
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Contact Person
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Country
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Currency
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Products
              </th>

              <th className="border-b px-3 py-3 font-semibold text-right">
                Goods Value
              </th>

              <th className="border-b px-3 py-3 font-semibold text-right">
                Total Value
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Incoterm
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Validity
              </th>

              <th className="border-b px-3 py-3 font-semibold">
                Status
              </th>

              <th className="border-b px-3 py-3 font-semibold text-center">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredQuotations.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  {search
                    ? "No quotations found."
                    : "No export quotations available."}
                </td>
              </tr>
            ) : (
              filteredQuotations.map((quotation) => (
                <tr
                  key={quotation.id}
                  className="hover:bg-gray-50"
                >
                  <td className="border-b px-3 py-3 align-top">
                    <div className="font-semibold text-gray-800">
                      {quotation.quotationNo}
                    </div>
                  </td>

                  <td className="border-b px-3 py-3 align-top whitespace-nowrap">
                    {formatDate(quotation.quotationDate)}
                  </td>

                  <td className="border-b px-3 py-3 align-top whitespace-nowrap">
                    {quotation.enquiryNo || "-"}
                  </td>

                  <td className="border-b px-3 py-3 align-top">
                    <div className="font-medium text-gray-800">
                      {quotation.customerName || "-"}
                    </div>

                    {quotation.customerCode && (
                      <div className="text-xs text-gray-500">
                        {quotation.customerCode}
                      </div>
                    )}
                  </td>

                  <td className="border-b px-3 py-3 align-top">
                    {quotation.contactPerson || "-"}
                  </td>

                  <td className="border-b px-3 py-3 align-top">
                    {quotation.country || "-"}
                  </td>

                  <td className="border-b px-3 py-3 align-top">
                    {quotation.currency || "-"}
                  </td>

                  <td className="border-b px-3 py-3 align-top">
                    <div className="space-y-2">
                      {quotation.items.map((item, index) => (
                        <div
                          key={`${quotation.id}-${item.productCode}-${index}`}
                          className="rounded-md bg-gray-50 px-2 py-1.5"
                        >
                          <div className="font-medium text-gray-800">
                            {item.productName || "-"}
                          </div>

                          <div className="text-xs text-gray-500">
                            {item.productCode || "-"} |{" "}
                            {Number(item.qty || 0)}{" "}
                            {item.unit || ""}
                          </div>

                          <div className="text-xs text-gray-600">
                            Unit Price:{" "}
                            {quotation.currency}{" "}
                            {formatAmount(item.unitPrice)}
                            {" | "}
                            Amount:{" "}
                            {quotation.currency}{" "}
                            {formatAmount(item.amount)}
                          </div>

                          {item.customerRequirement && (
                            <div className="mt-1 text-xs text-gray-500">
                              Requirement:{" "}
                              {item.customerRequirement}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="border-b px-3 py-3 text-right align-top whitespace-nowrap">
                    {quotation.currency}{" "}
                    {formatAmount(
                      quotation.totalGoodsValue
                    )}
                  </td>

                  <td className="border-b px-3 py-3 text-right align-top whitespace-nowrap font-semibold">
                    {quotation.currency}{" "}
                    {formatAmount(
                      quotation.totalQuotationValue
                    )}
                  </td>

                  <td className="border-b px-3 py-3 align-top whitespace-nowrap">
                    {quotation.incoterm || "-"}
                  </td>

                  <td className="border-b px-3 py-3 align-top whitespace-nowrap">
                    {formatDate(quotation.validityDate)}
                  </td>

                  <td className="border-b px-3 py-3 align-top whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        quotation.status === "Accepted"
                          ? "bg-green-100 text-green-700"
                          : quotation.status === "Rejected" ||
                            quotation.status === "Cancelled"
                          ? "bg-red-100 text-red-700"
                          : quotation.status === "Sent"
                          ? "bg-blue-100 text-blue-700"
                          : quotation.status ===
                            "Under Discussion"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {quotation.status}
                    </span>
                  </td>

                  <td className="border-b px-3 py-3 align-top">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(quotation)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPrintingQuotation(quotation)
                        }
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Print
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(quotation)
                        }
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Showing {filteredQuotations.length} of{" "}
        {quotations.length} quotation
        {quotations.length === 1 ? "" : "s"}.
      </div>
    </div>
  );
}