console.log("TileInspector — Lane 2.1 (Photo Preview) loaded");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const legend = document.getElementById("legend");
const edgeBtn = document.getElementById("edgeToggle");
const resetBtn = document.getElementById("resetView");
const photoBtn = document.getElementById("photoToggle");

const PHOTO_SRC = "assets/photos/donuts_overlap.jpg";
const MASK_SRC  = "assets/masks/donuts_overlap_mask.png";

// Mask colour definitions (exact)
const COLOR_BOTTOM = { r: 0,   g: 255, b: 0   }; // Green
const COLOR_TOP    = { r: 0,   g: 0,   b: 255 }; // Blue

// Deterministic per-donut offset (prevents “same texture on both” look)
const TOP_DONUT_OFFSET = { x: 0.37, y: 0.61 }; // fractions of texture size

// ======================
// STATE
// ======================
let textureImg = null;

let tiles = 3;
let showEdges = false;
let showPhotoPreview = false;

// Texture transform (shared)
let texScale = 1;
let texOffsetX = 0;
let texOffsetY = 0;

// Mouse state
let dragging = false;
let lastX = 0;
let lastY = 0;

// Touch state
let lastTouchDistance = null;
let lastTouchMidpoint = null;

// Seam colour (Lane 1)
let seamColor = { r: 230, g: 230, b: 230 };

// Photo + mask assets
let photoImg = null;
let maskImg = null;
let photoReady = false;
let maskReady = false;

// Mask canvases derived from colour mask
let maskBottomCanvas = null;
let maskTopCanvas = null;

// ======================
// CANVAS SIZE
// ======================
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  draw();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ======================
// LOAD PHOTO + MASK (Lane 2.1)
// ======================
function loadPhotoAndMask() {
  photoImg = new Image();
  photoImg.onload = () => { photoReady = true; buildMasksIfReady(); draw(); };
  photoImg.src = PHOTO_SRC;

  maskImg = new Image();
  maskImg.onload = () => { maskReady = true; buildMasksIfReady(); draw(); };
  maskImg.src = MASK_SRC;
}

function buildMasksIfReady() {
  if (!photoReady || !maskReady) return;

  // Build colour-split alpha masks from the provided label map
  const w = maskImg.width;
  const h = maskImg.height;

  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");
  tctx.drawImage(maskImg, 0, 0);

  const imgData = tctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  maskBottomCanvas = document.createElement("canvas");
  maskTopCanvas = document.createElement("canvas");
  maskBottomCanvas.width = w; maskBottomCanvas.height = h;
  maskTopCanvas.width = w; maskTopCanvas.height = h;

  const bctx = maskBottomCanvas.getContext("2d");
  const tctx2 = maskTopCanvas.getContext("2d");

  const bottom = bctx.createImageData(w, h);
  const top = tctx2.createImageData(w, h);

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];

    // Green-ish = bottom donut
const isBottom =
  g > 180 && r < 100 && b < 100;

// Blue-ish = top donut
const isTop =
  b > 180 && r < 100 && g < 100;


    // Bottom mask = white w/ alpha
    bottom.data[i]   = 255;
    bottom.data[i+1] = 255;
    bottom.data[i+2] = 255;
    bottom.data[i+3] = isBottom ? 255 : 0;

    // Top mask = white w/ alpha
    top.data[i]   = 255;
    top.data[i+1] = 255;
    top.data[i+2] = 255;
    top.data[i+3] = isTop ? 255 : 0;
  }

  bctx.putImageData(bottom, 0, 0);
  tctx2.putImageData(top, 0, 0);
}

// ======================
// TEXTURE LOAD
// ======================
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const image = new Image();
  image.onload = () => {
    textureImg = image;
    resetView();
    analyseTextureBrightness();
    draw();
  };
  image.src = URL.createObjectURL(file);
});

// ======================
// BRIGHTNESS → seam colour
// ======================
function analyseTextureBrightness() {
  if (!textureImg) return;

  const temp = document.createElement("canvas");
  temp.width = textureImg.width;
  temp.height = textureImg.height;
  const tctx = temp.getContext("2d");
  tctx.drawImage(textureImg, 0, 0);

  const data = tctx.getImageData(0, 0, textureImg.width, textureImg.height).data;
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    total += 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
  }

  const avg = total / (textureImg.width * textureImg.height);
  seamColor = avg < 128 ? { r: 230, g: 230, b: 230 } : { r: 220, g: 30, b: 30 };
}

// ======================
// UI CONTROLS
// ======================
document.querySelectorAll("button[data-tiles]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("button[data-tiles]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    tiles = Number(btn.dataset.tiles);
    draw();
  });
});

