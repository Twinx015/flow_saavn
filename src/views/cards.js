/* Reusable card / row markup. Edit card visuals here and in styles/library.css. */

import {
  escapeHtml,
  fmtDur,
  getName,
  getSubtitle,
  imageUrl,
} from "../utils/format.js";

export function renderCard(type, item, index) {
  const title = getName(item);
  const subtitle = getSubtitle(item, type.slice(0, -1));
  const img = imageUrl(item);
  const explicit = item.explicitContent
    ? '<span class="tag explicit-tag">Explicit</span>'
    : "";
  const isSong = type === "songs";
  const action = isSong
    ? `data-play="${index}"`
    : `data-open="${type}" data-id="${escapeHtml(item.id)}"`;
  const playAction = isSong
    ? `<button class="play-button" type="button" data-play="${index}">Play</button>`
    : `<button class="play-button" type="button" data-open="${type}" data-id="${escapeHtml(item.id)}">Open</button>`;
  return `
    <article class="card" ${action}>
      <img class="art" src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">
      <h3 class="clamp">${escapeHtml(title)}</h3>
      <p class="clamp">${escapeHtml(subtitle)}</p>
      <div class="card-actions">${playAction}${explicit}</div>
    </article>
  `;
}

export function renderSongRow(song, index, { removable = false } = {}) {
  const title = getName(song);
  const artist = getSubtitle(song, "Artist");
  const duration = fmtDur(song.duration);
  const explicit = song.explicitContent
    ? '<span class="tag explicit-tag">Explicit</span>'
    : "";
  const removeBtn =
    removable && song.localId
      ? `<button class="row-remove" type="button" data-local-remove="${escapeHtml(song.localId)}" aria-label="Remove ${escapeHtml(title)}" title="Remove from device"><i class="bi bi-trash3"></i></button>`
      : "";
  return `
    <article class="row-card" data-play="${index}">
      <span class="index">${index + 1}</span>
      <img src="${escapeHtml(imageUrl(song))}" alt="${escapeHtml(title)}" loading="lazy">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(artist)}</p>
      </div>
      <span class="duration">${duration}</span>
      <button class="play-button alb" type="button" data-play="${index}"><i class="bi bi-play-fill"></i></button>
      ${explicit}${removeBtn}
    </article>
  `;
}
