/* CollageCraft DOM wiring only. This file contains no drawing logic:
   every pixel goes through drawCollage / drawSampleScene in render.js,
   and every layout or list rule lives in state.js. */
import {
  MAX_PHOTOS, LAYOUTS, SIZE_PRESETS, createState, canvasSize, layoutGrid,
  canUseLayout, addPhoto, removePhoto, clearPhotos, movePhoto, swapPhotos,
  clampGap, clampBorder, clampRadius, clampInt, cellAtPoint,
  previewScale, scaledSettings,
} from './state.js';
import { drawCollage, drawSampleScene, SAMPLE_SCENES } from './render.js';

const $ = (id) => document.getElementById(id);
const state = createState();
const sources = new Map(); // photo id -> image-like source (canvas or Image)
let nextId = 1;
let dragFrom = -1;

function selectedIndex() {
  return state.photos.findIndex((p) => p.id === state.selectedId);
}

function currentSources() {
  return state.photos.map((p) => sources.get(p.id) || null);
}

function drawPreview() {
  const canvas = $('previewCanvas');
  const size = canvasSize(state);
  const scale = previewScale(size.width, size.height);
  const scaled = scaledSettings(state, scale);
  canvas.width = Math.max(1, Math.round(size.width * scale));
  canvas.height = Math.max(1, Math.round(size.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawCollage(ctx, {
    photos: state.photos, sources: currentSources(), layout: state.layout,
    gap: scaled.gap, borderWidth: scaled.borderWidth, borderColor: state.borderColor,
    radius: scaled.radius, bg: state.bg, width: canvas.width, height: canvas.height,
    selectedIndex: selectedIndex(),
  });
}

function updateLayoutPicker() {
  const picker = $('layoutPicker');
  picker.querySelectorAll('button[data-layout]').forEach((btn) => {
    const key = btn.dataset.layout;
    btn.classList.toggle('active', key === state.layout);
    btn.disabled = !canUseLayout(key, state.photos.length);
    btn.title = btn.disabled
      ? `${LAYOUTS[key].label} needs ${LAYOUTS[key].cells} photos`
      : LAYOUTS[key].label;
  });
}

function renderPhotoList() {
  const list = $('photoList');
  list.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'photo-item' + (photo.id === state.selectedId ? ' selected' : '');
    item.dataset.photoId = photo.id;

    const label = document.createElement('button');
    label.className = 'photo-label';
    label.type = 'button';
    label.textContent = `${index + 1}. ${photo.name}`;
    label.addEventListener('click', () => { state.selectedId = photo.id; renderAll(); });

    const fit = document.createElement('select');
    fit.className = 'fitSelect';
    fit.setAttribute('aria-label', `Fit for photo ${index + 1}`);
    for (const value of ['cover', 'contain']) {
      const opt = document.createElement('option');
      opt.value = value; opt.textContent = value === 'cover' ? 'Cover' : 'Contain';
      if (photo.fit === value) opt.selected = true;
      fit.appendChild(opt);
    }
    fit.addEventListener('change', () => { photo.fit = fit.value; renderAll(); });

    const rotate = document.createElement('button');
    rotate.className = 'rotateBtn'; rotate.type = 'button';
    rotate.textContent = `Rotate ${photo.rotation}°`;
    rotate.addEventListener('click', () => {
      photo.rotation = (photo.rotation + 90) % 360; renderAll();
    });

    const up = document.createElement('button');
    up.className = 'moveUp'; up.type = 'button'; up.textContent = 'Move up';
    up.disabled = index === 0;
    up.addEventListener('click', () => { state.photos = movePhoto(state.photos, index, index - 1); renderAll(); });

    const down = document.createElement('button');
    down.className = 'moveDown'; down.type = 'button'; down.textContent = 'Move down';
    down.disabled = index === state.photos.length - 1;
    down.addEventListener('click', () => { state.photos = movePhoto(state.photos, index, index + 1); renderAll(); });

    const swap = document.createElement('select');
    swap.className = 'swapSelect';
    swap.setAttribute('aria-label', `Swap photo ${index + 1} with`);
    const placeholder = document.createElement('option');
    placeholder.value = ''; placeholder.textContent = 'Swap with…';
    swap.appendChild(placeholder);
    state.photos.forEach((other, otherIndex) => {
      if (otherIndex === index) return;
      const opt = document.createElement('option');
      opt.value = String(otherIndex); opt.textContent = `Swap with photo ${otherIndex + 1}`;
      swap.appendChild(opt);
    });
    swap.addEventListener('change', () => {
      if (swap.value === '') return;
      state.photos = swapPhotos(state.photos, index, Number(swap.value)); renderAll();
    });

    const remove = document.createElement('button');
    remove.className = 'removeBtn'; remove.type = 'button'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      state.photos = removePhoto(state.photos, photo.id);
      sources.delete(photo.id);
      if (state.selectedId === photo.id) state.selectedId = null;
      renderAll();
    });

    item.append(label, fit, rotate, up, down, swap, remove);
    list.appendChild(item);
  });
  $('emptyNote').hidden = state.photos.length > 0;
}

