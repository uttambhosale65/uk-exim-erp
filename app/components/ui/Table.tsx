"use client";

import { ReactNode } from "react";

type TableProps = {
  headers: string[];
  children: ReactNode;
};

export default function Table({
  headers,
  children,
}: TableProps) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#ffffff",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#0f766e",
              color: "#ffffff",
            }}
          >
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  padding: "12px",
                  textAlign: "left",
                  borderBottom: "1px solid #d1d5db",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>{children}</tbody>
      </table>
    </div>
  );
}