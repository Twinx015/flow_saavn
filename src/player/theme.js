import { state } from "../core/state.js";
import { storedSettings } from "../core/storage.js";
import { DEFAULT_ACCENT } from "../core/config.js";
import {
  contrastInk,
  extractAccent,
  harmonizeAccent,
  hexToRgb,
  hexToRgbTuple,
  normalizeHex,
} from "../utils/color.js";

export async function setArtAccent(src) {
  if (src === state.artSrc) return;
  state.artSrc = src;
  const token = ++state.accentToken;
  const color = await extractAccent(src);
  if (token !== state.accentToken) return;
  state.artAccent = color;
  applyPlayerTheme();
}

export function applyPlayerTheme() {
  const root = document.documentElement;
  const source = storedSettings["player-accent"] || "art";
  const appAccent = normalizeHex(
    storedSettings["accent-color"] || DEFAULT_ACCENT,
  );

  let accent = appAccent;
  if (source === "custom") {
    accent = normalizeHex(storedSettings["player-custom-accent"] || appAccent);
  } else if (source === "art" && state.artAccent) {
    accent = harmonizeAccent(state.artAccent);
  }

  const rgb = hexToRgbTuple(accent);
  root.style.setProperty("--player-accent", accent);
  root.style.setProperty("--player-accent-rgb", rgb.join(", "));
  root.style.setProperty("--player-accent-ink", contrastInk(rgb));
  root.style.setProperty(
    "--player-accent-soft",
    `rgba(${rgb.join(", ")}, 0.13)`,
  );
  root.style.setProperty(
    "--player-accent-softer",
    `rgba(${rgb.join(", ")}, 0.06)`,
  );

  const useAppAccent = !!storedSettings["player-app-accent"];
  if (useAppAccent) {
    root.style.setProperty("--primary", accent);
    root.style.setProperty("--primary-rgb", rgb.join(", "));
  } else {
    root.style.setProperty("--primary", appAccent);
    root.style.setProperty("--primary-rgb", hexToRgb(appAccent));
  }
}
