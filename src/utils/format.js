/* Formatting and normalisation helpers shared across views. */

import { state } from "../core/state.js";

export function escapeHtml(v = "") {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function stripHtml(v = "") {
  const n = document.createElement("div");
  n.innerHTML = v;
  return n.textContent || n.innerText || "";
}

export function getName(item) {
  return stripHtml(item?.name || item?.title || "Unknown");
}

export function artistNames(item) {
  const primary = item?.artists?.primary;
  const all = item?.artists?.all;
  const list = Array.isArray(primary) && primary.length ? primary : all;
  return Array.isArray(list)
    ? list
        .map((a) => a.name)
        .filter(Boolean)
        .join(", ")
    : "";
}

export function getSubtitle(item, fb = "Music") {
  return stripHtml(
    item?.primaryArtists ||
      item?.primaryArtistsNames ||
      artistNames(item) ||
      item?.artist ||
      item?.subtitle ||
      item?.owner ||
      item?.role ||
      item?.album?.name ||
      fb,
  );
}

export function imageUrl(item, pref = 2) {
  const img = item?.image;
  if (Array.isArray(img))
    return img[pref]?.url || img.at(-1)?.url || img[0]?.url || "";
  return img || "";
}

export function audioUrl(song) {
  const urls = song?.downloadUrl;
  if (Array.isArray(urls))
    return (
      urls[state.qualityIndex]?.url || urls.at(-1)?.url || urls[0]?.url || ""
    );
  return song?.audioUrl || song?.media_url || "";
}

export function fmtDur(seconds) {
  const raw = Number.parseInt(seconds, 10);
  if (!Number.isFinite(raw)) return "";
  const m = Math.floor(raw / 60);
  return `${m}:${String(raw % 60).padStart(2, "0")}`;
}

export function fmtTime(s) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function setImg(node, src) {
  if (!node) return;
  if (src) node.setAttribute("src", src);
  else node.removeAttribute("src");
}

export function normalizeItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.songs)) return data.songs;
  if (Array.isArray(data?.albums)) return data.albums;
  if (Array.isArray(data?.artists)) return data.artists;
  if (Array.isArray(data?.playlists)) return data.playlists;
  return [];
}
