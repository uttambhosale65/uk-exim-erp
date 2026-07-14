"use client";

import { Purchase } from "./PurchaseTypes";

type PurchaseTableProps = {
  purchases: Purchase[];
};

export default function PurchaseTable({
  purchases,
}: PurchaseTableProps) {
  return (
    <div style={{ marginTop: "30px" }}>
      <h2>Purchase List</h2>

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
            <th>Purchase No</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Product</th>
            <th>HSN</th>
            <th>Unit</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {purchases.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: "center" }}>
                No Purchase Records
              </td>
            </tr>
          ) : (
            purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{purchase.purchaseNo}</td>
                <td>{purchase.purchaseDate}</td>
                <td>{purchase.supplierName}</td>
                <td>{purchase.productName}</td>
                <td>{purchase.hsn}</td>
                <td>{purchase.unit}</td>
                <td>{purchase.qty}</td>
                <td>{purchase.rate}</td>
                <td>{purchase.amount}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}