function renderAll() {
  const size = canvasSize(state);
  const grid = layoutGrid(state.layout, state.photos.length);
  $('photoCountText').textContent = `${state.photos.length}/${MAX_PHOTOS} photos`;
  $('gridSizeText').textContent = `${grid.rows} x ${grid.cols} grid`;
  $('exportSizeText').textContent = `${size.width} x ${size.height} PNG`;
  $('gapValue').textContent = `${state.gap} px`;
  $('borderValue').textContent = `${state.borderWidth} px`;
  $('radiusValue').textContent = `${state.radius} px`;
  $('customSizeRow').hidden = state.sizePreset !== 'custom';
  $('exportBtn').disabled = state.photos.length === 0;
  if (state.photos.length === 0) {
    $('statusText').textContent = 'Add photos to start your collage.';
  } else if (state.selectedId) {
    const sel = state.photos.find((p) => p.id === state.selectedId);
    $('statusText').textContent = sel
      ? `${state.photos.length} photos in a ${grid.rows} x ${grid.cols} collage. Selected: ${sel.name}. Drag a photo on the preview to reorder it.`
      : `${state.photos.length} photos in a ${grid.rows} x ${grid.cols} collage.`;
  } else {
    $('statusText').textContent = `${state.photos.length} photos in a ${grid.rows} x ${grid.cols} collage. Click a photo in the list to select it, or drag a photo on the preview to reorder it.`;
  }
  updateLayoutPicker();
  renderPhotoList();
  drawPreview();
}

function buildLayoutPicker() {
  const picker = $('layoutPicker');
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.layout = key;
    btn.textContent = layout.cells ? `${layout.label} (${layout.cells} cells)` : layout.label;
    btn.addEventListener('click', () => { state.layout = key; renderAll(); });
    picker.appendChild(btn);
  });
}

function addPhotoWithSource(name, source) {
  if (state.photos.length >= MAX_PHOTOS) {
    $('statusText').textContent = `Collage is full at ${MAX_PHOTOS} photos. Remove one first.`;
    return;
  }
  const id = `p${nextId}`;
  nextId += 1;
  const photo = { id, name, fit: 'cover', rotation: 0 };
  state.photos = addPhoto(state.photos, photo);
  sources.set(id, source);
  state.selectedId = id;
  renderAll();
}

function loadSamplePhotos() {
  let added = 0;
  SAMPLE_SCENES.forEach((scene, i) => {
    if (state.photos.length >= MAX_PHOTOS) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) drawSampleScene(ctx, 800, 600, i);
    addPhotoWithSource(`${scene} (sample)`, canvas);
    added += 1;
  });
  if (added === 0) $('statusText').textContent = `Collage is full at ${MAX_PHOTOS} photos. Remove one first.`;
}

