"use client";

import React, { useMemo, useState } from "react";
import { Sales } from "./SalesTypes";

type SalesMasterProps = {
  sales: Sales[];
  onEdit: (sale: Sales) => void;
  onDelete: (id: string) => void;
};

const SalesMaster: React.FC<SalesMasterProps> = ({
  sales,
  onEdit,
  onDelete,
}) => {
  const [search, setSearch] = useState("");

  const filteredSales = useMemo(() => {
    if (!search.trim()) return sales;

    const keyword = search.toLowerCase();

    return sales.filter((sale) => {
      return (
        sale.salesNo.toLowerCase().includes(keyword) ||
        sale.invoiceNo.toLowerCase().includes(keyword) ||
        sale.customerCode.toLowerCase().includes(keyword) ||
        sale.customerName.toLowerCase().includes(keyword) ||
        sale.productCode.toLowerCase().includes(keyword) ||
        sale.productName.toLowerCase().includes(keyword)
      );
    });
  }, [sales, search]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mt-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <h2 className="text-2xl font-bold text-blue-700">
          Sales Master
        </h2>

        <input
          type="text"
          placeholder="Search Sales..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg p-2 w-full md:w-80"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="border p-2">Sales No</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Invoice</th>
              <th className="border p-2">Customer</th>
              <th className="border p-2">Product</th>
              <th className="border p-2 text-end">Qty</th>
              <th className="border p-2 text-end">Rate</th>
              <th className="border p-2 text-end">GST %</th>
              <th className="border p-2 text-end">Total</th>
              <th className="border p-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="border p-4 text-center text-gray-500"
                >
                  No Sales Records Found
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="border p-2">{sale.salesNo}</td>
                  <td className="border p-2">{sale.salesDate}</td>
                  <td className="border p-2">{sale.invoiceNo}</td>
                  <td className="border p-2">{sale.customerName}</td>
                  <td className="border p-2">{sale.productName}</td>
                  <td className="border p-2 text-end">{sale.qty}</td>
                  <td className="border p-2 text-end">
                    {sale.rate.toFixed(2)}
                  </td>
                  <td className="border p-2 text-end">
                    {sale.gst}%
                  </td>
                  <td className="border p-2 text-end font-semibold">
                    {sale.grandTotal.toFixed(2)}
                  </td>

                  <td className="border p-2">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(sale)}
                        className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this sales record?"
                            )
                          ) {
                            onDelete(sale.id);
                          }
                        }}
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
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
    </div>
  );
};