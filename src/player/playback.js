/* Playback controls: queue navigation, seeking, volume and track loading. */

import { el } from "../core/dom.js";
import { state } from "../core/state.js";
import {
  savePlayerState,
  saveSettings,
  storedSettings,
} from "../core/storage.js";
import { api } from "../utils/api.js";
import { audioUrl, clamp } from "../utils/format.js";
import { navigateTo } from "../views/router.js";
import { applyPlayerTheme } from "./theme.js";
import {
  effectiveDuration,
  renderQueue,
  resetPlayerUI,
  setExpanded,
  setFsQueueOpen,
  setPlayingUI,
  setQueueOpen,
  showPlayerNote,
  updatePlaybackModes,
  updateTimeUI,
  updateTrackUI,
  updateVolumeUI,
} from "./ui.js";

export function toggleShuffle() {
  state.shuffle = !state.shuffle;
  saveSettings({ shuffle: state.shuffle });
  updatePlaybackModes();
}

export function cycleRepeat() {
  const order = ["off", "all", "one"];
  state.repeat = order[(order.indexOf(state.repeat) + 1) % order.length];
  saveSettings({ repeat: state.repeat });
  updatePlaybackModes();
}

export function seekTo(value) {
  const duration = effectiveDuration();
  const time = clamp(Number(value) || 0, 0, duration || Number(value) || 0);
  if (!duration) return;
  el.audio.currentTime = time;
  updateTimeUI();
}

export async function togglePlay() {
  if (!el.audio.getAttribute("src")) return;
  if (el.audio.paused) {
    try {
      await el.audio.play();
    } catch {
      setPlayingUI(false);
    }
  } else {
    el.audio.pause();
  }
}

export function handlePrev() {
  if ((el.audio.currentTime || 0) > 3) {
    seekTo(0);
    return;
  }
  nextTrack(-1);
}

export function nextTrack(dir = 1) {
  if (!state.queue.length) return;
  if (state.shuffle && state.queue.length > 1) {
    let next = state.queueIndex;
    while (next === state.queueIndex)
      next = Math.floor(Math.random() * state.queue.length);
    startTrack(state.queue, next);
    return;
  }
  let next = state.queueIndex + dir;
  if (next >= state.queue.length) {
    if (state.repeat === "all") next = 0;
    else {
      if (dir > 0) setPlayingUI(false);
      return;
    }
  }
  if (next < 0) {
    if (state.repeat === "all") next = state.queue.length - 1;
    else {
      seekTo(0);
      return;
    }
  }
  startTrack(state.queue, next);
}

export function playQueueIndex(index) {
  if (!state.queue[index]) return;
  startTrack(state.queue, index);
}

export async function startTrack(list, index) {
  const token = ++state.loadToken;
  const original = list?.[index];
  if (!original) return;

  let song = original;
  let src = audioUrl(song);

  if (!src && song.id) {
    try {
      const full = await api(`/songs?ids=${encodeURIComponent(song.id)}`);
      if (token !== state.loadToken) return;
      song = Array.isArray(full) ? full[0] : full;
      src = audioUrl(song);
    } catch {}
  }

  if (!src) {
    showPlayerNote("This track has no playable audio.");
    return;
  }

  if (list === state.queue) state.queue[index] = song;
  else state.queue = list.map((item, i) => (i === index ? song : item));
  if (list === state.allSongs) state.allSongs[index] = song;
  state.queueIndex = index;
  state.currentSong = song;
  state.duration = Number(song.duration) || 0;
  state.seeking = false;

  el.audio.src = src;
  el.audio.volume = clamp(Number(storedSettings.volume ?? 1), 0, 1);
  el.audio.muted = !!storedSettings.muted;
  el.player.classList.add("open");
  document.body.classList.add("player-open");
  updateTrackUI(song);
  updatePlaybackModes();
  updateVolumeUI();
  renderQueue();

  el.progressBar.value = "0";
  el.fsProgress.value = "0";
  if (state.duration) {
    el.progressBar.max = String(state.duration);
    el.fsProgress.max = String(state.duration);
  }
  updateTimeUI();
  setPlayingUI(true);

  try {
    await el.audio.play();
    if (token === state.loadToken) setPlayingUI(true);
  } catch {
    if (token === state.loadToken) setPlayingUI(false);
  }
}

export function playSong(index) {
  if (!state.allSongs[index]) return;
  startTrack(state.allSongs, index);
}

export function playAll() {
  if (state.allSongs.length) playSong(0);
}

export function closePlayer() {
  el.audio.pause();
  el.audio.removeAttribute("src");
  el.audio.load();
  state.queue = [];
  state.queueIndex = -1;
  state.duration = 0;
  state.artSrc = "";
  state.artAccent = null;
  state.accentToken += 1;
  setPlayingUI(false);
  setExpanded(false);
  setQueueOpen(false);
  setFsQueueOpen(false);
  el.player.classList.remove("open", "expanded", "hovering");
  document.body.classList.remove("player-open");
  resetPlayerUI();
  renderQueue();
  applyPlayerTheme();
  if (location.hash === "#/player") navigateTo("#/");
  savePlayerState();
}

export function setVolumeState(value) {
  const v = clamp(Number(value) || 0, 0, 1);
  el.audio.volume = v;
  el.audio.muted = v === 0;
  updateVolumeUI();
  saveSettings({ volume: v, muted: el.audio.muted });
}
