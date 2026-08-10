import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./BoardManagementPage.css";

const o = data.options;
const MODULE_SLUG = "boards";

const unwrapList = (data) => {
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.data,
    data?.Data,
    data?.items,
    data?.Items,
    data?.result,
    data?.Result,
    data?.$values,
    data?.data?.items,
    data?.data?.Items,
    data?.data?.$values,
  ];
  return candidates.find(Array.isArray) || [];
};

const nameMap = (items, idKeys, nameKeys) => {
  const names = [];
  const map = {};
  (items || []).forEach((it) => {
    const id = idKeys.map((k) => it[k]).find((v) => v !== undefined);
    const name = nameKeys.map((k) => it[k]).find((v) => v !== undefined && v !== "");
    if (name) names.push(name);
    if (name && id !== undefined) map[name] = id;
  });
  return { names, map };
};

let cachedCountries = null;
let cachedStates = null;
let cachedPatterns = null;
let cachedGradings = null;

const mapRow = (r) => ({
  id: r.boardId ?? r.id,
  name: r.boardName ?? r.name,
  code: r.boardCode ?? r.code,
  country: r.countryName ?? r.country,
  state: r.stateName ?? r.state,
  structure: r.academicPatternName ?? r.structure ?? "",
  status: r.status === true || String(r.status).toLowerCase() === "active" ? "Active" : "Inactive",
  created: r.createdDate ? String(r.createdDate).split("T")[0] : r.created,
});

export const pageConfig = {
  title: "Board Management",
  subtitle: "Configure examination boards, academic patterns and grading rules.",
  breadcrumb: ["Academics"],
  addLabel: "Add Board",
  rows: data.boards,
  columns: [
    { key: "name", label: "Board Name", strong: true },
    { key: "code", label: "Board Code" },
    { key: "country", label: "Country" },
    { key: "state", label: "State" },
    { key: "structure", label: "Academic Structure" },
    { key: "status", label: "Status", badge: true },
    { key: "created", label: "Created Date" },
  ],
  fields: [
    { name: "name", label: "Board Name", required: true },
    { name: "code", label: "Board Code", required: true },
    { name: "description", label: "Description", type: "textarea", full: true },
    {
      name: "country",
      label: "Country",
      type: "select",
      required: true,
      loadOptions: () => apiClient.get(apiEndpoints.boards.countries),
      getOptions: (res) => {
        cachedCountries = nameMap(
          unwrapList(res.data),
          ["id", "countryId", "CountryId", "CountryID"],
          ["name", "countryName", "CountryName"],
        );
        return cachedCountries.names;
      },
    },
    {
      name: "state",
      label: "State",
      type: "select",
      options: [],
      required: true,
      dependsOn: "country",
      loadOptions: (values) => {
        const countryId = cachedCountries?.map[values.country];
        return countryId
          ? apiClient.get(apiEndpoints.boards.states(countryId))
          : Promise.resolve({ data: [] });
      },
      getOptions: (res) => {
        cachedStates = nameMap(
          unwrapList(res.data),
          ["stateId", "StateId", "id", "Id"],
          ["stateName", "StateName", "name", "Name"],
        );
        return cachedStates.names;
      },
    },
    {
      name: "pattern",
      label: "Academic Pattern",
      type: "select",
      required: true,
      loadOptions: () => apiClient.get(apiEndpoints.boards.academicPatterns),
      getOptions: (res) => {
        cachedPatterns = nameMap(
          unwrapList(res.data),
          ["academicPatternId", "AcademicPatternId", "id", "Id"],
          ["patternName", "PatternName", "name", "Name"],
        );
        return cachedPatterns.names;
      },
    },
    { name: "structure", label: "Academic Levels", type: "select", options: ["Intermediate", "10+2", "PUC", "Higher Secondary"], required: true },
    { name: "internal", label: "Internal Assessment", type: "checkbox", placeholder: "Enabled" },
    { name: "practical", label: "Practical Exams", type: "checkbox", placeholder: "Enabled" },
    { name: "boardExams", label: "Board Exams", type: "checkbox", placeholder: "Enabled" },
    { name: "passPercentage", label: "Pass Percentage", type: "number", required: true },
    {
      name: "grading",
      label: "Grading System",
      type: "select",
      required: true,
      loadOptions: () => apiClient.get(apiEndpoints.boards.gradingSystems),
      getOptions: (res) => {
        cachedGradings = nameMap(unwrapList(res.data), ["gradingSystemId", "id"], ["gradingSystemName", "name"]);
        return cachedGradings.names;
      },
    },
    { name: "rank", label: "Rank Calculation", type: "select", options: ["Total Marks", "Percentage", "Grade Points"] },
    { name: "status", label: "Status", type: "select", options: o.status, required: true },
  ],
  api: {
    fetchRows: async () => {
      const res = await apiClient.get(apiEndpoints.boards.getAll);
      return unwrapList(res.data).map(mapRow);
    },
    fetchRow: async (id) => {
      const res = await apiClient.get(apiEndpoints.boards.getById(id));
      return mapRow(res.data);
    },
    deleteRow: (id) => apiClient.delete(apiEndpoints.boards.delete(id)),
    saveRow: async (values, id) => {
      const countryId = cachedCountries?.map[values.country] ?? 0;
      const stateId = cachedStates?.map[values.state] ?? null;
      const patternId = cachedPatterns?.map[values.pattern] ?? 0;
      const gradingId = cachedGradings?.map[values.grading] ?? 0;
      const structureIds = { Intermediate: 1, "10+2": 2, PUC: 3, "Higher Secondary": 4 };
      const payload = {
        boardName: values.name,
        boardCode: values.code,
        description: values.description,
        countryId,
        stateId,
        academicPatternId: patternId,
        academicLevelIds: values.structure ? [structureIds[values.structure] ?? 0] : [],
        internalAssessment: !!values.internal,
        practicalExams: !!values.practical,
        boardExams: !!values.boardExams,
        passPercentage: Number(values.passPercentage) || 0,
        gradingSystemId: gradingId,
        rankCalculation: !!values.rank,
        status: values.status === "Active" || values.status === true,
      };
      if (id) return apiClient.put(apiEndpoints.boards.getById(id), payload);
      return apiClient.post(apiEndpoints.boards.create, payload);
    },
  },
};

export default function BoardManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
