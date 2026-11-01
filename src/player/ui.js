/* Rendering and UI updates for the mini player, fullscreen player and queue. */

import { FALLBACK_ART } from "../core/config.js";
import { el } from "../core/dom.js";
import { state } from "../core/state.js";
import { storedSettings } from "../core/storage.js";
import {
  clamp,
  escapeHtml,
  fmtDur,
  fmtTime,
  getSubtitle,
  imageUrl,
  getName,
  setImg,
  stripHtml,
} from "../utils/format.js";
import { setArtAccent } from "./theme.js";

export function effectiveDuration() {
  const live = el.audio.duration;
  if (Number.isFinite(live) && live > 0) return live;
  return Number.isFinite(state.duration) && state.duration > 0
    ? state.duration
    : 0;
}

export function updateTimeUI() {
  const current = el.audio.currentTime || 0;
  const duration = effectiveDuration();
  const percent = duration ? clamp((current / duration) * 100, 0, 100) : 0;
  const remaining = !!storedSettings["player-remaining"];
  const totalText =
    remaining && duration
      ? `-${fmtTime(Math.max(0, duration - current))}`
      : fmtTime(duration);

  el.currentTime.textContent = fmtTime(current);
  el.totalTime.textContent = totalText;
  el.fsCurrent.textContent = fmtTime(current);
  el.fsTotal.textContent = totalText;
  if (el.scrubFill) el.scrubFill.style.width = `${percent}%`;
  if (el.fsScrubFill) el.fsScrubFill.style.width = `${percent}%`;

  el.progressBar.disabled = !duration;
  el.fsProgress.disabled = !duration;
  if (!state.seeking) {
    if (duration) {
      el.progressBar.max = String(duration);
      el.fsProgress.max = String(duration);
      el.progressBar.value = String(Math.min(current, duration));
      el.fsProgress.value = String(Math.min(current, duration));
    } else {
      el.progressBar.value = "0";
      el.fsProgress.value = "0";
    }
  }

  if (
    "mediaSession" in navigator &&
    navigator.mediaSession.setPositionState &&
    duration
  ) {
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: el.audio.playbackRate || 1,
        position: Math.min(current, duration),
      });
    } catch {}
  }
}

export function updateVolumeUI() {
  const value = el.audio.muted ? 0 : el.audio.volume;
  const percent = clamp(value, 0, 1) * 100;
  if (el.volumeFill) el.volumeFill.style.width = `${percent}%`;
  if (el.fsVolumeFill) el.fsVolumeFill.style.width = `${percent}%`;
  el.volumeBar.value = String(value);
  el.fsVolumeBar.value = String(value);

  const icon =
    el.audio.muted || value === 0
      ? "bi-volume-mute-fill"
      : value < 0.5
        ? "bi-volume-down-fill"
        : "bi-volume-up-fill";
  el.muteBtn.innerHTML = `<i class="bi ${icon}"></i>`;
  el.fsMute.innerHTML = `<i class="bi ${icon}"></i>`;
  el.muteBtn.setAttribute("aria-label", el.audio.muted ? "Unmute" : "Mute");
  el.fsMute.setAttribute("aria-label", el.audio.muted ? "Unmute" : "Mute");
}

export function setPlayingUI(playing) {
  state.playing = playing;
  document.body.classList.toggle("is-playing", playing);
  const icon = playing ? "bi-pause-fill" : "bi-play-fill";
  el.playPauseBtn.innerHTML = `<i class="bi ${icon}"></i>`;
  el.fsPlayPause.innerHTML = `<i class="bi ${icon}"></i>`;
  el.playPauseBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  el.fsPlayPause.setAttribute("aria-label", playing ? "Pause" : "Play");
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }
}

export function updatePlaybackModes() {
  el.shuffleBtn.classList.toggle("active", state.shuffle);
  el.fsShuffle.classList.toggle("active", state.shuffle);
  el.shuffleBtn.setAttribute("aria-pressed", String(state.shuffle));
  el.fsShuffle.setAttribute("aria-pressed", String(state.shuffle));

  const repeating = state.repeat !== "off";
  const repeatIcon = state.repeat === "one" ? "bi-repeat-1" : "bi-repeat";
  el.repeatBtn.classList.toggle("active", repeating);
  el.fsRepeat.classList.toggle("active", repeating);
  el.repeatBtn.setAttribute("aria-pressed", String(repeating));
  el.fsRepeat.setAttribute("aria-pressed", String(repeating));
  el.repeatBtn.innerHTML = `<i class="bi ${repeatIcon}"></i>`;
  el.fsRepeat.innerHTML = `<i class="bi ${repeatIcon}"></i>`;
  const label =
    state.repeat === "one"
      ? "Repeat one"
      : state.repeat === "all"
        ? "Repeat all"
        : "Repeat off";
  el.repeatBtn.setAttribute("aria-label", label);
  el.repeatBtn.setAttribute("title", label);
  el.fsRepeat.setAttribute("aria-label", label);
}

