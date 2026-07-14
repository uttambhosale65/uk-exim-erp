"use client";

import { Purchase } from "./PurchaseTypes";

type PurchaseTableProps = {
  purchases: Purchase[];
};

export default function PurchaseTable({
  purchases,
}: PurchaseTableProps) {
  return (
    <div>
      <h2>Purchase List</h2>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Purchase No</th>
            <th>Supplier</th>
            <th>Invoice</th>
            <th>Date</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td>{purchase.purchaseNo}</td>
              <td>{purchase.supplierName}</td>
              <td>{purchase.invoiceNo}</td>
              <td>{purchase.purchaseDate}</td>
              <td>{purchase.productName}</td>
              <td>{purchase.qty}</td>
              <td>{purchase.rate}</td>
              <td>{purchase.amount}</td>
            </tr>
          ))}

          {purchases.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center" }}>
                No Purchase Records
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}