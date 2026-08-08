"use client";

import React, { useEffect, useState } from "react";

import { Sales, SalesItem } from "./SalesTypes";

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

  const [customers] = useState<Customer[]>(loadCustomers());
  const [products] = useState<Product[]>(loadProducts());

  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [salesDate, setSalesDate] = useState(today);

  const [items, setItems] = useState<SalesItem[]>([]);

  const [selectedProductCode, setSelectedProductCode] =
    useState("");

  const [qty, setQty] = useState(0);
  const [rate, setRate] = useState(0);
  const [gst, setGst] = useState(0);

  const [paymentMode, setPaymentMode] =
    useState<Sales["paymentMode"]>("Cash");

  const [status, setStatus] =
    useState<Sales["status"]>("Completed");

  const [remarks, setRemarks] = useState("");

  const [createdAt, setCreatedAt] = useState("");

  // --------------------------------------------------
  // EDIT DATA
  // --------------------------------------------------

  useEffect(() => {
    if (editData) {
      setCustomerCode(editData.customerCode);
      setCustomerName(editData.customerName);
      setSalesDate(editData.salesDate);
      setItems(editData.items || []);
      setPaymentMode(editData.paymentMode);
      setStatus(editData.status);
      setRemarks(editData.remarks);
      setCreatedAt(editData.createdAt);
    } else {
      setCustomerCode("");
      setCustomerName("");
      setSalesDate(today);
      setItems([]);
      setPaymentMode("Cash");
      setStatus("Completed");
      setRemarks("");
      setCreatedAt("");
    }
  }, [editData, salesNo, invoiceNo]);

  // --------------------------------------------------
  // PRODUCT SELECTION
  // --------------------------------------------------

  const handleProductChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const code = e.target.value;

    setSelectedProductCode(code);

    const product = products.find(
      (p) => p.code === code
    );

    if (!product) {
      setQty(0);
      setRate(0);
      setGst(0);
      return;
    }

    setQty(0);

    setRate(Number(product.sale ?? 0));

    const gstValue =
      typeof product.gst === "string"
        ? Number(product.gst.replace("%", ""))
        : Number(product.gst ?? 0);

    setGst(gstValue);
  };

  // --------------------------------------------------
  // ADD PRODUCT
  // --------------------------------------------------

  const handleAddProduct = () => {
    if (!selectedProductCode) {
      alert("Please select Product.");
      return;
    }

    if (qty <= 0) {
      alert("Quantity should be greater than zero.");
      return;
    }

    if (rate <= 0) {
      alert("Rate should be greater than zero.");
      return;
    }

    const product = products.find(
      (p) => p.code === selectedProductCode
    );

    if (!product) {
      alert("Product not found.");
      return;
    }

    const existingProduct = items.find(
      (item) =>
        item.productCode === selectedProductCode
    );

    if (existingProduct) {
      alert(
        "This product is already added. Please remove it first if you want to change the quantity."
      );
      return;
    }

    const amount = qty * rate;

    const gstAmount = (amount * gst) / 100;

    const cgstAmount = gstAmount / 2;

    const sgstAmount = gstAmount / 2;

    const newItem: SalesItem = {
      productCode: product.code,
      productName: product.name,

      hsn: product.hsn,
      unit: product.unit,

      qty,
      rate,

      amount,

      gst,
      gstAmount,

      taxableAmount: amount,

      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: 0,

      grandTotal: amount + gstAmount,
    };

    setItems((prev) => [...prev, newItem]);

    setSelectedProductCode("");
    setQty(0);
    setRate(0);
    setGst(0);
  };

  // --------------------------------------------------
  // REMOVE PRODUCT
  // --------------------------------------------------

  const handleRemoveProduct = (
    productCode: string
  ) => {
    setItems((prev) =>
      prev.filter(
        (item) =>
          item.productCode !== productCode
      )
    );
  };

  // --------------------------------------------------
  // TOTALS
  // --------------------------------------------------

  const taxableAmount = items.reduce(
    (total, item) =>
      total + item.taxableAmount,
    0
  );

  const gstAmount = items.reduce(
    (total, item) =>
      total + item.gstAmount,
    0
  );

  const cgst = items.reduce(
    (total, item) =>
      total + item.cgst,
    0
  );

  const sgst = items.reduce(
    (total, item) =>
      total + item.sgst,
    0
  );

  const igst = items.reduce(
    (total, item) =>
      total + item.igst,
    0
  );

  const grandTotal = items.reduce(
    (total, item) =>
      total + item.grandTotal,
    0
  );

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const handleReset = () => {
    setCustomerCode("");
    setCustomerName("");

    setSalesDate(today);

    setItems([]);

    setSelectedProductCode("");

    setQty(0);
    setRate(0);
    setGst(0);

    setPaymentMode("Cash");

    setStatus("Completed");

    setRemarks("");
  };

  // --------------------------------------------------
  // SAVE SALES
  // --------------------------------------------------

  const handleSave = () => {
    if (!customerCode.trim()) {
      alert("Please select Customer.");
      return;
    }

    if (items.length === 0) {
      alert("Please add at least one Product.");
      return;
    }

    const now = new Date().toISOString();

    const sale: Sales = {
      id:
        editData?.id ||
        crypto.randomUUID(),

      salesNo,

      salesDate,

      invoiceNo,

      customerCode,

      customerName,

      items,

      taxableAmount,

      gstAmount,

      cgst,

      sgst,

      igst,

      grandTotal,

      paymentMode,

      status,

      remarks,

      createdAt:
        createdAt || now,

      updatedAt: now,
    };

    onSave(sale);

    alert(
      "Multi Product Sales Entry Saved Successfully."
    );

    handleReset();
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-white rounded-xl shadow-md p-3">

      {/* TITLE */}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-blue-700">
          Multi Product Sales Entry
        </h2>

        <div className="text-xs text-gray-500">
          {items.length} Product
          {items.length !== 1 ? "s" : ""} Added
        </div>
      </div>

      {/* SALES DETAILS + CUSTOMER */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">

        <div>
          <label className="block text-xs font-medium mb-1">
            Sales No
          </label>

          <input
            type="text"
            value={salesNo}
            readOnly
            className="w-full border rounded-md px-2 py-1.5 text-sm bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Invoice No
          </label>

          <input
            type="text"
            value={invoiceNo}
            readOnly
            className="w-full border rounded-md px-2 py-1.5 text-sm bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Sales Date
          </label>

          <input
            type="date"
            value={salesDate}
            onChange={(e) =>
              setSalesDate(e.target.value)
            }
            className="w-full border rounded-md px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Customer
          </label>

          <select
            value={customerCode}
            onChange={(e) => {
              const customer =
                customers.find(
                  (c) =>
                    c.code === e.target.value
                );

              setCustomerCode(
                customer?.code || ""
              );

              setCustomerName(
                customer?.name || ""
              );
            }}
            className="w-full border rounded-md px-2 py-1.5 text-sm"
          >
            <option value="">
              Select Customer
            </option>

            {customers.map((customer) => (
              <option
                key={customer.code}
                value={customer.code}
              >
                {customer.code} -{" "}
                {customer.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* ADD PRODUCT */}

      <div className="border rounded-lg p-2.5 bg-gray-50 mb-3">

        <div className="flex items-center justify-between mb-2">

          <h3 className="text-sm font-bold text-gray-700">
            Add Product
          </h3>

          <span className="text-xs text-gray-500">
            Select → Qty → Rate → Add
          </span>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">

          {/* PRODUCT */}

          <div className="md:col-span-3">

            <label className="block text-xs font-medium mb-1">
              Product
            </label>

            <select
              value={selectedProductCode}
              onChange={handleProductChange}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            >
              <option value="">
                Select Product
              </option>

              {products.map((product) => (
                <option
                  key={product.code}
                  value={product.code}
                >
                  {product.code} -{" "}
                  {product.name}
                </option>
              ))}
            </select>

          </div>

          {/* QTY */}

          <div>

            <label className="block text-xs font-medium mb-1">
              Qty
            </label>

            <input
              type="number"
              value={qty}
              min={0}
              onChange={(e) =>
                setQty(
                  Number(e.target.value)
                )
              }
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />

          </div>

          {/* RATE */}

          <div>

            <label className="block text-xs font-medium mb-1">
              Rate
            </label>

            <input
              type="number"
              value={rate}
              min={0}
              onChange={(e) =>
                setRate(
                  Number(e.target.value)
                )
              }
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />

          </div>

          {/* GST */}

          <div>

            <label className="block text-xs font-medium mb-1">
              GST %
            </label>

            <input
              type="number"
              value={gst}
              readOnly
              className="w-full border rounded-md px-2 py-1.5 text-sm bg-gray-100"
            />

          </div>

        </div>

        <div className="flex justify-end mt-2">

          <button
            type="button"
            onClick={handleAddProduct}
            className="px-4 py-1.5 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
          >
            + Add Product
          </button>

        </div>

      </div>

      {/* PRODUCT LIST */}

      <div className="w-full overflow-hidden mb-3">

        <table className="w-full table-fixed border-collapse text-xs">

          <thead>

            <tr className="bg-blue-700 text-white">

              <th className="border p-1.5 w-8">
                #
              </th>

              <th className="border p-1.5 text-left">
                Product
              </th>

              <th className="border p-1.5 w-16">
                Qty
              </th>

              <th className="border p-1.5 w-20">
                Rate
              </th>

              <th className="border p-1.5 w-14">
                GST
              </th>

              <th className="border p-1.5 w-24">
                Amount
              </th>

              <th className="border p-1.5 w-24">
                Total
              </th>

              <th className="border p-1.5 w-20">
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {items.length === 0 ? (

              <tr>

                <td
                  colSpan={8}
                  className="border p-3 text-center text-gray-500"
                >
                  No products added
                </td>

              </tr>

            ) : (

              items.map((item, index) => (

                <tr key={item.productCode}>

                  <td className="border p-1.5 text-center">
                    {index + 1}
                  </td>

                  <td className="border p-1.5 break-words">
                    {item.productName}
                  </td>

                  <td className="border p-1.5 text-center">
                    {item.qty}
                  </td>

                  <td className="border p-1.5 text-right">
                    ₹{item.rate.toFixed(2)}
                  </td>

                  <td className="border p-1.5 text-center">
                    {item.gst}%
                  </td>

                  <td className="border p-1.5 text-right">
                    ₹{item.amount.toFixed(2)}
                  </td>

                  <td className="border p-1.5 text-right font-semibold">
                    ₹{item.grandTotal.toFixed(2)}
                  </td>

                  <td className="border p-1.5 text-center">

                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveProduct(
                          item.productCode
                        )
                      }
                      className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                    >
                      Remove
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* BOTTOM SECTION */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* PAYMENT / REMARKS */}

        <div className="border rounded-lg p-2.5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

            <div>

              <label className="block text-xs font-medium mb-1">
                Payment Mode
              </label>

              <select
                value={paymentMode}
                onChange={(e) =>
                  setPaymentMode(
                    e.target.value as Sales["paymentMode"]
                  )
                }
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              >

                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank">Bank</option>
                <option value="Credit">Credit</option>

              </select>

            </div>

            <div>

              <label className="block text-xs font-medium mb-1">
                Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as Sales["status"]
                  )
                }
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              >

                <option value="Completed">
                  Completed
                </option>

                <option value="Pending">
                  Pending
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>

              </select>

            </div>

          </div>

          <div className="mt-2">

            <label className="block text-xs font-medium mb-1">
              Remarks
            </label>

            <input
              type="text"
              value={remarks}
              onChange={(e) =>
                setRemarks(e.target.value)
              }
              className="w-full border rounded-md px-2 py-1.5 text-sm"
              placeholder="Enter Remarks..."
            />

          </div>

        </div>

        {/* TOTALS */}

        <div className="border rounded-lg overflow-hidden">

          <div className="flex justify-between px-3 py-1.5 border-b text-sm">
            <span>Taxable Amount</span>
            <strong>
              ₹{taxableAmount.toFixed(2)}
            </strong>
          </div>

          <div className="flex justify-between px-3 py-1.5 border-b text-sm">
            <span>GST Amount</span>
            <strong>
              ₹{gstAmount.toFixed(2)}
            </strong>
          </div>

          <div className="flex justify-between px-3 py-1.5 border-b text-sm">
            <span>CGST</span>
            <strong>
              ₹{cgst.toFixed(2)}
            </strong>
          </div>

          <div className="flex justify-between px-3 py-1.5 border-b text-sm">
            <span>SGST</span>
            <strong>
              ₹{sgst.toFixed(2)}
            </strong>
          </div>

          <div className="flex justify-between px-3 py-2 bg-green-100">

            <span className="font-bold">
              Grand Total
            </span>

            <strong className="text-green-700 text-lg">
              ₹{grandTotal.toFixed(2)}
            </strong>

          </div>

        </div>

      </div>

      {/* BUTTONS */}

      <div className="flex justify-end gap-2 mt-3">

        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-1.5 rounded-md bg-gray-500 text-white text-sm font-semibold hover:bg-gray-600"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-1.5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Save Sales
        </button>

      </div>

    </div>
  );
};

export default SalesForm;