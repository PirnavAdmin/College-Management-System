import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import ListPage from "@/components/pages/ListPage.jsx";
import "./FeeManagementPage.css";

const MODULE_SLUG = "fee-structure";
const FEE_TYPES = ["Tuition Fee", "Laboratory Fee", "Hostel Fee", "Transport Fee", "Exam Fee"];
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Net Banking", "Cheque"];
const HISTORY_REQUEST_TIMEOUT = 8000;
const recentCollections = [];

const getDataNode = (payload) => payload?.data ?? payload?.Data ?? payload;

const getCollection = (payload) => {
  const data = getDataNode(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
};

const isSchemaPlaceholder = (value) => {
  if (typeof value !== "string") return false;
  return ["string", "number", "integer", "object", "array", "boolean"].includes(value.trim().toLowerCase());
};

const readText = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "" || isSchemaPlaceholder(value)) return "";
  if (typeof value === "object") return "";
  return String(value);
};

const readNumber = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "" || isSchemaPlaceholder(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const getFeeTypeName = (item) => {
  const directName = readText(
    item,
    "feeTypeName",
    "FeeTypeName",
    "feeName",
    "FeeName",
    "name",
    "Name",
    "displayName",
    "DisplayName",
    "label",
    "Label",
  );
  if (directName) return directName;

  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  if (typeof feeType === "string") return isSchemaPlaceholder(feeType) ? "" : feeType;
  if (!feeType || typeof feeType !== "object") return "";

  return readText(
    feeType,
    "feeTypeName",
    "FeeTypeName",
    "name",
    "Name",
    "displayName",
    "DisplayName",
    "label",
    "Label",
    "title",
    "Title",
  );
};

const getNestedRows = (item, ...keys) => {
  const value = read(item, ...keys);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.Data)) return value.Data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.Items)) return value.Items;
  return [];
};

const expandFeeStructureItems = (item) => {
  const components = getNestedRows(
    item,
    "feeComponents",
    "FeeComponents",
    "components",
    "Components",
    "feeDetails",
    "FeeDetails",
    "details",
    "Details",
  );
  if (!components.length) return [item];

  return components.map((component) => {
    const structureId = read(
      component,
      "feeStructureId",
      "FeeStructureId",
      "structureId",
      "StructureId",
      "feeComponentId",
      "FeeComponentId",
      "id",
      "Id",
    );
    return {
      ...item,
      ...component,
      ...(structureId !== undefined && structureId !== null && structureId !== "" ? { feeStructureId: structureId } : {}),
    };
  });
};

const makeLookup = (options) => options.reduce((lookup, option) => {
  lookup[String(option.value)] = option.label;
  return lookup;
}, {});

const toOption = (item, idKeys, labelKeys) => {
  const value = read(item, ...idKeys);
  const label = read(item, ...labelKeys) || value;
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label) };
};

const loadMasterOptions = async () => {
  const [boardsResult, yearsResult, groupsResult] = await Promise.allSettled([
    apiClient.get(apiEndpoints.boards.list),
    apiClient.get(apiEndpoints.academicYears.list),
    apiClient.get(apiEndpoints.groups.getAll),
  ]);

  const boards = boardsResult.status === "fulfilled"
    ? getCollection(boardsResult.value.data)
      .map((item) => toOption(item, ["boardId", "BoardId", "id", "Id"], ["boardCode", "BoardCode", "boardName", "BoardName", "name", "Name"]))
      .filter(Boolean)
    : [];

  const years = yearsResult.status === "fulfilled"
    ? getCollection(yearsResult.value.data)
      .map((item) => toOption(item, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name"]))
      .filter(Boolean)
    : [];

  const groups = groupsResult.status === "fulfilled"
    ? getCollection(groupsResult.value.data)
      .map((item) => toOption(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]))
      .filter(Boolean)
    : [];

  return {
    boards,
    years,
    groups,
    boardLookup: makeLookup(boards),
    yearLookup: makeLookup(years),
    groupLookup: makeLookup(groups),
  };
};

const formatDate = (value) => {
  if (!value || isSchemaPlaceholder(value)) return "";
  return String(value).slice(0, 10);
};

const formatAmount = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const amount = Number(value);
  return Number.isFinite(amount) ? `\u20b9${amount.toLocaleString("en-IN")}` : "-";
};

