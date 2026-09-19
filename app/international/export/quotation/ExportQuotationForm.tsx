"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExportQuotation,
  ExportQuotationItem,
} from "./ExportQuotationTypes";
import { ExportEnquiry } from "../enquiry/ExportEnquiryTypes";
import { loadExportCustomers } from "../customer/ExportCustomerStorage";
import { ExportCustomer } from "../customer/ExportCustomerTypes";

type ExportQuotationFormProps = {
  quotations: ExportQuotation[];
  enquiries: ExportEnquiry[];
  editingQuotation: ExportQuotation | null;
  onSave: (quotation: ExportQuotation) => void;
  onReset: () => void;
};

function formatDateForDisplay(value: string): string {
  if (!value) return "";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateForInput(value: string): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parts = value.split("/");
  if (parts.length !== 3) return "";

  const [day, month, year] = parts;

  if (year.length !== 4) return "";

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isValidDateDisplay(value: string): boolean {
  if (!value) return false;

  const parts = value.split("/");
  if (parts.length !== 3) return false;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return false;
  }

  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatDateForStorage(value: string): string {
  const parts = value.split("/");
  if (parts.length !== 3) return "";

  const [day, month, year] = parts;

  if (
    day.length !== 2 ||
    month.length !== 2 ||
    year.length !== 4
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function getToday(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultValidityDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 15);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmptyItem(): ExportQuotationItem {
  return {
    productCode: "",
    productName: "",
    qty: 0,
    unit: "",
    unitPrice: 0,
    amount: 0,
    customerRequirement: "",
  };
}

export default function ExportQuotationForm({
  quotations,
  enquiries,
  editingQuotation,
  onSave,
  onReset,
}: ExportQuotationFormProps) {
  const [quotationNo, setQuotationNo] = useState("");
  const [quotationDate, setQuotationDate] = useState(getToday());
  const [quotationDateDisplay, setQuotationDateDisplay] = useState(
    formatDateForDisplay(getToday())
  );
  const [enquiryNo, setEnquiryNo] = useState("");

  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [items, setItems] = useState<ExportQuotationItem[]>([
    createEmptyItem(),
  ]);

  const [validityDate, setValidityDate] = useState(
    getDefaultValidityDate()
  );
  const [validityDateDisplay, setValidityDateDisplay] = useState(
    formatDateForDisplay(getDefaultValidityDate())
  );

  const [incoterm, setIncoterm] = useState("FOB");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [freight, setFreight] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] =
    useState<ExportQuotation["status"]>("Draft");

  const [customers, setCustomers] = useState<ExportCustomer[]>([]);
  const [error, setError] = useState("");

  const isEditMode = Boolean(editingQuotation);

  useEffect(() => {
    setCustomers(loadExportCustomers());
  }, []);

  const nextQuotationNo = useMemo(() => {
    if (editingQuotation) {
      return editingQuotation.quotationNo;
    }

    if (quotations.length === 0) {
      return "EXP-QTN-0001";
    }

    const maxNumber = Math.max(
      ...quotations.map((quotation) => {
        const match = quotation.quotationNo.match(/EXP-QTN-(\d+)/);
        return match ? Number(match[1]) : 0;
      })
    );

    return `EXP-QTN-${String(maxNumber + 1).padStart(4, "0")}`;
  }, [quotations, editingQuotation]);

  useEffect(() => {
    if (editingQuotation) {
      setQuotationNo(editingQuotation.quotationNo);
      setQuotationDate(editingQuotation.quotationDate);
      setQuotationDateDisplay(
        formatDateForDisplay(editingQuotation.quotationDate)
      );
      setEnquiryNo(editingQuotation.enquiryNo);

      setCustomerCode(editingQuotation.customerCode);
      setCustomerName(editingQuotation.customerName);
      setContactPerson(editingQuotation.contactPerson);
      setCountry(editingQuotation.country);
      setCurrency(editingQuotation.currency);

      setItems(
        editingQuotation.items.length > 0
          ? editingQuotation.items
          : [createEmptyItem()]
      );

      setValidityDate(editingQuotation.validityDate);
      setValidityDateDisplay(
        formatDateForDisplay(editingQuotation.validityDate)
      );
      setIncoterm(editingQuotation.incoterm);
      setPaymentTerms(editingQuotation.paymentTerms);
      setFreight(editingQuotation.freight);
      setInsurance(editingQuotation.insurance);
      setOtherCharges(editingQuotation.otherCharges);
      setRemarks(editingQuotation.remarks);
      setStatus(editingQuotation.status);
      setError("");

      return;
    }

    setQuotationNo(nextQuotationNo);
    setQuotationDate(getToday());
    setQuotationDateDisplay(formatDateForDisplay(getToday()));
    setEnquiryNo("");
    setCustomerCode("");
    setCustomerName("");
    setContactPerson("");
    setCountry("");
    setCurrency("USD");
    setItems([createEmptyItem()]);
    setValidityDate(getDefaultValidityDate());
    setValidityDateDisplay(
      formatDateForDisplay(getDefaultValidityDate())
    );
    setIncoterm("FOB");
    setPaymentTerms("");
    setFreight(0);
    setInsurance(0);
    setOtherCharges(0);
    setRemarks("");
    setStatus("Draft");
    setError("");
  }, [editingQuotation, nextQuotationNo]);

  function handleEnquiryChange(selectedEnquiryNo: string) {
    setEnquiryNo(selectedEnquiryNo);
    setError("");

    if (!selectedEnquiryNo) {
      setCustomerCode("");
      setCustomerName("");
      setContactPerson("");
      setCountry("");
      setCurrency("USD");
      setItems([createEmptyItem()]);
      setIncoterm("FOB");
      setPaymentTerms("");
      setRemarks("");
      return;
    }

    const enquiry = enquiries.find(
      (item) => item.enquiryNo === selectedEnquiryNo
    );

    if (!enquiry) {
      return;
    }

    const customer = customers.find(
      (item) => item.code === enquiry.customerCode
    );

    setCustomerCode(enquiry.customerCode);
    setCustomerName(enquiry.customerName);
    setContactPerson(enquiry.contactPerson);
    setCountry(enquiry.country);
    setCurrency(enquiry.currency || "USD");

    setIncoterm(enquiry.incoterm || "FOB");

    setPaymentTerms(
      customer?.paymentTerms ||
        ""
    );

    setItems(
      enquiry.items.length > 0
        ? enquiry.items.map((item) => ({
            productCode: item.productCode,
            productName: item.productName,
            qty: Number(item.qty) || 0,
            unit: item.unit,
            unitPrice: 0,
            amount: 0,
            customerRequirement: item.customerRequirement,
          }))
        : [createEmptyItem()]
    );

    setRemarks(enquiry.remarks || "");
  }

  function updateItem(
    index: number,
    field: keyof ExportQuotationItem,
    value: string | number
  ) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const updatedItem = {
          ...item,
          [field]: value,
        };

        if (field === "qty" || field === "unitPrice") {
          const qty =
            field === "qty" ? Number(value) || 0 : Number(item.qty) || 0;

          const unitPrice =
            field === "unitPrice"
              ? Number(value) || 0
              : Number(item.unitPrice) || 0;

          updatedItem.amount = qty * unitPrice;
        }

        return updatedItem;
      })
    );
  }

  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      createEmptyItem(),
    ]);
  }

  function removeItem(index: number) {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return [createEmptyItem()];
      }

      return currentItems.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  }

  const totalGoodsValue = useMemo(() => {
    return items.reduce(
      (total, item) => total + (Number(item.amount) || 0),
      0
    );
  }, [items]);

  const totalQuotationValue = useMemo(() => {
    return (
      totalGoodsValue +
      (Number(freight) || 0) +
      (Number(insurance) || 0) +
      (Number(otherCharges) || 0)
    );
  }, [totalGoodsValue, freight, insurance, otherCharges]);

  function handleQuotationDateChange(value: string) {
    setQuotationDateDisplay(value);

    if (isValidDateDisplay(value)) {
      setQuotationDate(formatDateForStorage(value));
    }
  }

  function handleQuotationDatePicker(value: string) {
    setQuotationDate(value);
    setQuotationDateDisplay(formatDateForDisplay(value));
  }

  function handleValidityDateChange(value: string) {
    setValidityDateDisplay(value);

    if (isValidDateDisplay(value)) {
      setValidityDate(formatDateForStorage(value));
    }
  }

  function handleValidityDatePicker(value: string) {
    setValidityDate(value);
    setValidityDateDisplay(formatDateForDisplay(value));
  }

  function handleSave() {
    setError("");

    if (!quotationDate) {
      setError("Quotation Date is required.");
      return;
    }

    if (!isValidDateDisplay(quotationDateDisplay)) {
      setError("Please enter a valid Quotation Date.");
      return;
    }

    if (!enquiryNo) {
      setError("Please select an Export Enquiry.");
      return;
    }

    if (!customerName) {
      setError("Customer is required.");
      return;
    }

    if (items.length === 0) {
      setError("At least one product is required.");
      return;
    }

    const invalidItem = items.find(
      (item) =>
        !item.productCode ||
        !item.productName ||
        Number(item.qty) <= 0 ||
        Number(item.unitPrice) <= 0
    );

    if (invalidItem) {
      setError(
        "Please enter Product, Quantity and Unit Price for every item."
      );
      return;
    }

    if (!validityDate) {
      setError("Validity Date is required.");
      return;
    }

    if (!isValidDateDisplay(validityDateDisplay)) {
      setError("Please enter a valid Validity Date.");
      return;
    }

    const now = new Date().toISOString();

    const quotation: ExportQuotation = {
      id:
        editingQuotation?.id ||
        `exp-qtn-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      quotationNo:
        editingQuotation?.quotationNo || quotationNo,

      quotationDate,
      enquiryNo,

      customerCode,
      customerName,
      contactPerson,
      country,
      currency,

      items: items.map((item) => ({
        ...item,
        qty: Number(item.qty) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        amount:
          (Number(item.qty) || 0) *
          (Number(item.unitPrice) || 0),
      })),

      validityDate,
      incoterm,
      paymentTerms,

      freight: Number(freight) || 0,
      insurance: Number(insurance) || 0,
      otherCharges: Number(otherCharges) || 0,

      totalGoodsValue,
      totalQuotationValue,

      remarks,
      status,

      createdAt:
        editingQuotation?.createdAt || now,

      updatedAt: now,
    };

    onSave(quotation);
  }

  function handleReset() {
    setError("");
    onReset();
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditMode
              ? "Edit Export Quotation"
              : "Export Quotation"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Create quotation from an existing Export Enquiry.
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-2 text-right">
          <div className="text-xs text-gray-500">
            Quotation No.
          </div>

          <div className="font-semibold text-gray-800">
            {quotationNo || nextQuotationNo}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Quotation No.
          </label>

          <input
            type="text"
            value={quotationNo || nextQuotationNo}
            readOnly
            className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Quotation Date
          </label>

          <div className="relative">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quotationDateDisplay}
                onChange={(event) =>
                  handleQuotationDateChange(event.target.value)
                }
                placeholder="DD/MM/YYYY"
                maxLength={10}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />

              <label
                title="Select Quotation Date"
                className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-lg"
              >
                📅
                <input
                  type="date"
                  value={formatDateForInput(quotationDate)}
                  onChange={(event) =>
                    handleQuotationDatePicker(event.target.value)
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Select Quotation Date"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Select Export Enquiry
          </label>

          <select
            value={enquiryNo}
            onChange={(event) =>
              handleEnquiryChange(event.target.value)
            }
            disabled={isEditMode}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
          >
            <option value="">
              -- Select Export Enquiry --
            </option>

            {enquiries.map((enquiry) => (
              <option
                key={enquiry.id}
                value={enquiry.enquiryNo}
              >
                {enquiry.enquiryNo} - {enquiry.customerName}
              </option>
            ))}
          </select>

          {isEditMode && (
            <p className="mt-1 text-xs text-gray-500">
              Enquiry reference cannot be changed during edit.
            </p>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Customer Details
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Customer Code
            </label>

            <input
              value={customerCode}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Customer
            </label>

            <input
              value={customerName}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Contact Person
            </label>

            <input
              value={contactPerson}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Country
            </label>

            <input
              value={country}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Commercial terms */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Currency
          </label>

          <select
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="AED">AED</option>
            <option value="INR">INR</option>
            <option value="JPY">JPY</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Incoterm
          </label>

          <select
            value={incoterm}
            onChange={(event) =>
              setIncoterm(event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="FOB">FOB</option>
            <option value="CFR">CFR</option>
            <option value="CIF">CIF</option>
            <option value="EXW">EXW</option>
            <option value="FCA">FCA</option>
            <option value="CPT">CPT</option>
            <option value="CIP">CIP</option>
            <option value="DAP">DAP</option>
            <option value="DDP">DDP</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Payment Terms
          </label>

          <input
            type="text"
            value={paymentTerms}
            onChange={(event) =>
              setPaymentTerms(event.target.value)
            }
            placeholder="e.g. Advance / LC / TT"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Validity Date
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={validityDateDisplay}
              onChange={(event) =>
                handleValidityDateChange(event.target.value)
              }
              placeholder="DD/MM/YYYY"
              maxLength={10}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <label
              title="Select Validity Date"
              className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-lg"
            >
              📅
              <input
                type="date"
                value={formatDateForInput(validityDate)}
                onChange={(event) =>
                  handleValidityDatePicker(event.target.value)
                }
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Select Validity Date"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">
            Quotation Products
          </h3>

          <button
            type="button"
            onClick={addItem}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            + Add Product
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-[1100px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border-b px-3 py-3">
                  Sr.
                </th>

                <th className="border-b px-3 py-3">
                  Product
                </th>

                <th className="border-b px-3 py-3">
                  Qty
                </th>

                <th className="border-b px-3 py-3">
                  Unit
                </th>

                <th className="border-b px-3 py-3">
                  Unit Price
                </th>

                <th className="border-b px-3 py-3">
                  Amount
                </th>

                <th className="border-b px-3 py-3">
                  Customer Requirement
                </th>

                <th className="border-b px-3 py-3">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.productCode}-${index}`}>
                  <td className="border-b px-3 py-3">
                    {index + 1}
                  </td>

                  <td className="border-b px-3 py-3">
                    <div className="font-medium text-gray-800">
                      {item.productName || "-"}
                    </div>

                    <div className="text-xs text-gray-500">
                      {item.productCode || "-"}
                    </div>
                  </td>

                  <td className="border-b px-3 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={item.qty}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "qty",
                          Number(event.target.value)
                        )
                      }
                      className="w-24 rounded-lg border border-gray-300 px-2 py-2"
                    />
                  </td>

                  <td className="border-b px-3 py-3">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "unit",
                          event.target.value
                        )
                      }
                      className="w-20 rounded-lg border border-gray-300 px-2 py-2"
                    />
                  </td>

                  <td className="border-b px-3 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "unitPrice",
                          Number(event.target.value)
                        )
                      }
                      className="w-32 rounded-lg border border-gray-300 px-2 py-2"
                    />
                  </td>

                  <td className="border-b px-3 py-3 font-semibold">
                    {item.amount.toFixed(2)}
                  </td>

                  <td className="border-b px-3 py-3">
                    <input
                      type="text"
                      value={item.customerRequirement}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "customerRequirement",
                          event.target.value
                        )
                      }
                      className="w-64 rounded-lg border border-gray-300 px-2 py-2"
                    />
                  </td>

                  <td className="border-b px-3 py-3">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charges & Totals */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">
            Additional Charges
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-700">
                Freight
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={freight}
                onChange={(event) =>
                  setFreight(Number(event.target.value) || 0)
                }
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-700">
                Insurance
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={insurance}
                onChange={(event) =>
                  setInsurance(Number(event.target.value) || 0)
                }
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-700">
                Other Charges
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={otherCharges}
                onChange={(event) =>
                  setOtherCharges(
                    Number(event.target.value) || 0
                  )
                }
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">
            Quotation Summary
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Total Goods Value</span>

              <span className="font-semibold">
                {currency} {totalGoodsValue.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Freight</span>

              <span>
                {currency} {(Number(freight) || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Insurance</span>

              <span>
                {currency} {(Number(insurance) || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Other Charges</span>

              <span>
                {currency} {(Number(otherCharges) || 0).toFixed(2)}
              </span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total Quotation Value</span>

                <span>
                  {currency} {totalQuotationValue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks & Status */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Remarks
          </label>

          <textarea
            value={remarks}
            onChange={(event) =>
              setRemarks(event.target.value)
            }
            rows={3}
            placeholder="Enter quotation remarks..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as ExportQuotation["status"]
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Under Discussion">
              Under Discussion
            </option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-end gap-3 border-t pt-5">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
        >
          {isEditMode
            ? "Update Quotation"
            : "Save Quotation"}
        </button>
      </div>
    </div>
  );
}