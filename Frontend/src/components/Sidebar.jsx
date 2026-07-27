import React from "react";

function Sidebar() {
  const menus = [
    "Dashboard",
    "Students",
    "Teachers",
    "Attendance",
    "Exams",
    "Settings",
  ];

  return (
    <div
      style={{
        width: "220px",
        background: "linear-gradient(135deg, #1E293B, #334155)",
        color: "white",
        minHeight: "100vh",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "34px",
          margin: 0,
          fontSize: "1.1rem",
        }}
      >
        SMS
      </h2>

      {menus.map((menu) => (
        <div
          key={menu}
          style={{
            padding: "12px 20px",
            marginBottom: "8px",
            borderRadius: "8px",
            cursor: "pointer",
            background: "transparent",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#334155")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          {menu}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;