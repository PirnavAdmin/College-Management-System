import React from "react";

function Table({ employees, onEdit, onDelete }) {
  return (
    <table
      cellPadding="10"
      style={{
        width: "100%",
        marginTop: "20px",
        borderCollapse: "collapse",
        color: "#1f2937",
        fontFamily: "inherit",
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              textAlign: "left",
              padding: "12px 10px",
              borderBottom: "2px solid #E5E7EB",
              background: "#f8fafc",
              color: "#1f2937",
            }}
          >
            ID
          </th>
          <th
            style={{
              textAlign: "left",
              padding: "12px 10px",
              borderBottom: "2px solid #E5E7EB",
              background: "#f8fafc",
              color: "#1f2937",
            }}
          >
            Name
          </th>
          <th
            style={{
              textAlign: "left",
              padding: "12px 10px",
              borderBottom: "2px solid #E5E7EB",
              background: "#f8fafc",
              color: "#1f2937",
            }}
          >
            Role
          </th>
          <th
            style={{
              textAlign: "left",
              padding: "12px 10px",
              borderBottom: "2px solid #E5E7EB",
              background: "#f8fafc",
              color: "#1f2937",
            }}
          >
            Department
          </th>
          <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "2px solid #E5E7EB", background: "#f8fafc", color: "#1f2937" }}>Email</th>
          <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "2px solid #E5E7EB", background: "#f8fafc", color: "#1f2937" }}>Salary</th>
          <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "2px solid #E5E7EB", background: "#f8fafc", color: "#1f2937" }}>Actions</th>
        </tr>
      </thead>

      <tbody>
        {employees.length ? employees.map((employee) => (
          <tr key={employee.id}>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #E5E7EB" }}>{employee.id}</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #E5E7EB" }}>{employee.name}</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #E5E7EB" }}>{employee.role}</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #E5E7EB" }}>{employee.department}</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #E5E7EB" }}>{employee.email}</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #E5E7EB" }}>${employee.salary.toLocaleString()}</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap" }}>
              <button type="button" onClick={() => onEdit(employee)} style={{ marginRight: "8px", border: "1px solid #2563EB", color: "#2563EB", background: "white", borderRadius: "4px", padding: "5px 8px", cursor: "pointer" }}>Edit</button>
              <button type="button" onClick={() => onDelete(employee.id)} style={{ border: "1px solid #DC2626", color: "#DC2626", background: "white", borderRadius: "4px", padding: "5px 8px", cursor: "pointer" }}>Delete</button>
            </td>
          </tr>
        )) : <tr><td colSpan="7" style={{ padding: "24px 10px", textAlign: "center", color: "#64748B" }}>No employees found.</td></tr>}
      </tbody>
    </table>
  );
}

export default Table;