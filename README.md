# CollageCraft

I wanted a collage maker that does not ask me to sign up, upload my photos
to someone's server, or wait for a render queue. So I built this one to run
entirely in the browser: you drop photos in, pick a grid, tweak the gap and
borders, and download a PNG. Nothing leaves your device.

## What it does

- Up to 16 photos, added by file picker, drag and drop, or paste.
- Grid layouts: Classic (adapts to your photo count), plus 1x1, 1x2, 2x1,
  1x3, 3x1, 2x2, 2x3, 3x2, 3x3 and 4x4. A fixed layout is disabled when it
  needs more cells than you have photos, so you never get a confusing
  half-empty grid by accident.
- Gap (0-40 px), border width (0-20 px) and colour, corner radius
  (0-60 px), background colour with presets.
- Canvas sizes: 1080x1080 square, 1080x1350 portrait, 1920x1080 landscape,
  1080x1920 story, or a custom size between 200 and 4000 px per side.
- Reorder by dragging a photo on the preview, or with Move up / Move down
  and Swap with controls in the photo list. Click a photo name to select
  it (it gets a red outline in the preview).
- Per-photo fit (cover or contain) and rotation in 90-degree steps.
- HD PNG export at the full canvas size, downloaded as
  `collagecraft-collage.png`.
- No uploads needed to try it: "Load sample photos" fills eight
  canvas-drawn scenes (sunset, ocean, forest, city, desert, neon grid,
  mountain lake, cherry blossom).

## How it is put together

Vanilla JavaScript ES modules, no build step, no CDN dependencies, no
images committed to the repo (the sample photos are drawn on a canvas at
runtime).

- `js/state.js` — pure state and layout math: photo list operations,
  grid cell geometry, classic-layout rules, fit math, preview scaling.
- `js/render.js` — `drawCollage`, the single function that draws a
  collage. The preview and the export both call it; the preview just
  runs it at a capped scale (long side at most 960 px) with gap, border
  and radius scaled by the same factor, while export runs it at full size.
- `js/main.js` — DOM wiring only. It never draws anything itself.

## Honest limitations

- This is a grid collage maker, not a freeform editor: you cannot drag
  photos to arbitrary positions or resize individual cells.
- Very large photos are drawn at full resolution by the browser, so a
  16-photo collage of huge files can feel slow on a weak device. I did
  not add downscaling because I did not want to quietly reduce export
  quality.
- HEIC photos will not open in most browsers, and that is a browser
  limitation, not something this page can fix.
- Paste works with images copied as image data; copying a file path or
  a web page image reference will not add a photo.
- The preview is a scaled render (see above), so at extreme zoom the
  preview may look slightly softer than the exported PNG. The export is
  always the full-size render.

## Privacy

Your photos are processed locally in your browser and never uploaded.
There is no server, no account, and no analytics in this page.
