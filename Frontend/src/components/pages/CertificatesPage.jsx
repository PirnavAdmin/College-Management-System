import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./CertificatesPage.css";

const o = data.options;
const MODULE_SLUG = "certificates";

export const pageConfig = {
    title: "Certificate Management",
    subtitle: "Issue and track student certificates.",
    breadcrumb: ["Administration"],
    addLabel: "Issue Certificate",
    rows: data.certificates,
    columns: [
      { key: "number", label: "Certificate Number", strong: true },
      { key: "student", label: "Student" },
      { key: "type", label: "Certificate Type" },
      { key: "purpose", label: "Purpose" },
      { key: "issue", label: "Issue Date" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "student", label: "Student", type: "select", options: o.student, required: true },
      { name: "type", label: "Certificate Type", type: "select", options: o.certificateType, required: true },
      { name: "purpose", label: "Purpose", required: true },
      { name: "issue", label: "Issue Date", type: "date", required: true },
      { name: "remarks", label: "Remarks", type: "textarea", full: true },
      { name: "status", label: "Status", type: "select", options: o.status, required: true },
    ],
  };

export default function CertificatesPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
