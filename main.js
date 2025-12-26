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

let dragging = false;
let lastX = 0;
let lastY = 0;

// ======================
// CANVAS SETUP
// ======================
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  draw();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ======================
// IMAGE IMPORT
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
document.querySelectorAll("button[data-tiles]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("button[data-tiles]")
      .forEach((b) => b.classList.remove("active"));

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
// ZOOM + PAN
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
// DRAW
// ======================
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!img) return;

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  const w = img.width;
  const h = img.height;

  // Draw tiled image
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.drawImage(img, x * w, y * h);
    }
  }

  if (showEdges) {
    drawEdgeBoundaries(w, h);
  }
}

// ======================
// EDGE MAGNITUDE (BOUNDARIES ONLY)
// ======================
function drawEdgeBoundaries(w, h) {
  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  tctx.drawImage(img, 0, 0);

  const data = tctx.getImageData(0, 0, w, h).data;
  ctx.lineWidth = 2;

  // Vertical seams (left ↔ right)
  for (let y = 0; y < h; y++) {
    const iL = (y * w) * 4;
    const iR = (y * w + (w - 1)) * 4;

    const diff =
      Math.abs(data[iL] - data[iR]) +
      Math.abs(data[iL + 1] - data[iR + 1]) +
      Math.abs(data[iL + 2] - data[iR + 2]);

    const intensity = Math.min(diff / 3, 255);
    ctx.strokeStyle = `rgb(${intensity}, 0, 0)`;

    for (let t = 1; t < tiles; t++) {
      ctx.beginPath();
      ctx.moveTo(w * t, y);
      ctx.lineTo(w * t, y + 1);
      ctx.stroke();
    }
  }

  // Horizontal seams (top ↔ bottom)
  for (let x = 0; x < w; x++) {
    const iT = x * 4;
    const iB = ((h - 1) * w + x) * 4;

    const diff =
      Math.abs(data[iT] - data[iB]) +
      Math.abs(data[iT + 1] - data[iB + 1]) +
      Math.abs(data[iT + 2] - data[iB + 2]);

    const intensity = Math.min(diff / 3, 255);
    ctx.strokeStyle = `rgb(${intensity}, 0, 0)`;

    for (let t = 1; t < tiles; t++) {
      ctx.beginPath();
      ctx.moveTo(x, h
