const state = {
  baseUrl: "https://teenapi.dino.icu/api",
  type: "songs",
  query: "",
  limit: 24,
  qualityIndex: 4,
  allSongs: [],
  queue: [],
  queueIndex: -1,

  playing: false,
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const el = {
  mainView: $("#main-view"),
  settingsView: $("#settings-view"),
  fullscreenView: $("#fullscreen-view"),
  form: $("#search-form"),
  input: $("#search-input"),
  results: $("#results"),
  detail: $("#detail-view"),

  player: $("#player"),
  playerImg: $("#player-img"),
  playerTitle: $("#player-title"),
  playerArtist: $("#player-artist"),
  audio: $("#audio"),
  playPauseBtn: $("#play-pause-btn"),
  prevBtn: $("#prev-btn"),
  nextBtn: $("#next-btn"),
  progressBar: $("#progress-bar"),
  currentTime: $("#current-time"),
  totalTime: $("#total-time"),
  closePlayer: $("#close-player"),
  expandPlayer: $("#expand-player"),

  fsImg: $("#fs-img"),
  fsTitle: $("#fs-title"),
  fsArtist: $("#fs-artist"),
  fsBg: $("#fullscreen-bg"),
  fsProgress: $("#fs-progress"),
  fsCurrent: $("#fs-current"),
  fsTotal: $("#fs-total"),
  fsPlayPause: $("#fs-play-pause"),
  fsPrev: $("#fs-prev"),
  fsNext: $("#fs-next"),
};

const S_KEY = "singularity-settings";
const P_KEY = "singularity-player";

function loadSettings() {
  try {
    const raw = localStorage.getItem(S_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveSettings(settings) {
  try {
    const existing = loadSettings();
    Object.assign(existing, settings);
    localStorage.setItem(S_KEY, JSON.stringify(existing));
  } catch {}
}

function savePlayerState() {
  const data = { hash: location.hash || "#/" };
  if (state.queue.length && state.queueIndex >= 0) {
    data.player = {
      allSongs: state.queue,
      queueIndex: state.queueIndex,
      currentTime: el.audio.currentTime || 0,
      playing: state.playing,
      title: el.playerTitle.textContent,
      artist: el.playerArtist.textContent,
      img: el.playerImg.src,
    };
  }
  try { localStorage.setItem(P_KEY, JSON.stringify(data)); } catch {}
}

function loadPlayerState() {
  try {
    const raw = localStorage.getItem(P_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

const savedPlayer = loadPlayerState();
if (savedPlayer.hash && savedPlayer.hash !== "#/") {
  const cur = location.hash || "#/";
  if (cur === "#/" || cur === "") {
    location.hash = savedPlayer.hash;
  }
}

function escapeHtml(v = "") {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtml(v = "") {
  const n = document.createElement("div");
  n.innerHTML = v;
  return n.textContent || n.innerText || "";
}

function getName(item) {
  return stripHtml(item?.name || item?.title || "Unknown");
}

function artistNames(item) {
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

function getSubtitle(item, fb = "Music") {
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

function imageUrl(item, pref = 2) {
  const img = item?.image;
  if (Array.isArray(img))
    return img[pref]?.url || img.at(-1)?.url || img[0]?.url || "";
  return img || "";
}

function audioUrl(song) {
  const urls = song?.downloadUrl;
  if (Array.isArray(urls))
    return (
      urls[state.qualityIndex]?.url || urls.at(-1)?.url || urls[0]?.url || ""
    );
  return song?.audioUrl || song?.media_url || "";
}

function fmtDur(seconds) {
  const raw = Number.parseInt(seconds, 10);
  if (!Number.isFinite(raw)) return "";
  const m = Math.floor(raw / 60);
  return `${m}:${String(raw % 60).padStart(2, "0")}`;
}

function fmtTime(s) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function normalizeItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.songs)) return data.songs;
  if (Array.isArray(data?.albums)) return data.albums;
  if (Array.isArray(data?.artists)) return data.artists;
  if (Array.isArray(data?.playlists)) return data.playlists;
  return [];
}

function setStatus(title, copy = "") {
  el.results.innerHTML = `<div class="status"><strong>${escapeHtml(title)}</strong>${escapeHtml(copy)}</div>`;
  el.detail.classList.add("hidden");
}

async function api(path) {
  const r = await fetch(`${state.baseUrl}${path}`);
  const j = await r.json();
  if (!r.ok || j.success === false)
    throw new Error(j.message || `Request failed with ${r.status}`);
  return j.data;
}

function setType(type) {
  state.type = type;
  $$(".cat-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.type === type),
  );
}

async function runSearch() {
  const q = el.input.value.trim();
  if (!q) {
    setStatus(
      "Start with a search",
      "Choose a category and search for songs, albums, artists, or playlists.",
    );
    return;
  }
  state.query = q;
  el.detail.classList.add("hidden");
  el.results.innerHTML =
    '<div class="status"><strong>Searching...</strong></div>';
  try {
    const data = await api(
      `/search/${state.type}?query=${encodeURIComponent(q)}&limit=${state.limit}`,
    );
    renderResults(state.type, normalizeItems(data), data?.total);
  } catch (err) {
    setStatus("Search failed", err.message);
  }
}

function renderResults(type, items, total = items.length) {
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

function renderCard(type, item, index) {
  const title = getName(item);
  const subtitle = getSubtitle(item, type.slice(0, -1));
  const img = imageUrl(item);
  const explicit = item.explicitContent
    ? '<span class="tag explicit-tag">Explicit</span>'
    : "";
  const playAction =
    type === "songs"
      ? `<button class="play-button" type="button" data-play="${index}">Play</button>`
      : `<button class="play-button" type="button" data-open="${type}" data-id="${escapeHtml(item.id)}">Open</button>`;
  const secondAction = item.url
    ? `<a class="pill-button" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Source</a>`
    : "";
  return `
    <article class="card">
      <img class="art" src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">
      <h3 class="clamp">${escapeHtml(title)}</h3>
      <p class="clamp">${escapeHtml(subtitle)}</p>
      <div class="card-actions">${playAction}${secondAction}${explicit}</div>
    </article>
  `;
}

async function openCollection(type, id) {
  if (!id) return;
  navigateTo(`#/${type}=${id}`);
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
    renderDetail(type, data);
  } catch (err) {
    el.detail.innerHTML = `<div class="status"><strong>Could not load</strong>${escapeHtml(err.message)}</div>`;
  }
}

function renderDetail(type, data) {
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
          ${data?.url ? `<a class="pill-button" href="${escapeHtml(data.url)}" target="_blank" rel="noreferrer">Open source</a>` : ""}
        </div>
      </div>
    </div>
    ${state.allSongs.length ? `<div class="song-list">${state.allSongs.map(renderSongRow).join("")}</div>` : ""}
    ${albums.length ? `<h2 style="margin-top:24px;font-size:1.1rem;">Albums</h2><div class="results" style="margin-top:12px;">${albums.map((a) => renderCard("albums", a, 0)).join("")}</div>` : ""}
  `;
}

function renderSongRow(song, index) {
  const title = getName(song);
  const artist = getSubtitle(song, "Artist");
  const duration = fmtDur(song.duration);
  const explicit = song.explicitContent
    ? '<span class="tag explicit-tag">Explicit</span>'
    : "";
  return `
    <article class="row-card">
      <span class="index">${index + 1}</span>
      <img src="${escapeHtml(imageUrl(song))}" alt="${escapeHtml(title)}" loading="lazy">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(artist)}</p>
      </div>
      <span class="duration">${duration}</span>
      <button class="play-button alb" type="button" data-play="${index}"><i class="bi bi-play-fill"></i></button>
      ${explicit}
    </article>
  `;
}

async function playSong(index) {
  let song = state.allSongs[index];
  if (!song) return;
  let src = audioUrl(song);
  if (!src && song.id) {
    try {
      const full = await api(`/songs?ids=${encodeURIComponent(song.id)}`);
      song = Array.isArray(full) ? full[0] : full;
      state.allSongs[index] = song;
      src = audioUrl(song);
    } catch {}
  }
  if (!src) {
    window.alert("No playable audio URL is available for this track.");
    return;
  }
  state.queue = state.allSongs;
  state.queueIndex = index;
  const title = getName(song);
  const artist = getSubtitle(song, "Artist");
  const img = imageUrl(song);
  el.playerImg.src = img;
  el.playerTitle.textContent = title;
  el.playerArtist.textContent = artist;
  el.audio.src = src;
  el.audio.play().catch(() => {});
  el.player.classList.add("open");
  state.playing = true;
  el.playPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
  syncFullscreen();
  savePlayerState();
}

function playAll() {
  if (state.allSongs.length) playSong(0);
}

function nextTrack(dir = 1) {
  if (!state.queue.length) return;
  const next = state.queueIndex + dir;
  if (next >= 0 && next < state.queue.length) playSong(next);
}

function togglePlay(sync = true) {
  if (el.audio.paused) {
    el.audio.play().catch(() => {});
    state.playing = true;
    el.playPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
  } else {
    el.audio.pause();
    state.playing = false;
    el.playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
  }
  if (sync) syncFullscreen();
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = Number.parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((x) => x + x)
          .join("")
      : clean,
    16,
  );
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function navigateTo(hash) {
  if (location.hash === hash) return;
  location.hash = hash;
}

function router() {
  const hash = location.hash || "#/";

  [el.mainView, el.settingsView, el.fullscreenView].forEach((v) => {
    if (v) v.classList.remove("active");
  });

  if (hash === "#/settings") {
    el.settingsView.classList.add("active");
    savePlayerState();
    return;
  }

  if (hash === "#/player") {
    el.fullscreenView.classList.add("active");
    syncFullscreen();
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

function syncFullscreen() {
  if (!el.fsImg) return;
  const src = el.playerImg.src;
  el.fsImg.src = src;
  el.fsTitle.textContent = el.playerTitle.textContent;
  el.fsArtist.textContent = el.playerArtist.textContent;
  if (el.fsBg) el.fsBg.style.backgroundImage = src ? `url(${src})` : "none";
  el.fsProgress.value = el.progressBar.value;
  el.fsProgress.max = el.progressBar.max;
  el.fsCurrent.textContent = el.currentTime.textContent;
  el.fsTotal.textContent = el.totalTime.textContent;
  el.fsPlayPause.innerHTML = state.playing
    ? '<i class="bi bi-pause-fill"></i>'
    : '<i class="bi bi-play-fill"></i>';
}

function bindSettings() {
  const root = document.documentElement;
  const body = document.body;
  const saved = loadSettings();

  const bindRange = (
    id,
    prop,
    suffix,
    outId,
    transform = (v) => v,
    format = (v, r) => `${v}${suffix}`,
  ) => {
    const input = $(`#${id}`);
    const output = $(`#${outId}`);
    const update = () => {
      const v = transform(input.value);
      root.style.setProperty(prop, `${v}${suffix}`);
      if (output) output.textContent = format(v, input.value);
      if (id === "limit-range") state.limit = Number(input.value);
    };
    input.addEventListener("input", update);
    if (saved[id]) input.value = saved[id];
    update();
  };

  const bindToggle = (id, cls) => {
    const input = $(`#${id}`);
    const update = () => {
      body.classList.toggle(cls, !input.checked);
      saveSettings({ [id]: input.checked });
    };
    input.addEventListener("change", update);
    if (saved[id] !== undefined) input.checked = saved[id];
    update();
  };

  bindRange("radius-range", "--radius", "px", "radius-output");
  bindRange("density-range", "--density", "px", "density-output");
  bindRange(
    "font-range",
    "--font-scale",
    "",
    "font-output",
    (v) => Number(v) / 100,
    (_v, r) => `${r}%`,
  );
  bindRange(
    "limit-range",
    "--unused-limit",
    "",
    "limit-output",
    (v) => v,
    (_v, r) => r,
  );

  $("#accent-color").addEventListener("input", (e) => {
    root.style.setProperty("--primary", e.target.value);
    root.style.setProperty("--primary-rgb", hexToRgb(e.target.value));
    saveSettings({ "accent-color": e.target.value });
  });
  if (saved["accent-color"]) $("#accent-color").value = saved["accent-color"];
  $("#accent-color").dispatchEvent(new Event("input"));

  $("#theme-mode").addEventListener("change", (e) => {
    body.dataset.theme = e.target.value;
    saveSettings({ "theme-mode": e.target.value });
  });
  if (saved["theme-mode"]) $("#theme-mode").value = saved["theme-mode"];
  $("#theme-mode").dispatchEvent(new Event("change"));

  $("#layout-style").addEventListener("change", (e) => {
    body.dataset.layout = e.target.value;
    saveSettings({ "layout-style": e.target.value });
  });
  if (saved["layout-style"]) $("#layout-style").value = saved["layout-style"];
  $("#layout-style").dispatchEvent(new Event("change"));

  $("#image-shape").addEventListener("change", (e) => {
    body.dataset.imageShape = e.target.value;
    saveSettings({ "image-shape": e.target.value });
  });
  if (saved["image-shape"]) $("#image-shape").value = saved["image-shape"];
  $("#image-shape").dispatchEvent(new Event("change"));

  $("#quality-select").addEventListener("change", (e) => {
    state.qualityIndex = Number(e.target.value);
    saveSettings({ "quality-select": e.target.value });
  });
  if (saved["quality-select"])
    $("#quality-select").value = saved["quality-select"];

  $("#api-base").addEventListener("change", (e) => {
    state.baseUrl = e.target.value.replace(/\/$/, "");
    saveSettings({ "api-base": e.target.value });
  });
  if (saved["api-base"]) $("#api-base").value = saved["api-base"];

  bindToggle("motion-toggle", "no-motion");
  bindToggle("explicit-toggle", "hide-explicit");
}

function bindEvents() {
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = el.input.value.trim();
    if (q) {
      navigateTo(
        `#/search=${encodeURIComponent(q).replace(/%20/g, "+")}/${state.type}`,
      );
    } else {
      setStatus(
        "Start with a search",
        "Choose a category and search for songs, albums, artists, or playlists.",
      );
    }
  });

  $$(".cat-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const type = b.dataset.type;
      if (state.query) {
        navigateTo(
          `#/search=${encodeURIComponent(state.query).replace(/%20/g, "+")}/${type}`,
        );
      } else {
        setType(type);
      }
    });
  });

  document.addEventListener("click", (e) => {
    const play = e.target.closest("[data-play]");
    const open = e.target.closest("[data-open]");
    if (play) playSong(Number(play.dataset.play));
    if (open)
      navigateTo(
        `#/${open.dataset.open}=${encodeURIComponent(open.dataset.id)}`,
      );
    if (e.target.closest("[data-play-all]")) playAll();
  });

  el.playPauseBtn.addEventListener("click", () => togglePlay());
  el.prevBtn.addEventListener("click", () => nextTrack(-1));
  el.nextBtn.addEventListener("click", () => nextTrack(1));
  el.closePlayer.addEventListener("click", () => {
    el.audio.pause();
    el.audio.removeAttribute("src");
    el.player.classList.remove("open");
    state.playing = false;
    state.queue = [];
    state.queueIndex = -1;
    el.playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
    syncFullscreen();
    if (location.hash === "#/player") navigateTo("#/");
    else savePlayerState();
  });

  el.expandPlayer.addEventListener("click", () => {
    if (el.player.classList.contains("open")) navigateTo("#/player");
  });

  el.fsPlayPause.addEventListener("click", () => togglePlay());
  el.fsPrev.addEventListener("click", () => nextTrack(-1));
  el.fsNext.addEventListener("click", () => nextTrack(1));

  el.fsProgress.addEventListener("input", () => {
    const seekTime = Number(el.fsProgress.value);
    el.audio.currentTime = seekTime;
    el.fsCurrent.textContent = fmtTime(seekTime);
    el.currentTime.textContent = fmtTime(seekTime);
    el.progressBar.value = seekTime;
  });

  el.audio.addEventListener("ended", () => nextTrack(1));

  el.audio.addEventListener("loadedmetadata", () => {
    el.totalTime.textContent = fmtTime(el.audio.duration);
    el.progressBar.max = Math.floor(el.audio.duration);
    el.fsProgress.max = Math.floor(el.audio.duration);
  });

  let saveThrottle = null;
  el.audio.addEventListener("timeupdate", () => {
    const t = el.audio.currentTime || 0;
    el.currentTime.textContent = fmtTime(t);
    el.progressBar.value = t;
    if (el.fsProgress) {
      el.fsCurrent.textContent = fmtTime(t);
      el.fsProgress.value = t;
    }
    if (!saveThrottle) {
      saveThrottle = setTimeout(() => {
        savePlayerState();
        saveThrottle = null;
      }, 5000);
    }
  });

  el.audio.addEventListener("play", () => {
    state.playing = true;
    el.playPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
    syncFullscreen();
  });

  el.audio.addEventListener("pause", () => {
    state.playing = false;
    el.playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
    syncFullscreen();
    if (saveThrottle) { clearTimeout(saveThrottle); saveThrottle = null; }
    savePlayerState();
  });

  el.progressBar.addEventListener("input", () => {
    const seekTime = Number(el.progressBar.value);
    el.audio.currentTime = seekTime;
    el.currentTime.textContent = fmtTime(seekTime);
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.code === "Space") {
      e.preventDefault();
      if (el.fullscreenView.classList.contains("active")) {
        togglePlay();
      } else if (el.player.classList.contains("open")) {
        togglePlay();
      }
    }
    if (e.code === "ArrowRight" && el.player.classList.contains("open"))
      nextTrack(1);
    if (e.code === "ArrowLeft" && el.player.classList.contains("open"))
      nextTrack(-1);
  });

  window.addEventListener("hashchange", router);
  router();
}

