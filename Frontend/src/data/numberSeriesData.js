const NUMBER_SERIES_STORAGE_KEY = "cms_number_series_settings";

export const initialNumberSeries = [
  {
    id: "series-1",
    key: "teaching-staff",
    name: "Teaching Staff Employee ID",
    module: "Staff Management",
    entity: "Teaching Staff",
    prefix: "PCT",
    suffix: "",
    startingNumber: 1,
    currentNumber: 17,
    paddingWidth: 3,
    resetFrequency: "Never",
    description: "Automatic Employee ID series for Teaching Staff.",
    active: true,
    createdOn: "2026-01-10",
  },
  {
    id: "series-2",
    key: "non-teaching-staff",
    name: "Non-Teaching Staff Employee ID",
    module: "Staff Management",
    entity: "Non-Teaching Staff",
    prefix: "NT",
    suffix: "",
    startingNumber: 1,
    currentNumber: 10,
    paddingWidth: 3,
    resetFrequency: "Never",
    description: "Automatic Employee ID series for Non-Teaching Staff.",
    active: true,
    createdOn: "2026-01-10",
  },
  {
    id: "series-3",
    key: "student-admission",
    name: "Student Admission Number",
    module: "Student Admission",
    entity: "Student",
    prefix: "ADM{YYYY}",
    suffix: "",
    startingNumber: 1,
    currentNumber: 100,
    paddingWidth: 4,
    resetFrequency: "Academic Year",
    description: "Automatic Admission Number format for new student enrollments.",
    active: true,
    createdOn: "2026-01-10",
  },
  {
    id: "series-4",
    key: "student-roll",
    name: "Student Roll Number",
    module: "Student Management",
    entity: "Student",
    prefix: "ROLL{YY}",
    suffix: "",
    startingNumber: 1,
    currentNumber: 50,
    paddingWidth: 3,
    resetFrequency: "Academic Year",
    description: "Automatic Roll Number format for allocated students.",
    active: true,
    createdOn: "2026-01-10",
  },
];

export function readNumberSeriesSettings() {
  try {
    const raw = sessionStorage.getItem(NUMBER_SERIES_STORAGE_KEY) || localStorage.getItem(NUMBER_SERIES_STORAGE_KEY);
    if (!raw) return initialNumberSeries;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialNumberSeries;
  } catch {
    return initialNumberSeries;
  }
}

export function writeNumberSeriesSettings(list) {
  try {
    const json = JSON.stringify(list);
    sessionStorage.setItem(NUMBER_SERIES_STORAGE_KEY, json);
    localStorage.setItem(NUMBER_SERIES_STORAGE_KEY, json);
  } catch (err) {
    console.error("Failed to save number series settings", err);
  }
}

export function formatSeriesNumber(series, sequenceNum = null, customTokens = {}) {
  if (!series) return "—";
  const num = sequenceNum !== null ? sequenceNum : (Number(series.currentNumber || 0) + 1);
  const padded = String(num).padStart(Number(series.paddingWidth || 3), "0");

  const year = new Date().getFullYear();
  const shortYear = String(year).slice(-2);

  let result = (series.prefix || "") + padded + (series.suffix || "");

  result = result.replace(/{YYYY}/g, customTokens.YYYY || String(year));
  result = result.replace(/{YY}/g, customTokens.YY || shortYear);
  result = result.replace(/{GRP}/g, customTokens.GRP || "CS");
  result = result.replace(/{SEC}/g, customTokens.SEC || "A");

  return result;
}

export function generateNextNumber(seriesKey, customTokens = {}) {
  const seriesList = readNumberSeriesSettings();
  const series = seriesList.find((s) => s.key === seriesKey || s.id === seriesKey);
  if (!series) {
    if (seriesKey === "teaching-staff") return "PCT018";
    if (seriesKey === "non-teaching-staff") return "NT011";
    if (seriesKey === "student-admission") return "ADM20260101";
    if (seriesKey === "student-roll") return "ROLL26051";
    return "ID001";
  }
  return formatSeriesNumber(series, Number(series.currentNumber || 0) + 1, customTokens);
}

export function incrementSeriesSequence(seriesKey) {
  const seriesList = readNumberSeriesSettings();
  const updated = seriesList.map((s) => {
    if (s.key === seriesKey || s.id === seriesKey) {
      return { ...s, currentNumber: Number(s.currentNumber || 0) + 1 };
    }
    return s;
  });
  writeNumberSeriesSettings(updated);
}

export function resetNumberSeriesSequence(id, newCurrentNumber = 0) {
  const seriesList = readNumberSeriesSettings();
  const updated = seriesList.map((s) => {
    if (s.id === id || s.key === id) {
      return { ...s, currentNumber: Number(newCurrentNumber) };
    }
    return s;
  });
  writeNumberSeriesSettings(updated);
}