const normalizeStructure = (item, lookups = {}) => {
  const id = read(item, "feeStructureId", "FeeStructureId", "structureId", "StructureId", "id", "Id");
  const boardId = read(item, "boardId", "BoardId");
  const academicYearId = read(item, "academicYearId", "AcademicYearId", "yearId", "YearId");
  const groupId = read(item, "groupId", "GroupId");

  return {
    id,
    boardId: boardId ? String(boardId) : "",
    academicYearId: academicYearId ? String(academicYearId) : "",
    groupId: groupId ? String(groupId) : "",
    board: read(item, "boardName", "BoardName", "board", "Board") || lookups.boardLookup?.[String(boardId)] || boardId || "-",
    year: read(item, "academicYearName", "AcademicYearName", "year", "Year") || lookups.yearLookup?.[String(academicYearId)] || academicYearId || "-",
    group: read(item, "groupName", "GroupName", "group", "Group") || lookups.groupLookup?.[String(groupId)] || groupId || "-",
    type: getFeeTypeName(item) || "-",
    amount: readNumber(item, "amount", "Amount", "feeAmount", "FeeAmount", "totalAmount", "TotalAmount"),
    due: formatDate(read(item, "dueDate", "DueDate", "due", "Due")),
    isActive: read(item, "isActive", "IsActive") ?? true,
  };
};

const normalizeStructureForm = (item) => {
  const row = normalizeStructure(item);
  return {
    board: row.boardId,
    year: row.academicYearId,
    group: row.groupId,
    type: row.type === "-" ? "" : row.type,
    amount: row.amount,
    due: row.due,
  };
};

const normalizeCollection = (item) => ({
  id: read(item, "feeCollectionId", "FeeCollectionId", "paymentId", "PaymentId", "receiptId", "ReceiptId", "id", "Id"),
  receipt: read(item, "receiptNumber", "ReceiptNumber", "receiptNo", "ReceiptNo", "receiptId", "ReceiptId", "receipt", "Receipt") || "-",
  student: read(item, "studentName", "StudentName", "student", "Student", "studentId", "StudentId") || "-",
  date: formatDate(read(item, "paymentDate", "PaymentDate", "date", "Date", "createdAt", "CreatedAt")),
  amount: read(item, "amount", "Amount") ?? 0,
  discount: read(item, "discount", "Discount", "discountAmount", "DiscountAmount") ?? 0,
  fine: read(item, "fine", "Fine", "fineAmount", "FineAmount") ?? 0,
  mode: read(item, "paymentMode", "PaymentMode", "mode", "Mode", "feeType", "FeeType") || "-",
  txn: read(item, "transactionNumber", "TransactionNumber", "txn", "Txn") || "-",
});

const uniqueCollections = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [row.id, row.receipt, row.student, row.date, row.amount, row.mode].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeStudentOption = (item) => {
  const value = read(item, "studentId", "StudentId", "id", "Id");
  const name = read(item, "studentName", "StudentName", "name", "Name");
  const admissionNo = read(item, "admissionNo", "AdmissionNo");
  const rollNo = read(item, "rollNo", "RollNo");
  if (value === undefined || value === null || value === "") return null;

  const meta = [admissionNo, rollNo].filter(Boolean).join(" / ");
  return {
    value: String(value),
    label: meta ? `ID ${value} - ${name || value} (${meta})` : `ID ${value} - ${name || value}`,
  };
};

const getStudentOptions = (response) => getCollection(response.data)
  .map(normalizeStudentOption)
  .filter(Boolean);

const loadStudentOptions = async () => {
  const response = await apiClient.get(apiEndpoints.students.getAll);
  return getStudentOptions(response);
};

const normalizeHistoryCollection = (item, student) => {
  const row = normalizeCollection({
    ...item,
    studentId: student.value,
    studentName: student.label,
  });
  return {
    ...row,
    id: row.id && row.id !== "-" ? row.id : `${student.value}-${row.receipt}-${row.date}-${row.amount}`,
  };
};

const loadCollectionRows = async () => {
  const students = await loadStudentOptions();
  const historyResults = await Promise.allSettled(students.map((student) =>
    apiClient.get(apiEndpoints.fee.getHistory(student.value), { timeout: HISTORY_REQUEST_TIMEOUT })
      .then((response) => getCollection(response.data).map((item) => normalizeHistoryCollection(item, student))),
  ));
  const historyRows = historyResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  return uniqueCollections([...recentCollections, ...historyRows]);
};

const structurePayload = (values, includeStatus = false) => ({
  boardId: Number(values.board),
  academicYearId: Number(values.year),
  groupId: Number(values.group),
  feeType: values.type,
  amount: Number(values.amount),
  dueDate: values.due,
  ...(includeStatus ? { isActive: true } : {}),
});

const collectionPayload = (values) => ({
  studentId: Number(values.student),
  feeStructureId: Number(values.feeStructure),
  amount: Number(values.amount),
  paymentMode: values.mode,
  discount: Number(values.discount || 0),
  fine: Number(values.fine || 0),
  transactionNumber: values.txn || "",
});

