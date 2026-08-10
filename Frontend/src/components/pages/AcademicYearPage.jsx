import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./AcademicYearPage.css";

const o = data.options;
const MODULE_SLUG = "academic-years";

export const pageConfig = {
    title: "Academic Year",
    subtitle: "Define academic sessions and admission windows.",
    breadcrumb: ["Academics"],
    addLabel: "Add Academic Year",
    rows: data.academicYears,
    columns: [
      { key: "name", label: "Academic Year", strong: true },
      { key: "start", label: "Start Date" },
      { key: "end", label: "End Date" },
      { key: "admissionStart", label: "Admission Start" },
      { key: "admissionEnd", label: "Admission End" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "name", label: "Academic Year Name", required: true, placeholder: "2025-2026" },
      { name: "start", label: "Start Date", type: "date", required: true },
      { name: "end", label: "End Date", type: "date", required: true },
      { name: "admissionStart", label: "Admission Start Date", type: "date", required: true },
      { name: "admissionEnd", label: "Admission End Date", type: "date", required: true },
      { name: "status", label: "Active", type: "select", options: o.status, required: true },
    ],
    api: {
      getAll: () => apiClient.get(apiEndpoints.academicYears.getAll),
      delete: (id) => apiClient.delete(apiEndpoints.academicYears.delete(id)),
      mapRow: (r) => ({
        id: r.id ?? r.academicYearId,
        name: r.name ?? r.academicYearName,
        start: r.startDate ?? r.start,
        end: r.endDate ?? r.end,
        admissionStart: r.admissionStartDate ?? r.admissionStart,
        admissionEnd: r.admissionEndDate ?? r.admissionEnd,
        status: r.isActive === false ? "Inactive" : "Active",
      }),
    },
  };

export default function AcademicYearPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}