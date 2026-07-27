import React from "react";

function Card({ title, value, color }) {
  return (
    <div
      style={{
        backgroundColor: color,
        color: "#fff",
        width: "150px",
        height: "65px",
        borderRadius: "10px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
      }}
    >
      <h4
        style={{
          margin: 0,
          fontWeight: "500",
          fontSize: "15px",
        }}
      >
        {title}
      </h4>

      <h2
        style={{
          marginTop: "10px",
          marginBottom: 0,
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        {value}
      </h2>
    </div>
  );
}

export default Card;