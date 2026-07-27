import React from "react";

function Header() {
  return (
    <div
      style={{
        height: "120px",
        width: "100%",
        background: "linear-gradient(135deg, #3B82F6, #4F7CF3)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ margin: 0 }}>School Management Dashboard</h2>

      <h4 style={{ margin: 0 }}>Welcome, Admin</h4>
    </div>
  );
}

export default Header;