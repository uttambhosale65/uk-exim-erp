"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sales } from "./SalesTypes";
import { Customer } from "../CustomerTypes";
import { loadCustomers } from "../CustomerStorage";

import { Product } from "../../../product/components/ProductTypes";
import { loadProducts } from "../../../product/components/ProductStorage";




type SalesFormProps = {
  salesNo: string;
  invoiceNo: string;
  editData?: Sales | null;
  onSave: (sale: Sales) => void;
};

const SalesForm: React.FC<SalesFormProps> = ({
  salesNo,
  invoiceNo,
  editData,
  onSave,
}) => {
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
const [customers] = useState<Customer[]>(loadCustomers());
const [products] = useState<Product[]>(loadProducts());
useEffect(() => {
  if (editData) {
    setForm(editData);
  } else {
    setForm((prev) => ({
      ...initialForm,
      salesNo,
      invoiceNo,
    }));
  }
}, [editData, salesNo, invoiceNo]);

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
    setForm({
      ...initialForm,
      salesNo,
      invoiceNo,
      salesDate: today,
    });
  };
  return (
    <div className="bg-white rounded-xl shadow-md p-3">
      <h2 className="text-xl font-bold mb-2 text-blue-700">
        Sales Entry
      </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

        {/* Sales Details */}

        <div>
          <label className="block text-sm font-medium mb-1">
            Sales No
          </label>
          <input
            type="text"
            name="salesNo"
            value={form.salesNo}
            readOnly
            className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100"
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
            readOnly
            className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100"
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
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Customer */}
<div>
  <label className="block text-sm font-medium mb-1">
    Customer Name
  </label>
  <select
    name="customerCode"
    value={form.customerCode}
    onChange={(e) => {
      const customer = customers.find(c => c.code === e.target.value);
      setForm(prev => ({
        ...prev,
        customerCode: customer?.code || "",
        customerName: customer?.name || "",
      }));
    }}
    className="w-full border rounded-lg p-2"
  >
    <option value="">Select Customer</option>
    {customers.map(c => (
      <option key={c.code} value={c.code}>
        {c.name}
      </option>
    ))}
  </select>
</div>

        {/* Product */}
<div>
  <label className="block text-sm font-medium mb-1">
    Product Name
  </label>
  <select
    name="productCode"
    value={form.productCode}
    onChange={(e) => {
      const product = products.find(p => p.code === e.target.value);
console.log(product);
      setForm(prev => ({
        ...prev,
        productCode: product?.code || "",
        productName: product?.name || "",
        hsn: product?.hsn || "",
        unit: product?.unit || "",
        rate: Number(product?.sale ?? 0),
        gst: Number((product?.gst ?? "0").replace("%", "")),
      }));
    }}
    className="w-full border rounded-lg p-2"
  >
    <option value="">Select Product</option>
    {products.map(p => (
      <option key={p.code} value={p.code}>
        {p.name}
      </option>
    ))}
  </select>
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
            className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100"
          />
        </div>

    {/* GST */}

<div>
  <label className="block text-sm font-medium mb-1">
    GST %
  </label>
  <input
    type="number"
    value={form.gst}
    readOnly
    className="w-full border rounded-lg p-2 bg-gray-100"
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

<div className="flex justify-end gap-2 mt-4">

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

      // Validation
      if (!form.customerCode.trim()) {
        alert("Please select Customer.");
        return;
      }

      if (!form.productCode.trim()) {
        alert("Please select Product.");
        return;
      }

      if (form.qty <= 0) {
        alert("Quantity should be greater than zero.");
        return;
      }

      if (form.rate <= 0) {
        alert("Rate should be greater than zero.");
        return;
      }

      const now = new Date().toISOString();

          const sale: Sales = {
  ...form,
id: form.id || crypto.randomUUID(),
  amount,
  gstAmount,

  taxableAmount: amount,

  cgst: form.gst / 2,
  sgst: form.gst / 2,
  igst: 0,

  grandTotal,
  netAmount: grandTotal,

  createdAt: form.createdAt || now,
  updatedAt: now,
};

onSave(sale);

handleReset();

            alert("Sales Entry Saved Successfully.");
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