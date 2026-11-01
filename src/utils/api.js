/* Thin wrapper around the configured music API. */

import { state } from "../core/state.js";

export async function api(path) {
  const r = await fetch(`${state.baseUrl}${path}`);
  const j = await r.json();
  if (!r.ok || j.success === false)
    throw new Error(j.message || `Request failed with ${r.status}`);
  return j.data;
}
