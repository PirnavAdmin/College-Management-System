import { useSyncExternalStore } from "react";

// Simple in-memory store for the static/mock data. No API calls.
const state = {};
const listeners = new Set();

const keyOf = (slug, secondary) => (secondary ? `${slug}::secondary` : slug);

export function configFor(config, secondary) {
  if (!config) return null;
  return secondary ? config.secondary : config;
}

export function getRows(slug, secondary, config) {
  const k = keyOf(slug, secondary);
  if (!state[k]) {
    const cfg = configFor(config, secondary);
    state[k] = cfg ? cfg.rows : [];
  }
  return state[k];
}

function set(slug, secondary, rows) {
  state[keyOf(slug, secondary)] = rows;
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useRows(slug, secondary, config) {
  const read = () => getRows(slug, secondary, config);
  return useSyncExternalStore(subscribe, read, read);
}

export function getRow(slug, secondary, id, config) {
  return getRows(slug, secondary, config).find((r) => String(r.id) === String(id)) || null;
}

export function addRow(slug, secondary, values, config) {
  set(slug, secondary, [{ id: Date.now(), ...values }, ...getRows(slug, secondary, config)]);
}

export function updateRow(slug, secondary, id, values, config) {
  set(
    slug,
    secondary,
    getRows(slug, secondary, config).map((r) => (String(r.id) === String(id) ? { ...r, ...values } : r)),
  );
}

export function deleteRow(slug, secondary, id, config) {
  set(slug, secondary, getRows(slug, secondary, config).filter((r) => String(r.id) !== String(id)));
}