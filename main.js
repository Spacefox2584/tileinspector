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
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  scale *= zoomFactor;
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
// MAIN DRAW LOOP
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
    drawEdgeMagnitude(w, h);
  }
}

// ======================
// EDGE MAGNITUDE INSPECTION (v0.2)
// ======================
function drawEdgeMagnitude(w, h) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tctx = tempCanvas.getContext("2d");
  tctx.drawImage(img, 0, 0);

  const imageData = tctx.getImageData(0, 0, w, h).data;

  ctx.lineWidth = 1;

  // LEFT ↔ RIGHT EDGE
  for (let y = 0; y < h; y++) {
    const leftIndex = (y * w) * 4;
    const rightIndex = (y * w + (w - 1)) * 4;

    const diff =
      Math.abs(imageData[leftIndex] - imageData[rightIndex]) +
      Math.abs(imageData[leftIndex + 1] - imageData[rightIndex + 1]) +
      Math.abs(imageData[leftIndex + 2] - imageData[rightIndex + 2]);

    const intensity = Math.min(diff / 3, 255);
    ctx.strokeStyle = `rgb(${intensity}, 0, 0)`;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w * tiles, y);
    ctx.stroke();
  }

  // TOP ↔ BOTTOM EDGE
  for (let x = 0; x < w; x++) {
    const topIndex = x * 4;
    const bottomIndex = ((h - 1) * w + x) * 4;

    const diff =
      Math.abs(imageData[topIndex] - imageData[bottomIndex]) +
      Math.abs(imageData[topIndex + 1] - imageData[bottomIndex + 1]) +
      Math.abs(imageData[topIndex + 2] - imageData[bottomIndex + 2]);

    const intensity = Math.min(diff / 3, 255);
    ctx.strokeStyle = `rgb(${intensity}, 0, 0)`;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h * tiles);
    ctx.stroke();
  }
}
