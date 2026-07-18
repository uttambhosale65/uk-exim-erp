"use client";

import { Sales } from "./SalesTypes";

type SalesTableProps = {
  sales: Sales[];
  onEdit: (sale: Sales) => void;
  onDelete: (id: string) => void;
};

export default function SalesTable({
  sales,
  onEdit,
  onDelete,
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
            <th>GST %</th>
            <th>Grand Total</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td
                colSpan={12}
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
                <td>{sale.gst}</td>
                <td>{sale.grandTotal}</td>

                <td>
                  <button
                    onClick={() => onEdit(sale)}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onDelete(sale.id)}
                    style={{
                      marginLeft: "8px",
                      backgroundColor: "red",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}