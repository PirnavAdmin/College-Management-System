import React from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Card from "./components/Card";
import Table from "./components/Table";
import Footer from "./components/Footer";
import { useState } from "react";

function App() {
  const initialEmployees = [
    {
      id: 1,
      name: "Rahul Sharma",
      role: "Frontend Developer",
      department: "Engineering",
      email: "rahul.sharma@company.com",
      salary: 72000,
    },
    {
      id: 2,
      name: "Priya Menon",
      role: "Product Designer",
      department: "Design",
      email: "priya.menon@company.com",
      salary: 68000,
    },
    {
      id: 3,
      name: "Arjun Rao",
      role: "Project Manager",
      department: "Operations",
      email: "arjun.rao@company.com",
      salary: 79000,
    },
  ];

  const emptyForm = { name: "", role: "", department: "", email: "", salary: "" };
  const [employees, setEmployees] = useState(initialEmployees);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [sortBy, setSortBy] = useState("name");

  const departments = ["All", ...new Set(employees.map((employee) => employee.department))];
  const visibleEmployees = employees
    .filter((employee) => {
      const searchable = `${employee.name} ${employee.role} ${employee.email}`.toLowerCase();
      return searchable.includes(search.toLowerCase()) &&
        (department === "All" || employee.department === department);
    })
    .sort((first, second) => String(first[sortBy]).localeCompare(String(second[sortBy]), undefined, { numeric: true }));

  const submitEmployee = (event) => {
    event.preventDefault();
    if (!form.name || !form.role || !form.department || !form.email || !form.salary) return;

    if (editingId) {
      setEmployees((current) => current.map((employee) =>
        employee.id === editingId ? { ...employee, ...form, salary: Number(form.salary) } : employee,
      ));
    } else {
      setEmployees((current) => [
        ...current,
        { ...form, id: Math.max(0, ...current.map((employee) => employee.id)) + 1, salary: Number(form.salary) },
      ]);
    }
    setForm(emptyForm);
    setEditingId(null);
  };

  const editEmployee = (employee) => {
    setEditingId(employee.id);
    setForm({ ...employee, salary: String(employee.salary) });
  };

  const deleteEmployee = (id) => {
    setEmployees((current) => current.filter((employee) => employee.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
  };

  const cards = [
    { title: "Employees", value: employees.length, color: "#2563EB" },
    { title: "Departments", value: departments.length - 1, color: "#0F766E" },
    { title: "Avg. Salary", value: employees.length ? `$${Math.round(employees.reduce((sum, employee) => sum + employee.salary, 0) / employees.length).toLocaleString()}` : "$0", color: "#D97706" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#F5F7FB",
      }}
    >
      <Header />

      <div style={{ display: "flex", flex: 1, gap: "18px", padding: "0" }}>
        <Sidebar />

        <div style={{ flex: 1, padding: "20px 24px 24px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "14px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            {cards.map((card) => (
              <Card
                key={card.title}
                title={card.title}
                value={card.value}
                color={card.color}
              />
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1f2937" }}>Employee Directory</h3>
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} style={{ background: "#2563EB", color: "white", border: 0, borderRadius: "6px", padding: "10px 14px", cursor: "pointer" }}>
              {editingId ? "Add employee" : "New employee"}
            </button>
          </div>

          <form onSubmit={submitEmployee} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", padding: "16px", background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)", marginBottom: "18px" }}>
            {[["name", "Name"], ["role", "Role"], ["department", "Department"], ["email", "Email"], ["salary", "Salary"]].map(([field, label]) => (
              <label key={field} style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.78rem", color: "#475569" }}>
                {label}
                <input required value={form[field]} type={field === "salary" ? "number" : field === "email" ? "email" : "text"} onChange={(event) => setForm({ ...form, [field]: event.target.value })} placeholder={label} style={{ border: "1px solid #CBD5E1", borderRadius: "5px", padding: "9px", font: "inherit" }} />
              </label>
            ))}
            <button type="submit" style={{ alignSelf: "end", background: "#0F766E", color: "white", border: 0, borderRadius: "5px", padding: "10px", cursor: "pointer" }}>{editingId ? "Update" : "Add"}</button>
          </form>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees..." aria-label="Search employees" style={{ flex: "1 1 220px", border: "1px solid #CBD5E1", borderRadius: "5px", padding: "10px", font: "inherit" }} />
            <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department" style={{ border: "1px solid #CBD5E1", borderRadius: "5px", padding: "10px", font: "inherit" }}>
              {departments.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort employees" style={{ border: "1px solid #CBD5E1", borderRadius: "5px", padding: "10px", font: "inherit" }}>
              <option value="name">Sort: Name</option>
              <option value="role">Sort: Role</option>
              <option value="salary">Sort: Salary</option>
            </select>
          </div>

          <Table employees={visibleEmployees} onEdit={editEmployee} onDelete={deleteEmployee} />
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default App;