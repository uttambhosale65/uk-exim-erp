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
        marginBottom: "25px",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "30px",
          fontWeight: "bold",
          color: "#0f766e",
        }}
      >
        {title}
      </h1>

      {subtitle && (
        <p
          style={{
            marginTop: "8px",
            color: "#6b7280",
            fontSize: "15px",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}