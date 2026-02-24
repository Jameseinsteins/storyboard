/* ─────────────────────────────────────────────────────────
   pixelwater.js  –  Pixel-art ripple background
   Grid of colored pixels that ripple like water on hover
───────────────────────────────────────────────────────── */

(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'pixel-water-canvas';
  document.body.insertBefore(canvas, document.body.firstChild);
  const ctx = canvas.getContext('2d');

  // ── Config ──────────────────────────────────────────────
  const PIXEL = 22;           // pixel grid cell size
  const RIPPLE_RADIUS = 120;  // cursor influence radius (px)
  const RIPPLE_STRENGTH = 3.0;
  const DAMPING = 0.92;
  const SPREAD = 0.22;

  // Dark deep-sea palette
  const BASE_COLORS = [
    [8,  14, 30],   // very dark navy
    [10, 18, 38],
    [12, 20, 42],
    [9,  16, 34],
    [7,  13, 28],
  ];
  const RIPPLE_COLOR = [59, 130, 246]; // blue highlight

  let cols, rows;
  let wave, prevWave;       // height maps
  let baseColor;            // per-cell base RGB

  let mouseX = -9999;
  let mouseY = -9999;
  let animFrame;

  // ── Init ────────────────────────────────────────────────
  function init() {
    cols = Math.ceil(window.innerWidth  / PIXEL) + 2;
    rows = Math.ceil(window.innerHeight / PIXEL) + 2;
    canvas.width  = cols * PIXEL;
    canvas.height = rows * PIXEL;
    canvas.style.width  = '100vw';
    canvas.style.height = '100vh';

    wave     = new Float32Array(cols * rows);
    prevWave = new Float32Array(cols * rows);

    // Assign each cell a random base color
    baseColor = new Uint8Array(cols * rows * 3);
    for (let i = 0; i < cols * rows; i++) {
      const c = BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)];
      // tiny random jitter for organic look
      baseColor[i * 3 + 0] = c[0] + (Math.random() * 4 | 0);
      baseColor[i * 3 + 1] = c[1] + (Math.random() * 4 | 0);
      baseColor[i * 3 + 2] = c[2] + (Math.random() * 6 | 0);
    }
  }

  // ── Physics step ────────────────────────────────────────
  function stepWave() {
    const next = prevWave;   // reuse buffer
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const idx = r * cols + c;
        const avg =
          wave[idx - 1] + wave[idx + 1] +
          wave[idx - cols] + wave[idx + cols];
        next[idx] = (avg * SPREAD * 2 - next[idx]) * DAMPING;
      }
    }
    prevWave = wave;
    wave = next;
  }

  // ── Cursor disturbance ──────────────────────────────────
  function applyMouse() {
    if (mouseX < 0) return;
    const gr = Math.round(mouseY / PIXEL);
    const gc = Math.round(mouseX / PIXEL);
    const rad = Math.ceil(RIPPLE_RADIUS / PIXEL);

    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const r = gr + dr;
        const c = gc + dc;
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        const dist = Math.sqrt(dr * dr + dc * dc) * PIXEL;
        if (dist < RIPPLE_RADIUS) {
          const force = (1 - dist / RIPPLE_RADIUS) * RIPPLE_STRENGTH;
          wave[r * cols + c] += force;
        }
      }
    }
  }

  // ── Render ───────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx  = r * cols + c;
        const h    = wave[idx];                       // height value
        const t    = Math.min(Math.abs(h) / RIPPLE_STRENGTH, 1); // 0–1

        const br = baseColor[idx * 3 + 0];
        const bg = baseColor[idx * 3 + 1];
        const bb = baseColor[idx * 3 + 2];

        // Interpolate toward ripple highlight color
        const fr = (br + (RIPPLE_COLOR[0] - br) * t) | 0;
        const fg = (bg + (RIPPLE_COLOR[1] - bg) * t) | 0;
        const fb = (bb + (RIPPLE_COLOR[2] - bb) * t) | 0;

        ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
        ctx.fillRect(c * PIXEL, r * PIXEL, PIXEL - 1, PIXEL - 1);
      }
    }
  }

  // ── Loop ─────────────────────────────────────────────────
  function loop() {
    applyMouse();
    stepWave();
    render();
    animFrame = requestAnimationFrame(loop);
  }

  // ── Events ───────────────────────────────────────────────
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    mouseX = t.clientX;
    mouseY = t.clientY;
  }, { passive: true });

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animFrame);
    init();
    loop();
  });

  // ── Spontaneous ripples for idle ambience ─────────────────
  setInterval(() => {
    const r = 1 + Math.random() * (rows - 2) | 0;
    const c = 1 + Math.random() * (cols - 2) | 0;
    wave[r * cols + c] += (Math.random() - 0.5) * 0.8;
  }, 280);

  // ── Start ─────────────────────────────────────────────────
  init();
  loop();
})();
