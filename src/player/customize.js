/* Applies player-related settings to CSS custom properties / body classes. */

import { el } from "../core/dom.js";
import { storedSettings } from "../core/storage.js";
import { applyPlayerTheme } from "./theme.js";
import { updateTimeUI } from "./ui.js";

export function applyPlayerCustomization() {
  const body = document.body;
  const root = document.documentElement;
  body.dataset.playerStyle = storedSettings["player-style"] || "dock";
  body.classList.toggle("player-tint", storedSettings["player-tint"] !== false);
  body.classList.toggle("no-vinyl", storedSettings["player-vinyl"] === false);
  body.classList.toggle(
    "hide-player-volume",
    storedSettings["player-volume"] === false,
  );
  root.style.setProperty(
    "--player-radius",
    `${Number(storedSettings["player-radius"] ?? 18)}px`,
  );
  applyPlayerTheme();
  updateTimeUI();
}
