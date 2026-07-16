"use client";

import { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export default function Card({
  title,
  children,
}: CardProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
      }}
    >
      {title && (
        <h2
          style={{
            margin: "0 0 20px 0",
            color: "#1f2937",
            fontSize: "20px",
            fontWeight: 600,
          }}
        >
          {title}
        </h2>
      )}

      {children}
    </div>
  );
}