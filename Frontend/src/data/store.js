import { useSyncExternalStore } from "react";
import { modules } from "@/config/modules.js";

// Simple in-memory store for the static/mock data. No API calls.
const state = {};
const listeners = new Set();

const keyOf = (slug, secondary) => (secondary ? `${slug}::secondary` : slug);

export function configFor(slug, secondary) {
  const mod = modules[slug];
  if (!mod) return null;
  return secondary ? mod.secondary : mod;
}

export function getRows(slug, secondary) {
  const k = keyOf(slug, secondary);
  if (!state[k]) {
    const cfg = configFor(slug, secondary);
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

export function useRows(slug, secondary) {
  const read = () => getRows(slug, secondary);
  return useSyncExternalStore(subscribe, read, read);
}

export function getRow(slug, secondary, id) {
  return getRows(slug, secondary).find((r) => String(r.id) === String(id)) || null;
}

export function addRow(slug, secondary, values) {
  set(slug, secondary, [{ id: Date.now(), ...values }, ...getRows(slug, secondary)]);
}

export function updateRow(slug, secondary, id, values) {
  set(
    slug,
    secondary,
    getRows(slug, secondary).map((r) => (String(r.id) === String(id) ? { ...r, ...values } : r)),
  );
}

export function deleteRow(slug, secondary, id) {
  set(slug, secondary, getRows(slug, secondary).filter((r) => String(r.id) !== String(id)));
}


