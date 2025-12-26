const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let img = null;
let tiles = 3;
let showEdges = false;

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  draw();
}
window.addEventListener("resize", resize);
resize();

// Image import
document.getElementById("fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const image = new Image();
  image.onload = () => {
    img = image;
    scale = 1;
    offsetX = offsetY = 0;
    draw();
  };
  image.src = URL.createObjectURL(file);
});

// Tile buttons
document.querySelectorAll("button[data-tiles]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("button[data-tiles]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    tiles = Number(btn.dataset.tiles);
    draw();
  };
});

// Edge toggle
document.getElementById("edgeToggle").onclick = () => {
  showEdges = !showEdges;
  draw();
};

// Zoom
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const zoom = e.deltaY < 0 ? 1.1 : 0.9;
  scale *= zoom;
  draw();
});

// Pan
canvas.addEventListener("mousedown", e => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
window.addEventListener("mouseup", () => dragging = false);
window.addEventListener("mousemove", e => {
  if (!dragging) return;
  offsetX += e.clientX - lastX;
  offsetY += e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  draw();
});

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!img) return;

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  const w = img.width;
  const h = img.height;

  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.drawImage(img, x * w, y * h);
    }
  }

  if (showEdges) drawEdgeMismatch(w, h);
}

function drawEdgeMismatch(w, h) {
  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  tctx.drawImage(img, 0, 0);

  const data = tctx.getImageData(0, 0, w, h).data;
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;

  // Left vs Right
  for (let y = 0; y < h; y++) {
    const iL = (y * w) * 4;
    const iR = (y * w + (w - 1)) * 4;
    if (
      data[iL] !== data[iR] ||
      data[iL + 1] !== data[iR + 1] ||
      data[iL + 2] !== data[iR + 2]
    ) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w * tiles, y);
      ctx.stroke();
      break;
    }
  }

  // Top vs Bottom
  for (let x = 0; x < w; x++) {
    const iT = x * 4;
    const iB = ((h - 1) * w + x) * 4;
    if (
      data[iT] !== data[iB] ||
      data[iT + 1] !== data[iB + 1] ||
      data[iT + 2] !== data[iB + 2]
    ) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h * tiles);
      ctx.stroke();
      break;
    }
  }
}
