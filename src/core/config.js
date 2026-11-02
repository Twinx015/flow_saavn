/* App-wide constants. */

export const S_KEY = "singularity-settings";
export const P_KEY = "singularity-player";
export const DEFAULT_ACCENT = "#6366f1";

/* Selectable music API backends. Trailing slashes are normalised when used. */
export const API_OPTIONS = [
  {
    value: "https://saavn-api.twinx.workers.dev/api/",
    label: "TwinX Saavn API",
  },
  {
    value: "https://teenapi.dino.icu/api",
    label: "TeenAPI",
  },
];

export const DEFAULT_API_BASE = API_OPTIONS[0].value.replace(/\/+$/, "");
export const FALLBACK_ART = "./logo.svg";