edgeBtn.addEventListener("click", () => {
  showEdges = !showEdges;
  edgeBtn.classList.toggle("active", showEdges);
  draw();
});

photoBtn.addEventListener("click", () => {
  showPhotoPreview = !showPhotoPreview;
  photoBtn.classList.toggle("active", showPhotoPreview);

  // Lazy-load photo/mask only when first needed
  if (showPhotoPreview && (!photoImg || !maskImg)) {
    loadPhotoAndMask();
  }
  draw();
});

resetBtn.addEventListener("click", resetView);

function resetView() {
  texScale = 1;
  texOffsetX = 0;
  texOffsetY = 0;
  draw();
}

// ======================
// KEYBOARD SHORTCUTS
// ======================
window.addEventListener("keydown", (e) => {
  const tag = e.target.tagName;
  const isTyping =
    tag === "TEXTAREA" ||
    (tag === "INPUT" && e.target.type === "text") ||
    e.target.isContentEditable;

  if (isTyping) return;

  switch (e.key) {
    case "r":
    case "R":
      resetView();
      break;

    case "e":
    case "E":
      edgeBtn.click();
      break;

    case "p":
    case "P":
      photoBtn.click();
      break;

    case "1":
      document.querySelector('[data-tiles="1"]').click();
      break;

    case "2":
      document.querySelector('[data-tiles="2"]').click();
      break;

    case "3":
      document.querySelector('[data-tiles="3"]').click();
      break;
  }
});

// ======================
// MOUSE ZOOM + PAN (texture)
// ======================
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  texScale *= e.deltaY < 0 ? 1.1 : 0.9;
  draw();
});

canvas.addEventListener("mousedown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.style.cursor = "grabbing";
});

window.addEventListener("mouseup", () => {
  dragging = false;
  canvas.style.cursor = "grab";
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  texOffsetX += e.clientX - lastX;
  texOffsetY += e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  draw();
});

// ======================
// TOUCH PAN + PINCH ZOOM (texture)
// ======================
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();

  if (e.touches.length === 1) {
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }

  if (e.touches.length === 2) {
    lastTouchDistance = getTouchDistance(e.touches);
    lastTouchMidpoint = getTouchMidpoint(e.touches);
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();

  if (e.touches.length === 1 && lastTouchDistance === null) {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    texOffsetX += x - lastX;
    texOffsetY += y - lastY;
    lastX = x;
    lastY = y;
    draw();
  }

  if (e.touches.length === 2) {
    const newDistance = getTouchDistance(e.touches);
    const newMidpoint = getTouchMidpoint(e.touches);

    texScale *= newDistance / lastTouchDistance;
    texOffsetX += newMidpoint.x - lastTouchMidpoint.x;
    texOffsetY += newMidpoint.y - lastTouchMidpoint.y;

    lastTouchDistance = newDistance;
    lastTouchMidpoint = newMidpoint;
    draw();
  }
}, { passive: false });

canvas.addEventListener("touchend", () => {
  lastTouchDistance = null;
  lastTouchMidpoint = null;
});

// ======================
// DRAW ENTRY
// ======================
function draw() {
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if (!textureImg) return;

  if (showPhotoPreview) {
    drawPhotoPreview();
  } else {
    drawTileView();
  }
}

// ======================
// TILE VIEW (existing behaviour)
// ======================
function drawTileView() {
  const w = textureImg.width;
  const h = textureImg.height;

  const totalW = w * tiles * texScale;
  const totalH = h * tiles * texScale;

  const startX = (canvas.width - totalW) / 2 + texOffsetX;
  const startY = (canvas.height - totalH) / 2 + texOffsetY;

  ctx.translate(startX, startY);
  ctx.scale(texScale, texScale);

  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.drawImage(textureImg, x*w, y*h);
    }
  }

  if (showEdges) drawEdgeMagnitude(w, h);
}

