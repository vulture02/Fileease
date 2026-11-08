// All image work happens in the browser. Nothing is uploaded.
import { removeBackground } from '@imgly/background-removal';

export function parseRules(text) {
  const s = text.toLowerCase();
  const out = {};
  const px = s.match(/(\d{2,5})\s*(?:x|×|by)\s*(\d{2,5})/);
  if (px) { out.width = +px[1]; out.height = +px[2]; }
  const mult = (u) => (u === 'mb' ? 1024 : 1);
  const range = s.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(kb|mb)/);
  if (range) {
    out.minKB = +range[1] * mult(range[3]);
    out.maxKB = +range[2] * mult(range[3]);
  } else {
    const m = s.match(/(?:under|below|max(?:imum)?|less than|up to|upto|<=?)\s*(\d+(?:\.\d+)?)\s*(kb|mb)/)
      || s.match(/(\d+(?:\.\d+)?)\s*(kb|mb)/);
    if (m) out.maxKB = +m[1] * mult(m[2]);
  }
  if (/png/.test(s)) out.format = 'image/png';
  else if (/webp/.test(s)) out.format = 'image/webp';
  else if (/jpe?g/.test(s)) out.format = 'image/jpeg';
  return out;
}

export const EXAM_PRESETS = [
  { label: '-- Select an exam or portal preset --', value: '' },
  { label: 'UPSC CSE - Photo (350 × 350 px, 20-300 KB, JPG)', rules: { width: 350, height: 350, minKB: 20, maxKB: 300, format: 'image/jpeg', fit: 'crop' } },
  { label: 'UPSC CSE - Signature (350 × 350 px, 20-300 KB, JPG)', rules: { width: 350, height: 350, minKB: 20, maxKB: 300, format: 'image/jpeg', fit: 'pad' } },
  { label: 'SSC CGL / CHSL - Photo (100 × 120 px, 20-50 KB, JPG)', rules: { width: 100, height: 120, minKB: 20, maxKB: 50, format: 'image/jpeg', fit: 'crop' } },
  { label: 'SSC CGL / CHSL - Signature (140 × 60 px, 10-20 KB, JPG)', rules: { width: 140, height: 60, minKB: 10, maxKB: 20, format: 'image/jpeg', fit: 'pad' } },
  { label: 'NEET / JEE - Photo (140 × 180 px, 10-200 KB, JPG)', rules: { width: 140, height: 180, minKB: 10, maxKB: 200, format: 'image/jpeg', fit: 'crop' } },
  { label: 'NEET / JEE - Signature (140 × 60 px, 4-30 KB, JPG)', rules: { width: 140, height: 60, minKB: 4, maxKB: 30, format: 'image/jpeg', fit: 'pad' } },
  { label: 'PAN Card - Photo (213 × 213 px, under 50 KB, JPG)', rules: { width: 213, height: 213, minKB: 5, maxKB: 50, format: 'image/jpeg', fit: 'crop' } },
  { label: 'PAN Card - Signature (400 × 200 px, under 20 KB, JPG)', rules: { width: 400, height: 200, minKB: 2, maxKB: 20, format: 'image/jpeg', fit: 'pad' } },
  { label: 'GATE Exam - Photo (480 × 640 px, 50-200 KB, JPG)', rules: { width: 480, height: 640, minKB: 50, maxKB: 200, format: 'image/jpeg', fit: 'crop' } },
  { label: 'US Visa / OCI (600 × 600 px / 2x2 in, under 240 KB, JPG)', rules: { width: 600, height: 600, minKB: 20, maxKB: 240, format: 'image/jpeg', fit: 'crop' } },
  { label: 'Passport Photo 3.5 × 4.5 cm (413 × 531 px @ 300DPI, JPG)', rules: { width: 413, height: 531, minKB: 30, maxKB: 100, format: 'image/jpeg', fit: 'crop' } },
];

export const load = (file) => createImageBitmap(file, { imageOrientation: 'from-image' });
const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));

// Neural AI Person Isolation + Solid White Background
export async function cutPersonAndWhiten(fileSource, onProgress) {
  try {
    const transparentBlob = await removeBackground(fileSource, {
      progress: (key, current, total) => {
        if (onProgress && total > 0) {
          onProgress(Math.round((current / total) * 100));
        }
      },
    });
    const bmp = await createImageBitmap(transparentBlob);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0);
    return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.96));
  } catch (err) {
    console.warn('AI background removal fallback:', err);
    return null;
  }
}

