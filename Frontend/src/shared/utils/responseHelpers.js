export const asArray = (data) => {
  if (Array.isArray(data)) return data;
  return data?.data || data?.items || data?.content || data?.records || [];
};

export const readEntity = (data) => data?.data || data;
