/* Local library view: add files from the device, list them and remove them. */

import { el } from "../core/dom.js";
import { state } from "../core/state.js";
import {
  addLocalFiles,
  clearLocalLibrary,
  formatBytes,
  isLocalSupported,
  localSongFromRecord,
  removeLocalTrack,
} from "../core/local.js";
import { renderSongRow } from "./cards.js";

export function localSongs() {
  return state.localTracks.map(localSongFromRecord);
}

export function renderLocalView() {
  const records = state.localTracks;
  const songs = localSongs();
  /* Rows use data-play indexes, so the play queue is the whole local library. */
  state.allSongs = songs;

  el.localList.innerHTML = songs.length
    ? songs
        .map((song, index) => renderSongRow(song, index, { removable: true }))
        .join("")
    : `<div class="status"><strong>No local songs yet</strong>Add audio files from this device to play them here.</div>`;

  const totalSize = records.reduce((sum, r) => sum + (r.size || 0), 0);
  el.localMeta.textContent = records.length
    ? `${records.length} ${records.length === 1 ? "song" : "songs"} · ${formatBytes(totalSize)} · stored in this browser`
    : "Nothing stored yet";

  if (el.localClear) el.localClear.disabled = !records.length;
}

export async function importLocalFiles(files) {
  if (!files || !files.length) return;
  const list = Array.from(files);
  if (!isLocalSupported()) {
    el.localStatus.textContent = "This browser cannot store local files.";
    return;
  }

  el.localStatus.textContent = `Adding ${list.length} ${list.length === 1 ? "file" : "files"}…`;
  if (el.localAdd) el.localAdd.disabled = true;

  try {
    const added = await addLocalFiles(list, (done, total, name) => {
      el.localStatus.textContent = `Adding ${done}/${total} — ${name}`;
    });
    el.localStatus.textContent = added.length
      ? `Added ${added.length} ${added.length === 1 ? "song" : "songs"}.`
      : "Those files are already in your library.";
    renderLocalView();
  } catch (err) {
    el.localStatus.textContent = `Could not add files: ${err.message}`;
  } finally {
    if (el.localAdd) el.localAdd.disabled = false;
  }
}

export async function deleteLocalSong(id) {
  try {
    await removeLocalTrack(id);
    el.localStatus.textContent = "Song removed.";
    renderLocalView();
  } catch (err) {
    el.localStatus.textContent = `Could not remove song: ${err.message}`;
  }
}

export async function wipeLocalLibrary() {
  try {
    await clearLocalLibrary();
    el.localStatus.textContent = "Local library cleared.";
    renderLocalView();
  } catch (err) {
    el.localStatus.textContent = `Could not clear library: ${err.message}`;
  }
}