const feeStructureApi = {
  fetchRows: async () => {
    const master = await loadMasterOptions();
    const response = await apiClient.get(apiEndpoints.fee.getStructures);
    return getCollection(response.data)
      .flatMap(expandFeeStructureItems)
      .map((item) => normalizeStructure(item, master))
      .filter((row) => row.id);
  },
  fetchRow: async (id) => {
    const response = await apiClient.get(apiEndpoints.fee.getStructures);
    const item = getCollection(response.data).flatMap(expandFeeStructureItems).find((row) => {
      const rowId = read(row, "feeStructureId", "FeeStructureId", "structureId", "StructureId", "id", "Id");
      return String(rowId) === String(id);
    });
    return item ? normalizeStructureForm(item) : {};
  },
  saveRow: (values, id) => {
    const payload = structurePayload(values, Boolean(id));
    if (id) return apiClient.put(apiEndpoints.fee.updateStructure(id), payload);
    return apiClient.post(apiEndpoints.fee.createStructure, payload);
  },
  loadFields: async (fields) => {
    const master = await loadMasterOptions();
    return fields.map((field) => {
      if (field.name === "board") return { ...field, options: master.boards };
      if (field.name === "year") return { ...field, options: master.years };
      if (field.name === "group") return { ...field, options: master.groups };
      return field;
    });
  },
};

const feeCollectionApi = {
  fetchRows: loadCollectionRows,
  saveRow: async (values, id) => {
    if (id) {
      return apiClient.put(apiEndpoints.fee.updatePayment(id), {
        amount: Number(values.amount),
        paymentMode: values.mode,
      });
    }
    const response = await apiClient.post(apiEndpoints.fee.collect, collectionPayload(values));
    const saved = normalizeCollection({
      ...response.data,
      studentId: values.student,
      studentName: values.student,
      amount: values.amount,
      discount: values.discount,
      fine: values.fine,
      paymentMode: values.mode,
      transactionNumber: values.txn,
      paymentDate: new Date().toISOString(),
    });
    recentCollections.unshift({
      ...saved,
      id: saved.id && saved.id !== "-" ? saved.id : `saved-${Date.now()}`,
    });
    return response;
  },
  deleteRow: (id) => apiClient.delete(apiEndpoints.fee.deletePayment(id)),
  loadFields: async (fields) => {
    const [studentsResult, structuresResult] = await Promise.allSettled([
      loadStudentOptions(),
      apiClient.get(apiEndpoints.fee.getStructures),
    ]);

    const students = studentsResult.status === "fulfilled" ? studentsResult.value : [];
    const structures = structuresResult.status === "fulfilled"
      ? getCollection(structuresResult.value.data)
        .flatMap(expandFeeStructureItems)
        .map((item) => {
          const row = normalizeStructure(item);
          return row.id ? { value: String(row.id), label: `${row.type} - ${row.group} - ${formatAmount(row.amount)}` } : null;
        })
        .filter(Boolean)
      : [];

    return fields.map((field) => {
      if (field.name === "student") return { ...field, options: students };
      if (field.name === "feeStructure") return { ...field, options: structures };
      return field;
    });
  },
};

export const pageConfig = {
  title: "Fee Management",
  subtitle: "Fee structures and day-to-day fee collection.",
  breadcrumb: ["Administration"],
  addLabel: "Add Fee Structure",
  rows: [],
  api: feeStructureApi,
  columns: [
    { key: "board", label: "Board", strong: true },
    { key: "year", label: "Academic Year" },
    { key: "group", label: "Group" },
    { key: "type", label: "Fee Type" },
    { key: "amount", label: "Amount", render: (r) => formatAmount(r.amount) },
    { key: "due", label: "Due Date" },
  ],
  fields: [
    { name: "board", label: "Board", type: "select", options: [], required: true },
    { name: "year", label: "Academic Year", type: "select", options: [], required: true },
    { name: "group", label: "Group", type: "select", options: [], required: true },
    { name: "type", label: "Fee Type", type: "select", options: FEE_TYPES, required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "due", label: "Due Date", type: "date", required: true },
  ],
  secondary: {
    title: "Fee Collection",
    addLabel: "Collect Fee",
    rows: [],
    api: feeCollectionApi,
    columns: [
      { key: "receipt", label: "Receipt Number", strong: true },
      { key: "student", label: "Student" },
      { key: "date", label: "Payment Date" },
      { key: "amount", label: "Amount", render: (r) => formatAmount(r.amount) },
      { key: "discount", label: "Discount" },
      { key: "fine", label: "Fine" },
      { key: "mode", label: "Payment Mode" },
      { key: "txn", label: "Transaction No." },
    ],
    fields: [
      {
        name: "student",
        label: "Student",
        type: "select",
        options: [],
        required: true,
        loadOptions: () => apiClient.get(apiEndpoints.students.getAll),
        getOptions: getStudentOptions,
      },
      { name: "feeStructure", label: "Fee Structure", type: "select", options: [], required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "discount", label: "Discount", type: "number" },
      { name: "fine", label: "Fine", type: "number" },
      { name: "mode", label: "Payment Mode", type: "select", options: PAYMENT_MODES, required: true },
      { name: "txn", label: "Transaction Number" },
    ],
  },
};

export default function FeeManagementPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}
