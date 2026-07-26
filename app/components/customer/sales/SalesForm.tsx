"use client";

import React, { useMemo, useState } from "react";
import { Sales } from "./SalesTypes";

type SalesFormProps = {
  onSave: (sale: Sales) => void;
};

const SalesForm: React.FC<SalesFormProps> = ({ onSave }) => {
  const today = new Date().toISOString().split("T")[0];

  const initialForm: Sales = {
    id: "",

    // Sales Details
    salesNo: "",
    salesDate: today,
    invoiceNo: "",

    // Customer
    customerCode: "",
    customerName: "",

    // Product
    productCode: "",
    productName: "",

    // Product Details
    hsn: "",
    unit: "",

    // Quantity & Rate
    qty: 0,
    rate: 0,

    // Amount Details
    amount: 0,
    gst: 0,
    gstAmount: 0,
    netAmount: 0,

    // GST Breakup
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    grandTotal: 0,

    // Payment Details
    paymentMode: "Cash",

    // Status
    status: "Completed",

    // Other Details
    remarks: "",

    // Audit
    createdAt: "",
    updatedAt: "",
  };

  const [form, setForm] = useState<Sales>(initialForm);

  const amount = useMemo(() => {
    return form.qty * form.rate;
  }, [form.qty, form.rate]);

  const gstAmount = useMemo(() => {
    return (amount * form.gst) / 100;
  }, [amount, form.gst]);

  const grandTotal = useMemo(() => {
    return amount + gstAmount;
  }, [amount, gstAmount]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "qty" ||
        name === "rate" ||
        name === "gst"
          ? Number(value)
          : value,
    }));
  };

  const handleReset = () => {
    setForm(initialForm);
  };
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-blue-700">
        Sales Entry
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Sales Details */}

        <div>
          <label className="block text-sm font-medium mb-1">
            Sales No
          </label>
          <input
            type="text"
            name="salesNo"
            value={form.salesNo}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            placeholder="Auto / Manual"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Sales Date
          </label>
          <input
            type="date"
            name="salesDate"
            value={form.salesDate}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Invoice No
          </label>
          <input
            type="text"
            name="invoiceNo"
            value={form.invoiceNo}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            placeholder="Invoice Number"
          />
        </div>

        {/* Customer Details */}

        <div>
          <label className="block text-sm font-medium mb-1">
            Customer Code
          </label>
          <input
            type="text"
            name="customerCode"
            value={form.customerCode}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            placeholder="Customer Code"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Customer Name
          </label>
          <input
            type="text"
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            placeholder="Customer Name"
          />
        </div>

        {/* Product Details */}

        <div>
          <label className="block text-sm font-medium mb-1">
            Product Code
          </label>
          <input
            type="text"
            name="productCode"
            value={form.productCode}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            placeholder="Product Code"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Product Name
          </label>
          <input
            type="text"
            name="productName"
            value={form.productName}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            placeholder="Product Name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            HSN
          </label>
          <input
            type="text"
            name="hsn"
            value={form.hsn}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            placeholder="HSN Code"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Unit
          </label>
          <input
            type="text"
            name="unit"
            value={form.unit}
            onChange={handleChange}
           className="w-full border rounded-lg p-2"
            placeholder="Kg / Pcs / Box"
          />
        </div>
        {/* Quantity & Rate */}

        <div>
          <label className="block text-sm font-medium mb-1">
            Quantity
          </label>
          <input
            type="number"
            name="qty"
            value={form.qty}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            min={0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Rate
          </label>
          <input
            type="number"
            name="rate"
            value={form.rate}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            min={0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            readOnly
            className="w-full border rounded-lg p-2 bg-gray-100"
          />
        </div>

        {/* GST */}

        <div>
          <label className="block text-sm font-medium mb-1">
            GST %
          </label>
          <input
            type="number"
            name="gst"
            value={form.gst}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            min={0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            GST Amount
          </label>
          <input
            type="number"
            value={gstAmount}
            readOnly
            className="w-full border rounded-lg p-2 bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Grand Total
          </label>
          <input
            type="number"
            value={grandTotal}
            readOnly
            className="w-full border rounded-lg p-2 bg-green-100 font-semibold"
          />
        </div>

        {/* Payment Mode */}

        <div>
          <label className="block text-sm font-medium mb-1">
            Payment Mode
          </label>
          <select
            name="paymentMode"
            value={form.paymentMode}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank">Bank</option>
            <option value="Credit">Credit</option>
          </select>
        </div>

        {/* Remarks */}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Remarks
          </label>
          <textarea
            name="remarks"
            value={form.remarks}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-lg p-2"
            placeholder="Enter Remarks..."
          />
        </div>

      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={handleReset}
          className="px-5 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={() => {
            const now = new Date().toISOString();

            const sale: Sales = {
              ...form,
              amount,
              gstAmount,
              netAmount: grandTotal,
              taxableAmount: amount,
              cgst: form.gst / 2,
              sgst: form.gst / 2,
              igst: 0,
              grandTotal,
              createdAt: form.createdAt || now,
              updatedAt: now,
            };

            onSave(sale);
            handleReset();
          }}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
};
export default SalesForm;