function handleFiles(fileList) {
  const files = [...fileList].filter((f) => f.type && f.type.startsWith('image/'));
  if (files.length === 0) { $('statusText').textContent = 'No image files found. Choose image files to add them.'; return; }
  files.forEach((file) => {
    if (state.photos.length >= MAX_PHOTOS) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => addPhotoWithSource(file.name, img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function previewCellFromEvent(event) {
  const canvas = $('previewCanvas');
  const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: canvas.width, height: canvas.height };
  const width = rect.width || canvas.width;
  const height = rect.height || canvas.height;
  const x = ((event.clientX - rect.left) / width) * canvas.width;
  const y = ((event.clientY - rect.top) / height) * canvas.height;
  const size = canvasSize(state);
  const scale = previewScale(size.width, size.height);
  const scaled = scaledSettings(state, scale);
  return cellAtPoint(state.layout, state.photos.length, canvas.width, canvas.height, scaled.gap, x, y);
}

function exportCollage() {
  if (state.photos.length === 0) return;
  const size = canvasSize(state);
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // Same single render function as the preview, at full export size.
  drawCollage(ctx, {
    photos: state.photos, sources: currentSources(), layout: state.layout,
    gap: state.gap, borderWidth: state.borderWidth, borderColor: state.borderColor,
    radius: state.radius, bg: state.bg, width: size.width, height: size.height,
    selectedIndex: -1,
  });
  const download = (url) => {
    const a = document.createElement('a');
    a.href = url; a.download = 'collagecraft-collage.png';
    document.body.appendChild(a); a.click(); a.remove();
  };
  if (canvas.toBlob) {
    canvas.toBlob((blob) => {
      if (!blob) { download(canvas.toDataURL('image/png')); return; }
      const url = URL.createObjectURL(blob);
      download(url);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  } else {
    download(canvas.toDataURL('image/png'));
  }
  $('statusText').textContent = `Exported ${size.width} x ${size.height} PNG.`;
}

function init() {
  buildLayoutPicker();
  Object.entries(SIZE_PRESETS).forEach(([key, preset]) => {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = preset.label;
    if (key === 'square') opt.selected = true;
    $('sizePreset').appendChild(opt);
  });

  $('addBtn').addEventListener('click', () => $('photoInput').click());
  $('dropZone').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', () => { handleFiles($('photoInput').files); $('photoInput').value = ''; });
  $('sampleBtn').addEventListener('click', loadSamplePhotos);
  $('clearBtn').addEventListener('click', () => {
    state.photos = clearPhotos(); sources.clear(); state.selectedId = null; renderAll();
  });
  $('exportBtn').addEventListener('click', exportCollage);

  $('dropZone').addEventListener('dragover', (e) => { e.preventDefault(); $('dropZone').classList.add('dragging'); });
  $('dropZone').addEventListener('dragleave', () => $('dropZone').classList.remove('dragging'));
  $('dropZone').addEventListener('drop', (e) => {
    e.preventDefault(); $('dropZone').classList.remove('dragging');
    handleFiles(e.dataTransfer ? e.dataTransfer.files : []);
  });
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData ? [...e.clipboardData.items] : [];
    const images = items.filter((item) => item.type && item.type.startsWith('image/')).map((item) => item.getAsFile()).filter(Boolean);
    if (images.length) { e.preventDefault(); handleFiles(images); }
  });

  $('gapRange').addEventListener('input', () => { state.gap = clampGap($('gapRange').value); renderAll(); });
  $('borderRange').addEventListener('input', () => { state.borderWidth = clampBorder($('borderRange').value); renderAll(); });
  $('borderColor').addEventListener('input', () => { state.borderColor = $('borderColor').value; renderAll(); });
  $('radiusRange').addEventListener('input', () => { state.radius = clampRadius($('radiusRange').value); renderAll(); });
  $('bgColor').addEventListener('input', () => { state.bg = $('bgColor').value; renderAll(); });
  $('bgPresets').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-bg]');
    if (!btn) return;
    state.bg = btn.dataset.bg; $('bgColor').value = state.bg; renderAll();
  });
  $('sizePreset').addEventListener('change', () => { state.sizePreset = $('sizePreset').value; renderAll(); });
  $('customWidth').addEventListener('input', () => { state.customWidth = clampInt($('customWidth').value, 200, 4000); renderAll(); });
  $('customHeight').addEventListener('input', () => { state.customHeight = clampInt($('customHeight').value, 200, 4000); renderAll(); });

  $('previewCanvas').addEventListener('pointerdown', (e) => { dragFrom = previewCellFromEvent(e); });
  $('previewCanvas').addEventListener('pointerup', (e) => {
    if (dragFrom < 0) return;
    const to = previewCellFromEvent(e);
    const from = dragFrom; dragFrom = -1;
    if (to >= 0 && to < state.photos.length && to !== from && from < state.photos.length) {
      state.photos = movePhoto(state.photos, from, to);
    } else if (to >= 0 && to < state.photos.length) {
      state.selectedId = state.photos[to].id;
    }
    renderAll();
  });

  renderAll();
}

init();
