import { DEFAULT_API_BASE } from "./config.js";

/* Single shared application state. Import it wherever you need to read/write. */
export const state = {
  baseUrl: DEFAULT_API_BASE,
  type: "songs",
  query: "",
  limit: 24,
  qualityIndex: 4,
  allSongs: [],
  queue: [],
  queueIndex: -1,
  currentSong: null,
  currentArtist: "Search and play a track",
  duration: 0,
  playing: false,
  shuffle: false,
  repeat: "off",
  seeking: false,
  artAccent: null,
  artSrc: "",
  queueOpen: false,
  expanded: false,
  loadToken: 0,
  accentToken: 0,
};
