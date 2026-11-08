// All image work happens in the browser. Nothing is uploaded.

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

const load = (file) => createImageBitmap(file, { imageOrientation: 'from-image' });
const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));

function draw(bmp, w, h, fit) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  const scale = fit === 'pad' ? Math.min(w / bmp.width, h / bmp.height) : Math.max(w / bmp.width, h / bmp.height);
  const dw = bmp.width * scale, dh = bmp.height * scale;
  ctx.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return c;
}

async function smallest(canvas, type, maxBytes) {
  if (type === 'image/png') return toBlob(canvas, type);
  if (!maxBytes) return toBlob(canvas, type, 0.92);
  let lo = 0.05, hi = 0.95;
  let best = await toBlob(canvas, type, lo);
  if (best.size > maxBytes) return best; // cannot fit at this size
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const b = await toBlob(canvas, type, mid);
    if (b.size <= maxBytes) { best = b; lo = mid; } else { hi = mid; }
  }
  return best;
}

export async function processImage(file, o) {
  const bmp = await load(file);
  const type = o.format || 'image/jpeg';
  const maxBytes = o.maxKB ? o.maxKB * 1024 : 0;
  let w = o.width, h = o.height;
  if (w && !h) h = Math.round((bmp.height * w) / bmp.width);
  else if (h && !w) w = Math.round((bmp.width * h) / bmp.height);
  else if (!w && !h) { w = bmp.width; h = bmp.height; }
  const fixed = !!(o.width && o.height);
  let blob;
  for (let i = 0; i < 15; i++) {
    blob = await smallest(draw(bmp, w, h, o.fit), type, maxBytes);
    if (!maxBytes || blob.size <= maxBytes || fixed) break;
    w = Math.round(w * 0.85); h = Math.round(h * 0.85); // shrink only when pixels are not fixed
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
