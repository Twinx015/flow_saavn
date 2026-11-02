/* Hash-based routing between the library, settings and fullscreen player. */

import { $$, el } from "../core/dom.js";
import { state } from "../core/state.js";
import { savePlayerState } from "../core/storage.js";
import { setImg } from "../utils/format.js";
import { openCollection, runSearch, setStatus, cancelPendingLoads } from "./results.js";
import { renderLocalView } from "./local.js";
import { closeSettings, openSettings } from "./settings.js";
import {
  renderQueue,
  sourceLabel,
  updatePlaybackModes,
  updateTimeUI,
  updateVolumeUI,
} from "../player/ui.js";

export function navigateTo(hash) {
  if (location.hash === hash) return;
  location.hash = hash;
}

export function router() {
  const hash = location.hash || "#/";
  cancelPendingLoads();

  if (hash === "#/settings") {
    if (
      !el.mainView.classList.contains("active") &&
      !el.fullscreenView.classList.contains("active")
    ) {
      el.mainView.classList.add("active");
    }
    openSettings();
    savePlayerState();
    return;
  }

  closeSettings();

  [el.mainView, el.fullscreenView].forEach((v) => {
    if (v) v.classList.remove("active");
  });

  /* Leave the local library before deciding which view to show. */
  el.localView?.classList.add("hidden");
  el.results?.classList.remove("hidden");
  document.body.classList.remove("local-mode");
  el.localBtn?.classList.remove("active");

  if (hash === "#/player") {
    el.fullscreenView.classList.add("active");
    syncFullscreen();
    return;
  }

  if (hash === "#/local") {
    el.mainView.classList.add("active");
    el.detail.classList.add("hidden");
    el.results.classList.add("hidden");
    el.localView.classList.remove("hidden");
    document.body.classList.add("local-mode");
    el.localBtn?.classList.add("active");
    el.input.value = "";
    state.query = "";
    renderLocalView();
    savePlayerState();
    return;
  }

  if (hash === "#/") {
    el.mainView.classList.add("active");
    el.detail.classList.add("hidden");
    el.input.value = "";
    state.query = "";
    $$(".cat-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.type === "songs"),
    );
    state.type = "songs";
    setStatus(
      "Start with a search",
      "Search for songs, albums, artists, or playlists.",
    );
    savePlayerState();
    return;
  }

  el.mainView.classList.add("active");

  const searchMatch = hash.match(/^#\/search=(.+)$/);
  if (searchMatch) {
    const raw = searchMatch[1];
    const slashIdx = raw.lastIndexOf("/");
    let query, type;
    if (slashIdx > 0) {
      query = raw.slice(0, slashIdx);
      type = raw.slice(slashIdx + 1);
    } else {
      query = raw;
      type = state.type;
    }
    query = decodeURIComponent(query.replace(/\+/g, " "));
    el.input.value = query;
    state.query = query;
    state.type = type;
    $$(".cat-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.type === type),
    );
    runSearch();
    return;
  }

  const collMatch = hash.match(/^#\/(albums|artists|playlists)=(.+)$/);
  if (collMatch) {
    const type = collMatch[1];
    const id = decodeURIComponent(collMatch[2]);
    if (id) openCollection(type, id);
  }

  savePlayerState();
}

export function syncFullscreen() {
  const src = el.playerImg.getAttribute("src") || "";
  setImg(el.fsImg, src);
  setImg(el.fsLabelImg, src);
  el.fsTitle.textContent = el.playerTitle.textContent;
  el.fsArtist.textContent = el.playerArtist.textContent;
  el.fsSource.textContent = state.currentSong
    ? sourceLabel(state.currentSong)
    : "Now playing";
  updatePlaybackModes();
  updateTimeUI();
  updateVolumeUI();
  renderQueue();
}
