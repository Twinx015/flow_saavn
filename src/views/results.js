/* Search results and album / artist / playlist detail views. */

import { el } from "../core/dom.js";
import { state } from "../core/state.js";
import { api } from "../utils/api.js";
import {
  escapeHtml,
  getName,
  getSubtitle,
  imageUrl,
  normalizeItems,
} from "../utils/format.js";
import { renderCard, renderSongRow } from "./cards.js";

/* Incremented on every route change so late API responses cannot paint
   search results or collection details onto a different view. */
let loadToken = 0;

export function cancelPendingLoads() {
  loadToken += 1;
}

export function setStatus(title, copy = "") {
  el.results.innerHTML = `<div class="status"><strong>${escapeHtml(title)}</strong>${escapeHtml(copy)}</div>`;
  el.detail.classList.add("hidden");
}

export async function runSearch() {
  const q = el.input.value.trim();
  if (!q) {
    setStatus(
      "Start with a search",
      "Choose a category and search for songs, albums, artists, or playlists.",
    );
    return;
  }
  const token = ++loadToken;
  state.query = q;
  el.detail.classList.add("hidden");
  el.results.innerHTML =
    '<div class="status"><strong>Searching...</strong></div>';
  try {
    const data = await api(
      `/search/${state.type}?query=${encodeURIComponent(q)}&limit=${state.limit}`,
    );
    if (token !== loadToken) return;
    renderResults(state.type, normalizeItems(data), data?.total);
  } catch (err) {
    if (token !== loadToken) return;
    setStatus("Search failed", err.message);
  }
}

export function renderResults(type, items, total = items.length) {
  if (!items.length) {
    setStatus(
      "No results found",
      "Try another search term or a different category.",
    );
    return;
  }
  if (type === "songs") state.allSongs = items;
  el.detail.classList.add("hidden");
  el.results.innerHTML = items
    .map((item, i) => renderCard(type, item, i))
    .join("");
}

export async function openCollection(type, id) {
  if (!id) return;
  navigate(type, id);
  const token = ++loadToken;
  el.results.innerHTML = "";
  el.detail.classList.remove("hidden");
  el.detail.innerHTML = '<div class="status"><strong>Loading...</strong></div>';
  try {
    const resource =
      type === "albums"
        ? "albums"
        : type === "artists"
          ? "artists"
          : "playlists";
    const count = type === "playlists" ? `&limit=${state.limit}` : "";
    const data = await api(`/${resource}?id=${encodeURIComponent(id)}${count}`);
    if (token !== loadToken) return;
    renderDetail(type, data);
  } catch (err) {
    if (token !== loadToken) return;
    el.detail.innerHTML = `<div class="status"><strong>Could not load</strong>${escapeHtml(err.message)}</div>`;
  }
}

export function renderDetail(type, data) {
  const songs = data?.songs || data?.topSongs || [];
  const albums = data?.topAlbums || [];
  state.allSongs = Array.isArray(songs) ? songs : [];
  const title = getName(data);
  const img = imageUrl(data, 3);
  const meta = [
    type.slice(0, -1),
    getSubtitle(data, ""),
    data?.year,
    state.allSongs.length ? `${state.allSongs.length} songs` : "",
  ]
    .filter(Boolean)
    .join(" / ");
  el.detail.innerHTML = `
    <div class="detail-head">
      <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}">
      <div>
        <p class="hero-eyebrow">${escapeHtml(type.slice(0, -1))}</p>
        <h2>${escapeHtml(title)}</h2>
        <p class="meta-line">${escapeHtml(meta)}</p>
        <div class="detail-actions">
          ${state.allSongs.length ? '<button class="play-button" type="button" data-play-all>Play all</button>' : ""}
        </div>
      </div>
    </div>
    ${state.allSongs.length ? `<div class="song-list">${state.allSongs.map(renderSongRow).join("")}</div>` : ""}
    ${albums.length ? `<h2 style="margin-top:24px;font-size:1.1rem;">Albums</h2><div class="results" style="margin-top:12px;">${albums.map((a) => renderCard("albums", a, 0)).join("")}</div>` : ""}
  `;
}

function navigate(type, id) {
  const hash = `#/${type}=${id}`;
  if (location.hash !== hash) location.hash = hash;
}