function restorePlayer(data) {
  if (!data || !data.allSongs || !data.allSongs.length) return;
  if (el.player.classList.contains("open")) return;
  state.queue = data.allSongs;
  state.queueIndex = data.queueIndex;
  state.allSongs = data.allSongs;
  el.playerImg.src = data.img || "";
  el.playerTitle.textContent = data.title || "Unknown";
  el.playerArtist.textContent = data.artist || "";
  el.player.classList.add("open");
  const song = data.allSongs[data.queueIndex];
  if (song) {
    const src = audioUrl(song);
    if (src) {
      el.audio.src = src;
      el.audio.currentTime = data.currentTime || 0;
      if (data.playing) el.audio.play().catch(() => {});
    }
  }
  syncFullscreen();
}

bindSettings();
bindEvents();
if (savedPlayer.player) {
  setTimeout(() => restorePlayer(savedPlayer.player), 600);
}
if (!state.query && el.detail.classList.contains("hidden")) {
  setStatus(
    "Start with a search",
    "Search for songs, albums, artists, or playlists.",
  );
}

;(function showNotice() {
  if (localStorage.getItem("notice-dismissed")) return;
  const banner = document.getElementById("notice-banner");
  const dismiss = document.getElementById("dismiss-notice");
  if (!banner || !dismiss) return;
  banner.classList.remove("hidden");
  dismiss.addEventListener("click", () => {
    banner.classList.add("hidden");
    localStorage.setItem("notice-dismissed", "1");
  });
})();