// Fallback boundary scan if offline
function isSubject(r, g, b, x, y, w, h) {
  const isSkin = (r > 65 && g > 32 && b > 16 && (r - g) > 8 && r > b && (Math.max(r, g, b) - Math.min(r, g, b) > 10));
  if (isSkin) return true;
  const inHeadZone = (x > w * 0.22 && x < w * 0.78 && y < h * 0.65);
  if (inHeadZone && (r < 55 && g < 55 && b < 55)) return true;
  const inTorsoZone = (x > w * 0.18 && x < w * 0.82 && y > h * 0.45);
  if (inTorsoZone) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 235) return true;
  }
  return false;
}

function fallbackWhiten(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < Math.round(w * 0.5); x++) {
      const i = (y * w + x) * 4;
      if (isSubject(d[i], d[i + 1], d[i + 2], x, y, w, h)) break;
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
    }
    for (let x = w - 1; x >= Math.round(w * 0.5); x--) {
      const i = (y * w + x) * 4;
      if (isSubject(d[i], d[i + 1], d[i + 2], x, y, w, h)) break;
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < Math.round(h * 0.65); y++) {
      const i = (y * w + x) * 4;
      if (isSubject(d[i], d[i + 1], d[i + 2], x, y, w, h)) break;
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function applyFilters(ctx, w, h, filter) {
  if (!filter || filter === 'none') return;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  if (filter === 'bw-signature') {
    // Signature cleaner: adaptive luminance thresholding
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 165) {
        d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
      } else {
        d[i] = Math.max(0, r - 50);
        d[i + 1] = Math.max(0, g - 50);
        d[i + 2] = Math.max(0, b - 30);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (filter === 'whiten-bg') {
    fallbackWhiten(ctx, w, h);
  } else if (filter === 'grayscale') {
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = lum; d[i + 1] = lum; d[i + 2] = lum;
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (filter === 'contrast') {
    const factor = (259 * (128 + 45)) / (255 * (259 - 45));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
      d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128));
      d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128));
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

function draw(bmp, w, h, fit, crop, filter) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
  if (crop && crop.w > 0 && crop.h > 0) {
    sx = Math.round(crop.x * bmp.width);
    sy = Math.round(crop.y * bmp.height);
    sw = Math.round(crop.w * bmp.width);
    sh = Math.round(crop.h * bmp.height);
  }

  const scale = fit === 'pad' ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(bmp, sx, sy, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
  applyFilters(ctx, w, h, filter);
  return c;
}

async function smallest(canvas, type, maxBytes) {
  if (type === 'image/png') return toBlob(canvas, type);
  if (!maxBytes) return toBlob(canvas, type, 0.92);
  let lo = 0.05, hi = 0.95;
  let best = await toBlob(canvas, type, lo);
  if (best.size > maxBytes) return best;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const b = await toBlob(canvas, type, mid);
    if (b.size <= maxBytes) { best = b; lo = mid; } else { hi = mid; }
  }
  return best;
}

export async function processImage(file, o, onProgress) {
  let source = file;

  // AI Person Isolation: Cuts out the person and fills the rest with solid white
  if (o.filter === 'whiten-bg') {
    const aiWhitened = await cutPersonAndWhiten(file, onProgress);
    if (aiWhitened) {
      source = aiWhitened;
    }
  }

  const bmp = await load(source);
  const type = o.format || 'image/jpeg';
  const maxBytes = o.maxKB ? o.maxKB * 1024 : 0;
  let w = o.width, h = o.height;

  let sw = bmp.width, sh = bmp.height;
  if (o.crop && o.crop.w > 0 && o.crop.h > 0) {
    sw = Math.round(o.crop.w * bmp.width);
    sh = Math.round(o.crop.h * bmp.height);
  }

  if (w && !h) h = Math.round((sh * w) / sw);
  else if (h && !w) w = Math.round((sw * h) / sh);
  else if (!w && !h) { w = sw; h = sh; }

  const fixed = !!(o.width && o.height);
  let blob;
  for (let i = 0; i < 15; i++) {
    blob = await smallest(draw(bmp, w, h, o.fit, o.crop, o.filter === 'whiten-bg' ? 'none' : o.filter), type, maxBytes);
    if (!maxBytes || blob.size <= maxBytes || fixed) break;
    w = Math.round(w * 0.85); h = Math.round(h * 0.85);
  }
  return { blob, width: w, height: h };
}

export function validate({ blob, width, height }, o) {
  const kb = blob.size / 1024;
  const rows = [];
  rows.push({ label: 'Format', ok: !o.format || blob.type === o.format, detail: blob.type.replace('image/', '').toUpperCase() });
  const sizeOk = (!o.maxKB || kb <= o.maxKB) && (!o.minKB || kb >= o.minKB);
  rows.push({ label: 'File size', ok: sizeOk, detail: kb.toFixed(1) + ' KB' });
  if (o.width || o.height) {
    const ok = (!o.width || width === o.width) && (!o.height || height === o.height);
    rows.push({ label: 'Pixels', ok, detail: width + ' x ' + height });
  }
  return rows;
}
