import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./FeeManagementPage.css";

const o = data.options;
const MODULE_SLUG = "fee-structure";

export const pageConfig = {
    title: "Fee Management",
    subtitle: "Fee structures and day-to-day fee collection.",
    breadcrumb: ["Administration"],
    addLabel: "Add Fee Structure",
    rows: data.fees,
    columns: [
      { key: "board", label: "Board", strong: true },
      { key: "year", label: "Academic Year" },
      { key: "group", label: "Group" },
      { key: "type", label: "Fee Type" },
      { key: "amount", label: "Amount", render: (r) => `₹${Number(r.amount).toLocaleString("en-IN")}` },
      { key: "due", label: "Due Date" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "board", label: "Board", type: "select", options: o.board, required: true },
      { name: "year", label: "Academic Year", type: "select", options: o.year, required: true },
      { name: "group", label: "Group", type: "select", options: o.group, required: true },
      { name: "type", label: "Fee Type", type: "select", options: o.feeType, required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "due", label: "Due Date", type: "date", required: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
    secondary: {
      title: "Fee Collection",
      addLabel: "Collect Fee",
      rows: data.feeCollections,
      columns: [
        { key: "receipt", label: "Receipt Number", strong: true },
        { key: "student", label: "Student" },
        { key: "date", label: "Payment Date" },
        { key: "amount", label: "Amount", render: (r) => `₹${Number(r.amount).toLocaleString("en-IN")}` },
        { key: "discount", label: "Discount" },
        { key: "fine", label: "Fine" },
        { key: "mode", label: "Payment Mode" },
        { key: "txn", label: "Transaction No." },
        { key: "status", label: "Status", badge: true },
      ],
      fields: [
        { name: "student", label: "Student", type: "select", options: o.student, required: true },
        { name: "receipt", label: "Receipt Number", required: true },
        { name: "date", label: "Payment Date", type: "date", required: true },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "discount", label: "Discount", type: "number" },
        { name: "fine", label: "Fine", type: "number" },
        { name: "mode", label: "Payment Mode", type: "select", options: o.paymentMode, required: true },
        { name: "txn", label: "Transaction Number" },
        { name: "status", label: "Status", type: "select", options: o.status, required: true },
      ],
    },
  };

export default function FeeManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
