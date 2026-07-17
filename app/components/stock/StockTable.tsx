"use client";

import { Stock } from "./StockTypes";

type StockTableProps = {
  stock: Stock[];
  onEdit: (item: Stock) => void;
};

export default function StockTable({
  stock,
  onEdit,
}: StockTableProps) {
  return (
    <div>
      <h2>Stock List</h2>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Product Code</th>
            <th>Product Name</th>
            <th>Unit</th>
            <th>Opening</th>
            <th>Purchase</th>
            <th>Sales</th>
            <th>Current Stock</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {stock.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center" }}>
                No Stock Records
              </td>
            </tr>
          ) : (
            stock.map((item) => (
              <tr key={item.id}>
                <td>{item.productCode}</td>
                <td>{item.productName}</td>
                <td>{item.unit}</td>
                <td>{item.openingStock}</td>
                <td>{item.purchaseQty}</td>
                <td>{item.salesQty}</td>
                <td>{item.currentStock}</td>

                <td>
                  <button onClick={() => onEdit(item)}>
                    Edit
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