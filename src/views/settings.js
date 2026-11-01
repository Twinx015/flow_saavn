/* Binds every control on the settings screen to state / CSS variables. */

import { DEFAULT_ACCENT } from "../core/config.js";
import { $, el } from "../core/dom.js";
import { state } from "../core/state.js";
import { saveSettings, storedSettings } from "../core/storage.js";
import { clamp } from "../utils/format.js";
import { applyPlayerCustomization } from "../player/customize.js";
import { applyPlayerTheme } from "../player/theme.js";
import {
  updatePlaybackModes,
  updateTimeUI,
  updateVolumeUI,
} from "../player/ui.js";

let lastFocused = null;

export function isSettingsOpen() {
  return !!el.settingsView?.classList.contains("active");
}

export function openSettings() {
  const view = el.settingsView;
  if (!view || view.classList.contains("active")) return;
  lastFocused = document.activeElement;
  view.classList.add("active");
  view.setAttribute("aria-hidden", "false");
  document.body.classList.add("settings-open");
  requestAnimationFrame(() => {
    view.querySelector(".settings-close")?.focus();
  });
}

export function closeSettings() {
  const view = el.settingsView;
  if (!view || !view.classList.contains("active")) return;
  view.classList.remove("active");
  view.setAttribute("aria-hidden", "true");
  document.body.classList.remove("settings-open");
  if (lastFocused && document.contains(lastFocused)) {
    lastFocused.focus();
  }
  lastFocused = null;
}

export function bindSettings() {
  const root = document.documentElement;
  const body = document.body;
  const saved = storedSettings;

  const bindRange = (
    id,
    prop,
    suffix,
    outId,
    transform = (v) => v,
    format = (v) => `${v}${suffix}`,
  ) => {
    const input = $(`#${id}`);
    const output = $(`#${outId}`);
    if (!input) return;
    const update = () => {
      const v = transform(input.value);
      root.style.setProperty(prop, `${v}${suffix}`);
      if (output) output.textContent = format(v, input.value);
      if (id === "limit-range") state.limit = Number(input.value);
    };
    input.addEventListener("input", () => {
      update();
      saveSettings({ [id]: input.value });
    });
    if (saved[id] !== undefined) input.value = saved[id];
    update();
  };

  const bindToggle = (id, cls) => {
    const input = $(`#${id}`);
    if (!input) return;
    const update = () => {
      body.classList.toggle(cls, !input.checked);
      saveSettings({ [id]: input.checked });
    };
    input.addEventListener("change", update);
    if (saved[id] !== undefined) input.checked = saved[id];
    update();
  };

  const bindPlayerToggle = (id, apply = applyPlayerCustomization) => {
    const input = $(`#${id}`);
    if (!input) return;
    if (saved[id] !== undefined) input.checked = saved[id];
    input.addEventListener("change", () => {
      saveSettings({ [id]: input.checked });
      apply();
    });
  };

  bindRange("radius-range", "--radius", "px", "radius-output");
  bindRange("density-range", "--density", "px", "density-output");
  bindRange(
    "font-range",
    "--font-scale",
    "",
    "font-output",
    (v) => Number(v) / 100,
    (_v, r) => `${r}%`,
  );
  bindRange(
    "limit-range",
    "--unused-limit",
    "",
    "limit-output",
    (v) => v,
    (_v, r) => r,
  );
  bindRange("player-radius", "--player-radius", "px", "player-radius-output");

  const accentInput = $("#accent-color");
  accentInput.value = saved["accent-color"] || DEFAULT_ACCENT;
  accentInput.addEventListener("input", (e) => {
    saveSettings({ "accent-color": e.target.value });
    applyPlayerTheme();
  });

  const themeSelect = $("#theme-mode");
  themeSelect.value = saved["theme-mode"] || "dark";
  themeSelect.addEventListener("change", (e) => {
    body.dataset.theme = e.target.value;
    saveSettings({ "theme-mode": e.target.value });
    applyPlayerTheme();
  });
  body.dataset.theme = themeSelect.value;

  const layoutSelect = $("#layout-style");
  layoutSelect.value = saved["layout-style"] || "grid";
  layoutSelect.addEventListener("change", (e) => {
    body.dataset.layout = e.target.value;
    saveSettings({ "layout-style": e.target.value });
  });
  body.dataset.layout = layoutSelect.value;

  const shapeSelect = $("#image-shape");
  shapeSelect.value = saved["image-shape"] || "rounded";
  shapeSelect.addEventListener("change", (e) => {
    body.dataset.imageShape = e.target.value;
    saveSettings({ "image-shape": e.target.value });
  });
  body.dataset.imageShape = shapeSelect.value;

  const qualitySelect = $("#quality-select");
  qualitySelect.value = saved["quality-select"] || "4";
  state.qualityIndex = Number(qualitySelect.value);
  qualitySelect.addEventListener("change", (e) => {
    state.qualityIndex = Number(e.target.value);
    saveSettings({ "quality-select": e.target.value });
  });

  const apiInput = $("#api-base");
  apiInput.value = saved["api-base"] || state.baseUrl;
  state.baseUrl = apiInput.value.replace(/\/$/, "");
  apiInput.addEventListener("change", (e) => {
    state.baseUrl = e.target.value.replace(/\/$/, "");
    saveSettings({ "api-base": e.target.value });
  });

  bindToggle("motion-toggle", "no-motion");
  bindToggle("explicit-toggle", "hide-explicit");

  const styleSelect = $("#player-style");
  styleSelect.value = saved["player-style"] || "dock";
  styleSelect.addEventListener("change", (e) => {
    saveSettings({ "player-style": e.target.value });
    applyPlayerCustomization();
  });

  const playerAccent = $("#player-accent");
  const customRow = $("#player-custom-row");
  const customAccent = $("#player-custom-accent");
  customAccent.value = saved["player-custom-accent"] || DEFAULT_ACCENT;

  const syncCustomRow = () => {
    if (!customRow) return;
    customRow.style.display = playerAccent.value === "custom" ? "" : "none";
  };

  playerAccent.value = saved["player-accent"] || "art";
  playerAccent.addEventListener("change", (e) => {
    saveSettings({ "player-accent": e.target.value });
    syncCustomRow();
    applyPlayerTheme();
  });
  syncCustomRow();

  customAccent.addEventListener("input", (e) => {
    saveSettings({ "player-custom-accent": e.target.value });
    applyPlayerTheme();
  });

  bindPlayerToggle("player-vinyl");
  bindPlayerToggle("player-volume");
  bindPlayerToggle("player-tint");
  bindPlayerToggle("player-app-accent");
  bindPlayerToggle("player-hover", () => {});
  bindPlayerToggle("player-remaining", updateTimeUI);

  applyPlayerCustomization();

  state.shuffle = !!saved.shuffle;
  state.repeat = ["off", "all", "one"].includes(saved.repeat)
    ? saved.repeat
    : "off";
  el.audio.volume = clamp(Number(saved.volume ?? 1), 0, 1);
  el.audio.muted = !!saved.muted;
  updatePlaybackModes();
  updateVolumeUI();
}
