export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        background: "#f5f5f5",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          background: "#14532d",
          color: "white",
          padding: "20px",
        }}
      >
        <h2>🌿 UK EXIM ERP</h2>
        <hr />

        <p>🏠 Dashboard</p>
        <p>📦 Stock</p>
        <p>🛒 Purchase</p>
        <p>💰 Sales</p>
        <p>👥 Customers</p>
        <p>🚚 Suppliers</p>
        <p>📊 Reports</p>
        <p>⚙️ Settings</p>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "30px" }}>
        <h1 style={{ color: "#14532d" }}>
          UK EXIM ENTERPRISES ERP
        </h1>

        <p>Welcome, Uttam Bhosale 👋</p>

        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            marginTop: "30px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              width: "220px",
              boxShadow: "0 2px 8px #ccc",
            }}
          >
            <h3>📦 Products</h3>
            <h2>5</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              width: "220px",
              boxShadow: "0 2px 8px #ccc",
            }}
          >
            <h3>👥 Customers</h3>
            <h2>0</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              width: "220px",
              boxShadow: "0 2px 8px #ccc",
            }}
          >
            <h3>💰 Sales</h3>
            <h2>₹0</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              width: "220px",
              boxShadow: "0 2px 8px #ccc",
            }}
          >
            <h3>📦 Stock</h3>
            <h2>Available</h2>
          </div>
        </div>
      </div>
    </div>
  );
}