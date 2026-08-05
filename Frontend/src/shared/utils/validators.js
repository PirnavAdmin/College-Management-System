export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const mobileRegex = /^[0-9]{10}$/;

export const isRequired = (value) => String(value ?? "").trim().length > 0;
