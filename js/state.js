/* CollageCraft pure state + layout math. No DOM, no canvas here, so
   Node can import this file directly and assert every rule below. */

export const MAX_PHOTOS = 16;
export const MIN_PHOTOS = 2;

export const SIZE_PRESETS = {
  square: { label: 'Square 1080 x 1080', width: 1080, height: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', width: 1080, height: 1350 },
  landscape: { label: 'Landscape 1920 x 1080', width: 1920, height: 1080 },
  story: { label: 'Story 1080 x 1920', width: 1080, height: 1920 },
  custom: { label: 'Custom size', width: 1080, height: 1080 },
};

/* key -> { label, rows, cols, cells }. 'classic' adapts to photo count. */
export const LAYOUTS = {
  classic: { label: 'Classic (auto)', rows: 0, cols: 0, cells: 0 },
  '1x1': { label: '1 x 1', rows: 1, cols: 1, cells: 1 },
  '1x2': { label: '1 x 2', rows: 1, cols: 2, cells: 2 },
  '2x1': { label: '2 x 1', rows: 2, cols: 1, cells: 2 },
  '1x3': { label: '1 x 3', rows: 1, cols: 3, cells: 3 },
  '3x1': { label: '3 x 1', rows: 3, cols: 1, cells: 3 },
  '2x2': { label: '2 x 2', rows: 2, cols: 2, cells: 4 },
  '2x3': { label: '2 x 3', rows: 2, cols: 3, cells: 6 },
  '3x2': { label: '3 x 2', rows: 3, cols: 2, cells: 6 },
  '3x3': { label: '3 x 3', rows: 3, cols: 3, cells: 9 },
  '4x4': { label: '4 x 4', rows: 4, cols: 4, cells: 16 },
};

export function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function clampGap(gap) { return clampInt(gap, 0, 40); }
export function clampBorder(width) { return clampInt(width, 0, 20); }
export function clampRadius(radius) { return clampInt(radius, 0, 60); }

export function createState() {
  return {
    photos: [], // [{ id, name, fit: 'cover'|'contain', rotation: 0|90|180|270 }]
    layout: 'classic',
    gap: 12,
    borderWidth: 4,
    borderColor: '#ffffff',
    radius: 16,
    bg: '#121218',
    sizePreset: 'square',
    customWidth: 1080,
    customHeight: 1080,
    selectedId: null,
  };
}

export function canvasSize(state) {
  if (state.sizePreset === 'custom') {
    return {
      width: clampInt(state.customWidth, 200, 4000),
      height: clampInt(state.customHeight, 200, 4000),
    };
  }
  const preset = SIZE_PRESETS[state.sizePreset] || SIZE_PRESETS.square;
  return { width: preset.width, height: preset.height };
}

/* Classic layout adapts to photo count; never more cells than needed
   for 16, and never a half-empty grid larger than the next size up. */
export function classicGrid(count) {
  if (count <= 1) return { rows: 1, cols: 1 };
  if (count === 2) return { rows: 1, cols: 2 };
  if (count <= 4) return { rows: 2, cols: 2 };
  if (count <= 6) return { rows: 2, cols: 3 };
  if (count <= 9) return { rows: 3, cols: 3 };
  if (count <= 12) return { rows: 3, cols: 4 };
  return { rows: 4, cols: 4 };
}

export function layoutGrid(layoutKey, count) {
  if (layoutKey === 'classic') return classicGrid(count);
  const layout = LAYOUTS[layoutKey] || LAYOUTS.classic;
  if (!layout.rows) return classicGrid(count);
  return { rows: layout.rows, cols: layout.cols };
}

/* A fixed layout is usable only when it has no more cells than photos.
   Classic is always usable because it adapts. Empty cells in a usable
   grid are still drawn as background by the renderer. */
export function canUseLayout(layoutKey, count) {
  if (layoutKey === 'classic') return true;
  const layout = LAYOUTS[layoutKey];
  if (!layout) return false;
  return layout.cells <= count;
}

/* Cell geometry for a grid. Cells tile the canvas with `gap` between
   them (no outer margin: the gap only separates neighbouring cells).
   Returns one rect per grid cell, in row-major order. */
export function layoutCells(layoutKey, count, width, height, gap) {
  const { rows, cols } = layoutGrid(layoutKey, count);
  const g = clampGap(gap);
  const cellW = (width - g * (cols - 1)) / cols;
  const cellH = (height - g * (rows - 1)) / rows;
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({
        index: r * cols + c,
        row: r, col: c,
        x: c * (cellW + g), y: r * (cellH + g),
        width: cellW, height: cellH,
      });
    }
  }
  return cells;
}

/* Which cell contains point (x, y) in a canvas of width x height?
   Returns -1 outside the grid. Used by preview drag-to-reorder. */
export function cellAtPoint(layoutKey, count, width, height, gap, x, y) {
  const cells = layoutCells(layoutKey, count, width, height, gap);
  for (const cell of cells) {
    if (x >= cell.x && x < cell.x + cell.width && y >= cell.y && y < cell.y + cell.height) {
      return cell.index;
    }
  }
  return -1;
}

/* Pure photo-list operations. Each returns a NEW array; callers keep
   the state object itself, so a bad index is always a no-op, never a
   crash or a silently dropped photo. */
export function addPhoto(photos, photo) {
  if (photos.length >= MAX_PHOTOS) return photos;
  return [...photos, photo];
}
export function removePhoto(photos, id) {
  return photos.filter((p) => p.id !== id);
}
export function clearPhotos() { return []; }
export function movePhoto(photos, from, to) {
  if (from < 0 || from >= photos.length || to < 0 || to >= photos.length || from === to) return photos;
  const next = [...photos];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
export function swapPhotos(photos, a, b) {
  if (a < 0 || a >= photos.length || b < 0 || b >= photos.length || a === b) return photos;
  const next = [...photos];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/* Fit math: size an image of srcW x srcH inside cellW x cellH.
   cover fills the cell (edges crop), contain fits inside it. */
export function fitSize(srcW, srcH, cellW, cellH, fit) {
  if (!srcW || !srcH || !cellW || !cellH) return { width: cellW, height: cellH };
  const scale = fit === 'contain'
    ? Math.min(cellW / srcW, cellH / srcH)
    : Math.max(cellW / srcW, cellH / srcH);
  return { width: srcW * scale, height: srcH * scale };
}

/* Preview scale: the preview canvas is capped at 960 px on its long
   side so the page stays fast; export always uses the full canvas
   size. Both go through drawCollage with gap/border/radius scaled by
   the same factor, so preview and export geometry match. */
export function previewScale(width, height) {
  const longest = Math.max(width, height);
  return longest <= 960 ? 1 : 960 / longest;
}
export function scaledSettings(state, scale) {
  return {
    gap: Math.round(state.gap * scale),
    borderWidth: Math.round(state.borderWidth * scale),
    radius: Math.round(state.radius * scale),
  };
}