// ======================
// PHOTO PREVIEW (Lane 2.1)
// ======================
function drawPhotoPreview() {
  if (!photoReady || !maskReady || !maskBottomCanvas || !maskTopCanvas) {
    // show a tiny hint that assets are loading, but keep it minimal (no animation)
    ctx.fillStyle = "#999";
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Loading photo preview assets…", 16, 28);
    return;
  }

  // Fit photo into canvas (contain)
  const pw = photoImg.width;
  const ph = photoImg.height;

  const scaleFit = Math.min(canvas.width / pw, canvas.height / ph);
  const drawW = pw * scaleFit;
  const drawH = ph * scaleFit;
  const dx = (canvas.width - drawW) / 2;
  const dy = (canvas.height - drawH) / 2;

  // 1) draw base photo
  ctx.drawImage(photoImg, dx, dy, drawW, drawH);

  // 2) build textured layer in photo pixel space (offscreen at native photo size)
  const texBase = buildTexturedLayer(pw, ph, 0, 0);

  // 3) bottom donut (green)
  const bottomLayer = applyMask(texBase, maskBottomCanvas);

  // 4) top donut (blue) with deterministic offset
  const extraX = textureImg.width  * TOP_DONUT_OFFSET.x;
  const extraY = textureImg.height * TOP_DONUT_OFFSET.y;
  const texTop = buildTexturedLayer(pw, ph, extraX, extraY);
  const topLayer = applyMask(texTop, maskTopCanvas);

  // 5) composite onto photo
  ctx.drawImage(bottomLayer, dx, dy, drawW, drawH);
  ctx.drawImage(topLayer,    dx, dy, drawW, drawH);
}

// Draw tiled texture into an offscreen canvas, sized to photo pixels
function buildTexturedLayer(w, h, extraOffsetX, extraOffsetY) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const cctx = c.getContext("2d");

  // We want texOffsetX/Y to move texture in screen space.
  // Convert screen offsets into photo pixel offsets using fit scale.
  // Easiest: treat texOffsetX/Y as photo-space pixels by scaling by inverse fit at draw time.
  // Since we rebuild at native photo size, we map screen offsets proportionally to photo space using canvas size ratio.
  // Simple + stable: interpret offsets as canvas pixels, convert to photo pixels by multiplying by (w / canvas.width).
  const sx = w / canvas.width;
  const sy = h / canvas.height;

  const ox = (texOffsetX * sx) + extraOffsetX;
  const oy = (texOffsetY * sy) + extraOffsetY;

  // Draw repeating pattern to cover the whole photo
  const pattern = cctx.createPattern(textureImg, "repeat");

  // Apply transforms: scale + offset (rotation can come later)
  cctx.setTransform(texScale, 0, 0, texScale, ox, oy);
  cctx.fillStyle = pattern;
  // Large fill rect so repeat covers even under transforms
  cctx.fillRect(-w*2, -h*2, w*5, h*5);

  // reset
  cctx.setTransform(1,0,0,1,0,0);

  return c;
}

// Mask a layer using destination-in
function applyMask(layerCanvas, maskCanvas) {
  const out = document.createElement("canvas");
  out.width = layerCanvas.width;
  out.height = layerCanvas.height;
  const octx = out.getContext("2d");

  octx.drawImage(layerCanvas, 0, 0);
  octx.globalCompositeOperation = "destination-in";
  octx.drawImage(maskCanvas, 0, 0);
  octx.globalCompositeOperation = "source-over";

  return out;
}

// ======================
// EDGE MAGNITUDE (Lane 1)
// ======================
function drawEdgeMagnitude(w, h) {
  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  tctx.drawImage(textureImg, 0, 0);

  const data = tctx.getImageData(0, 0, w, h).data;
  ctx.lineWidth = 4;
  const MIN_ALPHA = 0.15;

  for (let y = 0; y < h; y++) {
    const iL = (y * w) * 4;
    const iR = (y * w + (w - 1)) * 4;

    const diff =
      Math.abs(data[iL] - data[iR]) +
      Math.abs(data[iL+1] - data[iR+1]) +
      Math.abs(data[iL+2] - data[iR+2]);

    const alpha = Math.max(MIN_ALPHA, Math.min(diff / 200, 1));
    ctx.strokeStyle = `rgba(${seamColor.r},${seamColor.g},${seamColor.b},${alpha})`;

    for (let t = 1; t < tiles; t++) {
      ctx.beginPath();
      ctx.moveTo(w * t, y);
      ctx.lineTo(w * t, y + 1);
      ctx.stroke();
    }
  }

  for (let x = 0; x < w; x++) {
    const iT = x * 4;
    const iB = ((h - 1) * w + x) * 4;

    const diff =
      Math.abs(data[iT] - data[iB]) +
      Math.abs(data[iT+1] - data[iB+1]) +
      Math.abs(data[iT+2] - data[iB+2]);

    const alpha = Math.max(MIN_ALPHA, Math.min(diff / 200, 1));
    ctx.strokeStyle = `rgba(${seamColor.r},${seamColor.g},${seamColor.b},${alpha})`;

    for (let t = 1; t < tiles; t++) {
      ctx.beginPath();
      ctx.moveTo(x, h * t);
      ctx.lineTo(x + 1, h * t);
      ctx.stroke();
    }
  }
}

// ======================
// TOUCH HELPERS
// ======================
function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function getTouchMidpoint(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  };
}
