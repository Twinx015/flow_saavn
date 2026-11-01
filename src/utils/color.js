/* Colour extraction and manipulation for the artwork-driven player theme. */

import { DEFAULT_ACCENT } from "../core/config.js";
import { clamp } from "./format.js";

export function normalizeHex(value) {
  let clean = String(value || "")
    .trim()
    .replace(/^#/, "");
  if (clean.length === 3)
    clean = clean
      .split("")
      .map((x) => x + x)
      .join("");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return DEFAULT_ACCENT;
  return `#${clean.toLowerCase()}`;
}

export function hexToRgbTuple(value) {
  const clean = normalizeHex(value).slice(1);
  const num = Number.parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function hexToRgb(value) {
  return hexToRgbTuple(value).join(", ");
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, s, l];
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToHex(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  let r;
  let g;
  let b;
  if (!s) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }
  const toHex = (v) =>
    Math.round(clamp(v, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function harmonizeAccent(value) {
  const [r, g, b] = hexToRgbTuple(value);
  const [h, s, l] = rgbToHsl(r, g, b);
  const dark = document.body.dataset.theme !== "light";
  const lightness = dark ? clamp(l, 0.58, 0.72) : clamp(l, 0.36, 0.47);
  const saturation = clamp(s, 0.38, 0.9);
  return hslToHex(h, saturation, lightness);
}

export function contrastInk(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.42 ? "#141418" : "#ffffff";
}

const accentCache = new Map();

export function extractAccent(src) {
  if (!src) return Promise.resolve(null);
  if (accentCache.has(src)) return Promise.resolve(accentCache.get(src));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const size = 44;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const pixels = ctx.getImageData(0, 0, size, size).data;
        const buckets = new Map();

        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 200) continue;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const [, s, l] = rgbToHsl(r, g, b);
          if (l < 0.13 || l > 0.93 || s < 0.12) continue;
          const key = `${r >> 4},${g >> 4},${b >> 4}`;
          let bucket = buckets.get(key);
          if (!bucket) {
            bucket = { r: 0, g: 0, b: 0, n: 0 };
            buckets.set(key, bucket);
          }
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
          bucket.n += 1;
        }

        let best = null;
        let bestScore = 0;
        for (const bucket of buckets.values()) {
          const r = bucket.r / bucket.n;
          const g = bucket.g / bucket.n;
          const b = bucket.b / bucket.n;
          const [, s, l] = rgbToHsl(r, g, b);
          const score =
            Math.pow(bucket.n, 0.55) *
            Math.pow(s, 1.35) *
            (1 - Math.abs(l - 0.54) * 1.1);
          if (score > bestScore) {
            bestScore = score;
            best = hslToHex(...rgbToHsl(r, g, b));
          }
        }

        accentCache.set(src, best);
        resolve(best);
      } catch {
        accentCache.set(src, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      accentCache.set(src, null);
      resolve(null);
    };
    img.src = src;
  });
}