export function updateMediaMetadata(song) {
  if (!("mediaSession" in navigator) || !("MediaMetadata" in window)) return;
  const image = imageUrl(song, 2);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: getName(song),
      artist: getSubtitle(song, ""),
      album: song?.album?.name ? stripHtml(song.album.name) : "",
      artwork: image
        ? [{ src: image, sizes: "500x500", type: "image/jpeg" }]
        : [],
    });
  } catch {}
}

export function sourceLabel(song) {
  const title = getName(song);
  const album = song?.album?.name ? stripHtml(song.album.name) : "";
  if (album && album !== title) return `From ${album}`;
  const language = song?.language ? stripHtml(song.language) : "";
  if (language) {
    return `${language.charAt(0).toUpperCase()}${language.slice(1)} · Now playing`;
  }
  return "Now playing";
}

export function updateTrackUI(song) {
  const title = getName(song);
  const artist = getSubtitle(song, "Artist");
  const art = imageUrl(song);
  const image = art || FALLBACK_ART;

  state.currentArtist = artist;
  setImg(el.playerImg, image);
  setImg(el.fsImg, image);
  setImg(el.fsLabelImg, image);

  el.playerTitle.textContent = title;
  el.playerArtist.textContent = artist;
  el.fsTitle.textContent = title;
  el.fsArtist.textContent = artist;
  el.fsSource.textContent = sourceLabel(song);

  updateMediaMetadata(song);
  setArtAccent(art);
}

export function resetPlayerUI() {
  state.currentSong = null;
  state.currentArtist = "Search and play a track";
  state.duration = 0;
  setImg(el.playerImg, "");
  setImg(el.fsImg, "");
  setImg(el.fsLabelImg, "");
  el.playerTitle.textContent = "Nothing playing";
  el.playerArtist.textContent = "Search and play a track";
  el.fsTitle.textContent = "Nothing playing";
  el.fsArtist.textContent = "Search and play a track";
  el.fsSource.textContent = "Now playing";
  updateTimeUI();
  updateVolumeUI();
}

let noteTimer = null;
export function showPlayerNote(message, timeout = 4000) {
  if (!el.player.classList.contains("open")) return;
  el.playerArtist.textContent = message;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    el.playerArtist.textContent = state.currentArtist;
  }, timeout);
}

export function setQueueOpen(open) {
  state.queueOpen = open;
  el.playerQueue.hidden = !open;
  el.playerQueue.setAttribute("aria-hidden", String(!open));
  el.queueBtn.setAttribute("aria-expanded", String(open));
  el.queueBtn.classList.toggle("active", open);
  if (open) renderQueue();
}

export function setFsQueueOpen(open) {
  el.fullscreenView.classList.toggle("queue-open", open);
  el.fsQueueBtn.setAttribute("aria-expanded", String(open));
  el.fsQueueBtn.classList.toggle("active", open);
}

export function setExpanded(expanded) {
  state.expanded = expanded;
  el.player.classList.toggle("expanded", expanded);
  el.playerToggle.setAttribute("aria-expanded", String(expanded));
  el.playerToggle.setAttribute(
    "aria-label",
    expanded ? "Collapse player" : "Expand player",
  );
}

export function renderQueue() {
  const html = state.queue.length
    ? state.queue
        .map((song, index) => {
          const image = imageUrl(song) || FALLBACK_ART;
          const current = index === state.queueIndex;
          return `
            <button class="queue-item${current ? " current" : ""}" type="button" data-queue-index="${index}" aria-current="${current ? "true" : "false"}">
              <span class="queue-index">${index + 1}</span>
              <img src="${escapeHtml(image)}" alt="" loading="lazy">
              <span class="queue-item-meta">
                <span class="queue-item-title">${escapeHtml(getName(song))}</span>
                <span class="queue-item-artist">${escapeHtml(getSubtitle(song, "Artist"))}</span>
              </span>
              <span class="queue-item-dur">${fmtDur(song?.duration)}</span>
            </button>`;
        })
        .join("")
    : '<p class="queue-empty">Nothing queued yet.</p>';

  el.playerQueueList.innerHTML = html;
  el.fsQueueList.innerHTML = html;
  el.queueCount.textContent = String(state.queue.length);
  const label =
    state.queue.length === 1 ? "1 track" : `${state.queue.length} tracks`;
  el.queueLabel.textContent = label;
  el.fsQueueLabel.textContent = label;
}
