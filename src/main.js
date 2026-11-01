/* Application entry point: import the pieces, then start the app. */

import { el } from "./core/dom.js";
import { state } from "./core/state.js";
import { savedPlayer } from "./core/storage.js";
import { bindEvents } from "./events.js";
import { restorePlayer } from "./player/restore.js";
import { renderQueue, updateTimeUI, updateVolumeUI } from "./player/ui.js";
import { bindSettings } from "./views/settings.js";
import { setStatus } from "./views/results.js";
import { initNotice } from "./views/notice.js";

bindSettings();
bindEvents();
renderQueue();
updateTimeUI();
updateVolumeUI();

if (savedPlayer.player) {
  setTimeout(() => restorePlayer(savedPlayer.player), 500);
}

if (!state.query && el.detail.classList.contains("hidden")) {
  setStatus(
    "Start with a search",
    "Search for songs, albums, artists, or playlists.",
  );
}

initNotice();
