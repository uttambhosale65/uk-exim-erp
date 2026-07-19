"use client";

type PageTitleProps = {
  title: string;
  subtitle?: string;
};

export default function PageTitle({
  title,
  subtitle,
}: PageTitleProps) {
  return (
    <div
      style={{
        marginBottom: "4px",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "18px",
          fontWeight: 700,
          color: "#1f2937",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          lineHeight: "22px",
        }}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          style={{
            margin: "2px 0 0 0",
            color: "#6b7280",
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: "18px",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}