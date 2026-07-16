"use client";

import { Sales } from "./SalesTypes";

type SalesTableProps = {
  sales: Sales[];
};

export default function SalesTable({
  sales,
}: SalesTableProps) {
  return (
    <div style={{ marginTop: "30px" }}>
      <h2>Sales List</h2>

      <table
        border={1}
        cellPadding={8}
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>Sales No</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Product</th>
            <th>HSN</th>
            <th>Unit</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                style={{ textAlign: "center" }}
              >
                No Sales Records
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.id}>
                <td>{sale.salesNo}</td>
                <td>{sale.salesDate}</td>
                <td>{sale.customerName}</td>
                <td>{sale.productName}</td>
                <td>{sale.hsn}</td>
                <td>{sale.unit}</td>
                <td>{sale.qty}</td>
                <td>{sale.rate}</td>
                <td>{sale.amount}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}