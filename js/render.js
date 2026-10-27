/* CollageCraft renderer — the ONLY draw function in the app.
   drawCollage(ctx, opts) renders the whole collage: background, every
   photo clipped to its rounded cell, and the cell borders. main.js
   calls it for BOTH the on-screen preview and the PNG export; the only
   difference is the size/settings passed in (see previewScale in
   state.js — preview is the same layout at a capped scale, export is
   full size). Nothing else in the app draws a collage.

   opts: { photos, sources, layout, gap, borderWidth, borderColor,
           radius, bg, width, height }
   - photos: state photo objects in display order.
   - sources: image-like objects aligned with photos (each has width
     and height, plus drawImage support: HTMLImageElement, HTMLCanvasElement).
   - A photo with no usable source is skipped; its cell stays background.
   - radius is clamped to half the smaller cell side, so a large radius
     on a small cell can never invert the path. */

import { layoutCells, fitSize } from './state.js';

export function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function sourceSize(src) {
  const w = src.naturalWidth || src.width || 0;
  const h = src.naturalHeight || src.height || 0;
  return { w, h };
}

export function drawCollage(ctx, opts) {
  const { photos, sources, layout, gap, borderWidth, borderColor, radius, bg, width, height } = opts;
  ctx.save();
  ctx.fillStyle = bg || '#121218';
  ctx.fillRect(0, 0, width, height);
  const cells = layoutCells(layout, photos.length, width, height, gap);
  cells.forEach((cell, i) => {
    const photo = photos[i];
    const src = sources[i];
    if (!photo || !src) return; // empty cell: background shows through
    const { w: srcW, h: srcH } = sourceSize(src);
    if (!srcW || !srcH) return;
    const rotated = photo.rotation === 90 || photo.rotation === 270;
    const fitW = rotated ? cell.height : cell.width;
    const fitH = rotated ? cell.width : cell.height;
    const fitted = fitSize(srcW, srcH, fitW, fitH, photo.fit || 'cover');
    ctx.save();
    roundRectPath(ctx, cell.x, cell.y, cell.width, cell.height, radius || 0);
    ctx.clip();
    ctx.translate(cell.x + cell.width / 2, cell.y + cell.height / 2);
    if (photo.rotation) ctx.rotate((photo.rotation * Math.PI) / 180);
    ctx.drawImage(src, 0, 0, srcW, srcH, -fitted.width / 2, -fitted.height / 2, fitted.width, fitted.height);
    ctx.restore();
    if (borderWidth > 0) {
      ctx.save();
      ctx.strokeStyle = borderColor || '#ffffff';
      ctx.lineWidth = borderWidth;
      roundRectPath(
        ctx,
        cell.x + borderWidth / 2, cell.y + borderWidth / 2,
        cell.width - borderWidth, cell.height - borderWidth,
        Math.max(0, (radius || 0) - borderWidth / 2),
      );
      ctx.stroke();
      ctx.restore();
    }
    if (opts.selectedIndex === i) {
      ctx.save();
      ctx.strokeStyle = '#E5484D';
      ctx.lineWidth = Math.max(3, borderWidth);
      roundRectPath(ctx, cell.x + 2, cell.y + 2, cell.width - 4, cell.height - 4, radius || 0);
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();
}

/* Canvas-drawn sample scenes, so the tool works with zero uploads.
   Each scene fills the canvas and draws a few flat shapes plus a label
   word, so scenes stay distinguishable even at small cell sizes. */
export const SAMPLE_SCENES = [
  'Sunset hills', 'Ocean waves', 'Forest pines', 'City skyline',
  'Desert dunes', 'Neon grid', 'Mountain lake', 'Cherry blossom',
];

export function drawSampleScene(ctx, w, h, index) {
  const scene = SAMPLE_SCENES[index % SAMPLE_SCENES.length];
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (scene === 'Sunset hills') {
    grad.addColorStop(0, '#E5484D'); grad.addColorStop(1, '#F5A623');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.3, h * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2B1B2E'; ctx.beginPath(); ctx.moveTo(0, h * 0.7); ctx.lineTo(w * 0.3, h * 0.4); ctx.lineTo(w * 0.6, h * 0.7); ctx.lineTo(w * 0.85, h * 0.45); ctx.lineTo(w, h * 0.7); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  } else if (scene === 'Ocean waves') {
    grad.addColorStop(0, '#1D6FB8'); grad.addColorStop(1, '#0B2A4A');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7FC4E8';
    for (let i = 0; i < 4; i += 1) { ctx.beginPath(); ctx.arc(w * (0.15 + i * 0.25), h * (0.55 + (i % 2) * 0.15), h * 0.12, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(w * 0.85, h * 0.18, h * 0.1, 0, Math.PI * 2); ctx.fill();
  } else if (scene === 'Forest pines') {
    grad.addColorStop(0, '#123524'); grad.addColorStop(1, '#2E7D4F');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1E5C38';
    for (let i = 0; i < 5; i += 1) {
      const x = w * (0.12 + i * 0.19);
      ctx.beginPath(); ctx.moveTo(x, h * 0.25); ctx.lineTo(x - w * 0.08, h * 0.75); ctx.lineTo(x + w * 0.08, h * 0.75); ctx.fill();
    }
    ctx.fillStyle = '#8B5E3C'; ctx.fillRect(0, h * 0.75, w, h * 0.25);
  } else if (scene === 'City skyline') {
    grad.addColorStop(0, '#0B0B0F'); grad.addColorStop(1, '#3A3A4A');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#E5484D';
    for (let i = 0; i < 6; i += 1) { ctx.fillRect(w * (0.05 + i * 0.16), h * (0.35 + (i % 3) * 0.12), w * 0.11, h * 0.65); }
    ctx.fillStyle = '#F5E27A';
    for (let i = 0; i < 12; i += 1) { ctx.fillRect(w * (0.08 + (i % 6) * 0.16), h * (0.42 + Math.floor(i / 6) * 0.18), w * 0.02, h * 0.03); }
  } else if (scene === 'Desert dunes') {
    grad.addColorStop(0, '#E8B25A'); grad.addColorStop(1, '#C47A2B');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(w * 0.2, h * 0.2, h * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#A85F1F'; ctx.beginPath(); ctx.moveTo(0, h * 0.65); ctx.quadraticCurveTo(w * 0.5, h * 0.4, w, h * 0.65); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  } else if (scene === 'Neon grid') {
    ctx.fillStyle = '#0B0B0F'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#E5484D'; ctx.lineWidth = 3;
    for (let i = 1; i < 6; i += 1) { ctx.beginPath(); ctx.moveTo(0, (h / 6) * i); ctx.lineTo(w, (h / 6) * i); ctx.stroke(); ctx.beginPath(); ctx.moveTo((w / 6) * i, 0); ctx.lineTo((w / 6) * i, h); ctx.stroke(); }
    ctx.fillStyle = '#E5484D'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, h * 0.16, 0, Math.PI * 2); ctx.fill();
  } else if (scene === 'Mountain lake') {
    grad.addColorStop(0, '#7FA8C9'); grad.addColorStop(1, '#E8F0F5');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3A4A5A'; ctx.beginPath(); ctx.moveTo(0, h * 0.55); ctx.lineTo(w * 0.25, h * 0.15); ctx.lineTo(w * 0.5, h * 0.55); ctx.lineTo(w * 0.75, h * 0.2); ctx.lineTo(w, h * 0.55); ctx.lineTo(w, h * 0.55); ctx.fill();
    ctx.fillStyle = '#2E6B8A'; ctx.fillRect(0, h * 0.55, w, h * 0.45);
  } else {
    grad.addColorStop(0, '#F5C6D6'); grad.addColorStop(1, '#FFF5F7');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7A3B4A'; ctx.fillRect(w * 0.48, h * 0.4, w * 0.04, h * 0.6);
    ctx.fillStyle = '#E5484D';
    for (let i = 0; i < 6; i += 1) { ctx.beginPath(); ctx.arc(w * (0.2 + (i % 3) * 0.3), h * (0.25 + Math.floor(i / 3) * 0.2), h * 0.09, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(11, 11, 15, 0.72)';
  ctx.fillRect(0, h - h * 0.14, w, h * 0.14);
  ctx.fillStyle = '#F5F5F7';
  ctx.font = `600 ${Math.round(h * 0.07)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(scene.toUpperCase(), w / 2, h - h * 0.07);
}
