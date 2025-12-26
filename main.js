console.log("TileInspector loaded — Lane 1 (contrast-aware magnitude, visible)");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ======================
// STATE
// ======================
let img = null;
let tiles = 3;
let showEdges = false;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

// Mouse pan
let dragging = false;
let lastX = 0;
let lastY = 0;

// Touch state
let lastTouchDistance = null;
let lastTouchMidpoint = null;

// Cached image analysis
let seamColor = { r: 255, g: 255, b: 255 };

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
// IMAGE LOAD
// ======================
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const image = new Image();
  image.onload = () => {
    img = image;
    scale = 1;
    offsetX = 0;
    offsetY = 0;

    analyseImageBrightness();
    draw();
  };
  image.src = URL.createObjectURL(file);
});

// ======================
// IMAGE ANALYSIS
// ======================
function analyseImageBrightness() {
  const temp = document.createElement("canvas");
  temp.width = img.width;
  temp.height = img.height;
  const tctx = temp.getContext("2d");
  tctx.drawImage(img, 0, 0);

  const data = tctx.getImageData(0, 0, img.width, img.height).data;

  let totalLuminance = 0;
  const pixelCount = img.width * img.height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const avg = totalLuminance / pixelCount;

  if (avg < 128) {
    seamColor = { r: 230, g: 230, b: 230 }; // soft white
  } else {
    seamColor = { r: 220, g: 30, b: 30 }; // red
  }
}

// ======================
// UI CONTROLS
// ======================
document.querySelectorAll("button[data-tiles]").forEach(btn => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("button[data-tiles]")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    tiles = Number(btn.dataset.tiles);
    draw();
  });
});

document.getElementById("edgeToggle").addEventListener("click", () => {
  showEdges = !showEdges;
  draw();
});

// ======================
// MOUSE ZOOM + PAN
// ======================
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  scale *= e.deltaY < 0 ? 1.1 : 0.9;
  draw();
});

canvas.addEventListener("mousedown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

window.addEventListener("mouseup", () => dragging = false);

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  offsetX += e.clientX - lastX;
  offsetY += e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  draw();
});

// ======================
// TOUCH PAN + PINCH ZOOM
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
    offsetX += x - lastX;
    offsetY += y - lastY;
    lastX = x;
    lastY = y;
    draw();
  }

  if (e.touches.length === 2) {
    const newDistance = getTouchDistance(e.touches);
    const newMidpoint = getTouchMidpoint(e.touches);

    scale *= newDistance / lastTouchDistance;

    offsetX += newMidpoint.x - lastTouchMidpoint.x;
    offsetY += newMidpoint.y - lastTouchMidpoint.y;

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
// DRAW
// ======================
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!img) return;

  const w = img.width;
  const h = img.height;

  const totalW = w * tiles;
  const totalH = h * tiles;

  const startX = (canvas.width - totalW * scale) / 2 + offsetX;
  const startY = (canvas.height - totalH * scale) / 2 + offsetY;

  ctx.translate(startX, startY);
  ctx.scale(scale, scale);

  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.drawImage(img, x * w, y * h);
    }
  }

  if (showEdges) {
    drawEdgeMagnitude(w, h);
  }
}

// ======================
// EDGE MAGNITUDE — ALWAYS VISIBLE
// ======================
function drawEdgeMagnitude(w, h) {
  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  tctx.drawImage(img, 0, 0);

  const data = tctx.getImageData(0, 0, w, h).data;
  ctx.lineWidth = 4;

  const MIN_ALPHA = 0.15; // <-- critical fix

  // Vertical seams
  for (let y = 0; y < h; y++) {
    const iL = (y * w) * 4;
    const iR = (y * w + (w - 1)) * 4;

    const diff =
      Math.abs(data[iL] - data[iR]) +
      Math.abs(data[iL + 1] - data[iR + 1]) +
      Math.abs(data[iL + 2] - data[iR + 2]);

    const alpha = Math.max(MIN_ALPHA, Math.min(diff / 200, 1));

    ctx.strokeStyle = `rgba(${seamColor.r}, ${seamColor.g}, ${seamColor.b}, ${alpha})`;

    for (let t = 1; t < tiles; t++) {
      ctx.beginPath();
      ctx.moveTo(w * t, y);
      ctx.lineTo(w * t, y + 1);
      ctx.stroke();
    }
  }

  // Horizontal seams
  for (let x = 0; x < w; x++) {
    const iT = x * 4;
    const iB = ((h - 1) * w + x) * 4;

    const diff =
      Math.abs(data[iT] - data[iB]) +
      Math.abs(data[iT + 1] - data[iB + 1]) +
      Math.abs(data[iT + 2] - data[iB + 2]);

    const alpha = Math.max(MIN_ALPHA, Math.min(diff / 200, 1));

    ctx.strokeStyle = `rgba(${seamColor.r}, ${seamColor.g}, ${seamColor.b}, ${alpha})`;

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
