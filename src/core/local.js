/* Local / offline library.
   Audio files picked by the user are stored in IndexedDB inside this browser
   only. Nothing is uploaded. Records hold metadata; the actual File blob lives
   in a separate store so listing the library stays cheap. */

import { state } from "./state.js";

const DB_NAME = "flow-saavan-local";
const DB_VERSION = 1;
const TRACKS = "tracks";
const FILES = "files";
const AUDIO_EXT =
  /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|webm|mp4|m4b)$/i;

let dbPromise = null;
/* blob: URLs are created lazily and kept alive for the session. */
const urlCache = new Map();

export function isLocalSupported() {
  return typeof indexedDB !== "undefined";
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRACKS)) {
        const store = db.createObjectStore(TRACKS, { keyPath: "id" });
        store.createIndex("addedAt", "addedAt");
      }
      if (!db.objectStoreNames.contains(FILES)) {
        db.createObjectStore(FILES, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB failed"));
  });
  return dbPromise;
}

function runRequest(storeName, mode, action) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = action(tx.objectStore(storeName));
        tx.oncomplete = () => resolve(request?.result);
        tx.onerror = () => reject(tx.error || new Error("Storage failed"));
        tx.onabort = () => reject(tx.error || new Error("Storage aborted"));
      }),
  );
}

function put(storeName, value) {
  return runRequest(storeName, "readwrite", (store) => store.put(value));
}

function get(storeName, key) {
  return runRequest(storeName, "readonly", (store) => store.get(key));
}

function remove(storeName, key) {
  return runRequest(storeName, "readwrite", (store) => store.delete(key));
}

function clear(storeName) {
  return runRequest(storeName, "readwrite", (store) => store.clear());
}

function getAll(storeName) {
  return runRequest(storeName, "readonly", (store) => store.getAll());
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isAudioFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("audio/")) return true;
  return AUDIO_EXT.test(file.name || "");
}

/* "Artist - Title.mp3" -> { artist, name } */
function parseFileName(fileName = "Untitled") {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const split = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (split) {
    return { artist: split[1].trim(), name: split[2].trim() };
  }
  return { artist: "Local file", name: base || "Untitled" };
}

function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? value : 0);
    };
    probe.preload = "metadata";
    probe.onloadedmetadata = () => finish(probe.duration);
    probe.onerror = () => finish(0);
    setTimeout(() => finish(probe.duration), 4000);
    probe.src = url;
  });
}

function hashHue(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  }
  return hash;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* Deterministic gradient cover so local rows never show an empty image. */
export function localCover(name = "") {
  const title = String(name || "?").trim() || "?";
  const hue = hashHue(title);
  const letter = xmlEscape(title.charAt(0).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 68% 56%)"/><stop offset="1" stop-color="hsl(${(hue + 55) % 360} 68% 34%)"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><text x="48" y="64" font-family="Inter,sans-serif" font-size="46" font-weight="700" fill="rgba(255,255,255,0.92)" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

export async function listLocalTracks() {
  const records = await getAll(TRACKS);
  return records.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
}

export async function initLocalLibrary() {
  try {
    state.localTracks = await listLocalTracks();
  } catch {
    state.localTracks = [];
  }
  return state.localTracks;
}

export async function addLocalFiles(fileList, onProgress) {
  if (!isLocalSupported()) throw new Error("This browser cannot store local files.");
  const files = Array.from(fileList || []).filter(isAudioFile);
  if (!files.length) throw new Error("No supported audio files were selected.");

  const existing = new Set(
    (await listLocalTracks()).map((r) => `${r.name}|${r.size}`),
  );
  const added = [];

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);
    const { artist, name } = parseFileName(file.name);
    const key = `${name}|${file.size}`;
    if (existing.has(key)) continue;

    const record = {
      id: uid(),
      name,
      artist,
      duration: await readDuration(file),
      size: file.size || 0,
      mime: file.type || "",
      addedAt: Date.now(),
    };
    await put(TRACKS, record);
    await put(FILES, { id: record.id, blob: file });
    existing.add(key);
    added.push(record);
  }

  state.localTracks = await listLocalTracks();
  return added;
}

export async function getLocalObjectUrl(id) {
  if (!id) return "";
  const cached = urlCache.get(id);
  if (cached) return cached;
  const record = await get(FILES, id);
  if (!record?.blob) return "";
  const url = URL.createObjectURL(record.blob);
  urlCache.set(id, url);
  return url;
}

export async function removeLocalTrack(id) {
  if (!id) return;
  await remove(TRACKS, id);
  await remove(FILES, id);
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  state.localTracks = await listLocalTracks();
}

export async function clearLocalLibrary() {
  await clear(TRACKS);
  await clear(FILES);
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
  state.localTracks = [];
}

export function localSongFromRecord(record) {
  return {
    id: `local:${record.id}`,
    localId: record.id,
    isLocal: true,
    name: record.name,
    primaryArtists: record.artist || "Local file",
    duration: Number(record.duration) || 0,
    image: localCover(record.name),
    audioUrl: "",
    fileSize: record.size || 0,
    addedAt: record.addedAt || 0,
  };
}
