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
        border: "1px solid #dbe3ea",
        borderRadius: "6px",
        padding: "10px",
        marginBottom: "10px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#1f2937",
            marginBottom: "6px",
            paddingBottom: "6px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          {title}
        </div>
      )}

      {children}
    </div>
  );
}