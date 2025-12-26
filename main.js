console.log("TileInspector loaded (touch enabled)");

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
    draw();
  };
  image.src = URL.createObjectURL(file);
});

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
  canvas.style.cursor = "grabbing";
});

window.addEventListener("mouseup", () => {
  dragging = false;
  canvas.style.cursor = "grab";
});

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
    // One finger = pan
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }

  if (e.touches.length === 2) {
    // Two fingers = pinch
    lastTouchDistance = getTouchDistance(e.touches);
    lastTouchMidpoint = getTouchMidpoint(e.touches);
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();

  if (e.touches.length === 1 && lastTouchDistance === null) {
    // Pan
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

    const zoomFactor = newDistance / lastTouchDistance;
    scale *= zoomFactor;

    // Adjust offset so zoom happens around fingers
    offsetX += (newMidpoint.x - lastTouchMidpoint.x);
    offsetY += (newMidpoint.y - lastTouchMidpoint.y);

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

  // Draw tiled image
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.drawImage(img, x * w, y * h);
    }
  }

  if (showEdges) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;

    for (let t = 1; t < tiles; t++) {
      ctx.beginPath();
      ctx.moveTo(w * t, 0);
      ctx.lineTo(w * t, h * tiles);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, h * t);
      ctx.lineTo(w * tiles, h * t);
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
