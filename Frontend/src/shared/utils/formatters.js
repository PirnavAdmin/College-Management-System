export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

export const formatNumber = (value) =>
  Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "0";
