/* LocalStorage persistence for settings and the last player session. */

import { P_KEY, S_KEY } from "./config.js";
import { el } from "./dom.js";
import { state } from "./state.js";

export function loadSettings() {
  try {
    const raw = localStorage.getItem(S_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export const storedSettings = loadSettings();

export function saveSettings(settings) {
  try {
    Object.assign(storedSettings, settings);
    localStorage.setItem(S_KEY, JSON.stringify(storedSettings));
  } catch {}
}

export function savePlayerState() {
  const data = { hash: location.hash || "#/" };
  if (state.queue.length && state.queueIndex >= 0) {
    data.player = {
      allSongs: state.queue,
      queueIndex: state.queueIndex,
      currentTime: el.audio.currentTime || 0,
      playing: state.playing,
      title: el.playerTitle.textContent,
      artist: el.playerArtist.textContent,
      img: el.playerImg.getAttribute("src") || "",
    };
  }
  try {
    localStorage.setItem(P_KEY, JSON.stringify(data));
  } catch {}
}

export function loadPlayerState() {
  try {
    const raw = localStorage.getItem(P_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const savedPlayer = loadPlayerState();

/* Restore the previous route only when the URL has no explicit hash.
   An explicit "#/" means the user asked for the home screen. */
if (savedPlayer.hash && savedPlayer.hash !== "#/" && !location.hash) {
  location.hash = savedPlayer.hash;
}
