/* Restores the last playing track / queue after a reload. */

import { el } from "../core/dom.js";
import { state } from "../core/state.js";
import { storedSettings } from "../core/storage.js";
import { audioUrl, clamp } from "../utils/format.js";
import { syncFullscreen } from "../views/router.js";
import {
  renderQueue,
  setPlayingUI,
  updatePlaybackModes,
  updateTimeUI,
  updateTrackUI,
  updateVolumeUI,
} from "./ui.js";

export function restorePlayer(data) {
  if (!data || !data.allSongs || !data.allSongs.length) return;
  if (el.player.classList.contains("open")) return;

  state.queue = data.allSongs;
  state.queueIndex = clamp(
    Number.isInteger(data.queueIndex) ? data.queueIndex : 0,
    0,
    data.allSongs.length - 1,
  );
  state.allSongs = data.allSongs;
  state.currentSong = state.queue[state.queueIndex];

  el.player.classList.add("open");
  document.body.classList.add("player-open");
  updateTrackUI(state.currentSong);
  updatePlaybackModes();
  renderQueue();

  const song = state.currentSong;
  const src = audioUrl(song);
  if (!src) return;

  state.duration = Number(song.duration) || 0;
  el.audio.src = src;
  el.audio.volume = clamp(Number(storedSettings.volume ?? 1), 0, 1);
  el.audio.muted = !!storedSettings.muted;
  updateVolumeUI();

  const resumeAt = Number(data.currentTime) || 0;
  if (state.duration) {
    el.progressBar.max = String(state.duration);
    el.fsProgress.max = String(state.duration);
  }
  updateTimeUI();

  el.audio.addEventListener(
    "loadedmetadata",
    () => {
      if (resumeAt) {
        try {
          el.audio.currentTime = resumeAt;
        } catch {}
      }
      updateTimeUI();
    },
    { once: true },
  );

  if (data.playing) {
    el.audio
      .play()
      .then(() => setPlayingUI(true))
      .catch(() => setPlayingUI(false));
  } else {
    setPlayingUI(false);
  }

  syncFullscreen();
}
