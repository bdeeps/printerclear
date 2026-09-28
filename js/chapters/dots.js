// Chapter 3: from dots to pictures. A real halftone and a real error-diffusion dither, in four inks,
// computed live for the picture and resolution you choose. The magnifier shows a 1/4-inch square.
import { THREE, M, canvasTexture, torus, box, rod, beam } from '../kit.js';
import { PICTURES, drawPicture, rgbToCmyk, TAU } from '../printer.js';

const SRC = 600, SRC_IN = 2;                   // source picture: 600 px for 2 inches
const LOUPE_IN = 0.25, LP = 600;               // magnifier: a quarter inch, drawn 600 px wide
const CELL = 8;                                // halftone cell, in printer dots: lpi = dpi / 8
// Screen angles used in printing, chosen so the four grids don't beat against each other.
const ANG = [15, 75, 0, 45].map((a) => (a * Math.PI) / 180);
// Colours of real process inks when printed alone (approximate sRGB of ISO 12647 C, M, Y, K on white).
const INK = [[0, 158, 224], [228, 0, 124], [255, 234, 0], [30, 30, 32]];
const SPOT = { marigold: [0.95, 0.72], sunset: [1.1, 1.18], wheel: [1.36, 0.62], text: [0.14, 0.3] };
// The eye can just separate details about 1 arcminute apart: at 30 cm that is about 87 µm.
const EYE_UM = 300000 * Math.tan(Math.PI / 180 / 60);

export default {
  id: 'dots',
  short: 'Dots to pictures',
  title: 'Four inks, millions of dots',
  subtitle: 'A printer can only put a dot or leave paper blank. Halftoning turns that yes-or-no into every shade you can see.',
  view: { pos: [0.2, 3.6, 14.2], target: [0.1, 2.9, 0] },
  learn: `<p>A printer can't print "a bit of cyan". Each spot on the page either gets a dot of ink or stays white. So how does it print a pale sky or a soft shadow?</p>
    <p>It cheats your eye. Where the picture is light, it prints few, small or spread-out dots. Where it is dark, it prints many. From reading distance your eye blends them into a smooth <b>shade</b>. This trick is called <b>halftoning</b>. Newspapers use neat rows of dots that grow and shrink (an <b>AM halftone</b>). Most inkjets scatter dots in a clever random-looking way called <b>dithering</b>.</p>
    <p>Colour works by taking light away. White paper reflects red, green and blue. <b>Cyan</b> ink soaks up red, <b>magenta</b> soaks up green, <b>yellow</b> soaks up blue. Overlap them and less light gets back, so colours get darker. This is <b>subtractive</b> mixing. A TV screen does the opposite: it adds red, green and blue light (see TVClear).</p>
    <p>In theory C + M + Y makes black. Real inks give a muddy brown and waste three times the ink, and text looks fuzzy. So printers add a fourth ink, <b>K</b> for "key", black. That's <b>CMYK</b>.</p>
    <p class="tip"><b>Try it:</b> drop to 72 dpi and look at the dots. Then turn off black ink and see what happens to the dark parts.</p>`,
  terms: [
    { t: 'dpi', d: 'Dots per inch: how many dots the printer can place in a line one inch (25.4 mm) long.' },
    { t: 'Halftone', d: 'A pattern of dots of different sizes or spacing that the eye sees as shades of grey or colour.' },
    { t: 'Dithering', d: 'Scattering dots so their average matches the shade, passing each small error on to the neighbours.' },
    { t: 'Subtractive colour', d: 'Colour made by inks that absorb parts of white light. More ink means darker.' },
    { t: 'CMYK', d: 'Cyan, magenta, yellow and key (black): the four inks most printers use.' },
  ],
  defaults: { pic: 'marigold', dpi: 150, method: 'halftone', inks: 'cmyk' },
  controls: [
    { key: 'pic', type: 'seg', label: 'Picture', options: Object.entries(PICTURES).map(([v, label]) => ({ v, label })) },
    { key: 'dpi', type: 'log', label: 'Printer resolution', min: 72, max: 1200, ends: ['72 dpi', '1,200 dpi'], fmt: (v) => `${Math.round(v)} dpi` },
    { key: 'method', type: 'seg', label: 'Dot pattern', options: [{ v: 'halftone', label: 'Halftone (dots grow)' }, { v: 'dither', label: 'Dither (dots scatter)' }] },
    { key: 'inks', type: 'seg', label: 'Inks', options: [{ v: 'cmyk', label: 'C M Y K' }, { v: 'cmy', label: 'C M Y only' }], fmt: (v) => (v === 'cmyk' ? 'black has its own ink' : 'black made from three inks') },
  ],
  quiz: [
    { q: 'How does a printer make a light pink with only dots of magenta?', options: ['It waters down the ink', 'It prints fewer or smaller magenta dots, so more white paper shows', 'It uses a pink ink', 'It prints the dots faster'], answer: 1, why: 'Each dot is full strength. The shade comes from how much of the paper the dots cover.' },
    { q: 'Why do printers use a black ink instead of mixing C + M + Y?', options: ['Black ink is prettier', 'Real C + M + Y gives a muddy brown, wastes ink and blurs text', 'Colour inks cannot mix', 'Black is free'], answer: 1, why: 'Real inks aren\'t perfect filters. A separate black gives deep, sharp black with one layer of ink.' },
    { q: 'Printer inks mix by…', options: ['Adding light, like a TV', 'Taking light away from white paper (subtractive)', 'Reflecting only black', 'Glowing'], answer: 1, why: 'Each ink absorbs one part of white light. A screen adds light instead.' },
  ],
  reel: [
    { ms: 5400, caption: 'Only four inks and a yes-or-no dot, but at 600 dots per inch your eye sees every shade.', set: { pic: 'marigold', method: 'halftone', inks: 'cmyk' }, anim: { dpi: [72, 600, true] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const src = document.createElement('canvas'); src.width = src.height = SRC;
    const sg = src.getContext('2d', { willReadFrequently: true });
    let pix = null, picKey = null;
    const sample = (xIn, yIn) => {                  // bilinear sample of the source at inches → [r,g,b]
      const fx = Math.min(SRC - 1.001, Math.max(0, (xIn / SRC_IN) * SRC - 0.5)), fy = Math.min(SRC - 1.001, Math.max(0, (yIn / SRC_IN) * SRC - 0.5));
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, out = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const p = (x, y) => pix[(y * SRC + x) * 4 + c];
        out[c] = (p(x0, y0) * (1 - ax) + p(x0 + 1, y0) * ax) * (1 - ay) + (p(x0, y0 + 1) * (1 - ax) + p(x0 + 1, y0 + 1) * ax) * ay;
      }
      return out;
    };
    const st = { dpi: 150, method: 'halftone', inks: 'cmyk', drops: [0, 0, 0, 0], n: 0 };
    // Left board: the picture you asked for, with the magnified square outlined.
    const whole = canvasTexture(512, 560, (g, W) => {
      g.fillStyle = 'rgba(10,12,18,.92)'; g.fillRect(0, 0, W, 560);
      g.font = 'bold 26px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText('The picture you print (2 × 2 inches)', 20, 546);
      g.drawImage(src, 16, 16, 480, 480);
      const [sx, sy] = SPOT[picKey] || [1, 1], k = 480 / SRC_IN;
      g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(16 + sx * k, 16 + sy * k, LOUPE_IN * k, LOUPE_IN * k);
      g.strokeStyle = '#ff7a59'; g.lineWidth = 2; g.strokeRect(16 + sx * k, 16 + sy * k, LOUPE_IN * k, LOUPE_IN * k);
    });
    const BW = 3.6, BH = 3.6 * 560 / 512, BX = -3.1, BY = 0.2 + BH / 2;
    const leftB = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: whole.tex, transparent: true, toneMapped: false }));
    leftB.position.set(BX, BY, 0); root.add(leftB);
    // Right: the magnifier, showing every printer dot in a quarter inch.
    const lens = canvasTexture(LP, LP, (g) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, LP, LP);
      if (!pix) return;
      const n = Math.max(2, Math.round(st.dpi * LOUPE_IN)); st.n = n;
      const [sx, sy] = SPOT[picKey] || [1, 1];
      const grids = [0, 1, 2, 3].map(() => new Uint8Array(n * n));
      const lpi = st.dpi / CELL, useK = st.inks === 'cmyk';
      // CMYK value at each printer dot.
      const val = new Float32Array(n * n * 4);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = sx + ((i + 0.5) / n) * LOUPE_IN, y = sy + ((j + 0.5) / n) * LOUPE_IN;
        const [r, gg, b] = sample(x, y), cm = rgbToCmyk(r, gg, b, useK);
        for (let c = 0; c < 4; c++) val[(j * n + i) * 4 + c] = cm[c];
      }
      if (st.method === 'halftone') {
        for (let c = 0; c < 4; c++) {
          const ca = Math.cos(ANG[c]), sa = Math.sin(ANG[c]);
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            const x = sx + ((i + 0.5) / n) * LOUPE_IN, y = sy + ((j + 0.5) / n) * LOUPE_IN;
            const u = (x * ca + y * sa) * lpi, v = (-x * sa + y * ca) * lpi;
            const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5;
            const a = val[(j * n + i) * 4 + c];
            // Round dot whose area matches the coverage a; past 50% the white gaps shrink instead.
            const on = a <= 0.5 ? fu * fu + fv * fv < a / Math.PI : (0.5 - Math.abs(fu)) ** 2 + (0.5 - Math.abs(fv)) ** 2 >= (1 - a) / Math.PI;
            grids[c][j * n + i] = on ? 1 : 0;
          }
        }
      } else {
        // Floyd–Steinberg error diffusion, one ink at a time.
        for (let c = 0; c < 4; c++) {
          const e = new Float32Array(n * n); for (let k = 0; k < n * n; k++) e[k] = val[k * 4 + c];
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            const k = j * n + i, on = e[k] >= 0.5 ? 1 : 0, err = e[k] - on; grids[c][k] = on;
            if (i + 1 < n) e[k + 1] += err * 7 / 16;
            if (j + 1 < n) { if (i > 0) e[k + n - 1] += err * 3 / 16; e[k + n] += err * 5 / 16; if (i + 1 < n) e[k + n + 1] += err / 16; }
          }
        }
      }
      st.drops = grids.map((gd) => gd.reduce((a, b) => a + b, 0) / (n * n));
      // Paint: each dot is a round spot about 1.4 dot-pitches wide (ink spreads); inks multiply.
      const img = g.createImageData(LP, LP), d = img.data, ppd = LP / n, R2 = (0.7 * ppd) ** 2;
      const T = INK.map((c) => c.map((v) => v / 255));
      for (let py = 0; py < LP; py++) {
        const fy = (py + 0.5) / ppd - 0.5, j0 = Math.floor(fy);
        for (let px = 0; px < LP; px++) {
          const fx = (px + 0.5) / ppd - 0.5, i0 = Math.floor(fx);
          let r = 1, gg = 1, b = 1;
          for (let c = 0; c < 4; c++) {
            const gd = grids[c]; let hit = false;
            for (let dj = 0; dj <= 1 && !hit; dj++) for (let di = 0; di <= 1 && !hit; di++) {
              const i = i0 + di, j = j0 + dj;
              if (i < 0 || j < 0 || i >= n || j >= n || !gd[j * n + i]) continue;
              const dx = (fx - i) * ppd, dy = (fy - j) * ppd; if (dx * dx + dy * dy <= R2) hit = true;
            }
            if (hit) { r *= T[c][0]; gg *= T[c][1]; b *= T[c][2]; }
          }
          const o = (py * LP + px) * 4; d[o] = r * 255; d[o + 1] = gg * 255; d[o + 2] = b * 255; d[o + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    });
    const loupe = new THREE.Mesh(new THREE.CircleGeometry(2.6, 96), new THREE.MeshBasicMaterial({ map: lens.tex, toneMapped: false }));
    lens.tex.center.set(0.5, 0.5);
    const LX = 2.3, LY = 3.7; loupe.position.set(LX, LY, 0.05); root.add(loupe);
    const ring = torus(2.68, 0.12, M.metal(0x2a2e38, { roughness: 0.3 }), 96); ring.position.copy(loupe.position); root.add(ring);
    const handle = rod(-1.1, 1.1, 0.16, 0.2, M.plastic(0x7a3b1f)); handle.rotation.z = -0.8; root.add(handle);
    handle.position.set(LX + 3.9 * Math.cos(-0.8), LY + 3.9 * Math.sin(-0.8), 0);
    // Four ink bottles in front, and a line from the outlined square to the magnifier.
    const inks = new THREE.Group(); inks.position.set(1.4, 0, 1.9); root.add(inks);
    let kBottle = null;
    INK.forEach((c, i) => {
      const col = new THREE.Color(`rgb(${c[0]},${c[1]},${c[2]})`);
      const b = rod(0, 0.9, 0.28, 0.28, M.plastic(col, { roughness: 0.3 })); b.rotation.z = Math.PI / 2; b.position.set(-1.35 + i * 0.9, 0, 0); inks.add(b);
      const cap = rod(0.9, 1.1, 0.12, 0.12, M.plastic(0x222222)); cap.rotation.z = Math.PI / 2; cap.position.set(-1.35 + i * 0.9, 0, 0); inks.add(cap);
      const lb = stage.label('CMYK'[i], [-1.35 + i * 0.9, 1.25, 0], inks);
      if (i === 3) { kBottle = new THREE.Group(); inks.add(kBottle); kBottle.add(b, cap, lb); }
    });
    const link = beam([-1.2, 4.2, 0], [0.5, 4.5, 0], 0.025, M.glow(0xff7a59)); root.add(link);
    const lLoupe = stage.label('', [LX, LY + 2.95, 0.2], root, 'hot');

    let key = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.pic !== picKey) {
          picKey = s.pic; drawPicture(sg, picKey, SRC); pix = sg.getImageData(0, 0, SRC, SRC).data; whole.redraw(); key = '';
          const [sx, sy] = SPOT[picKey], k = (480 / 512) * BW / SRC_IN;
          const ax = BX - BW / 2 + (16 / 512) * BW + (sx + LOUPE_IN) * k, ay = BY + BH / 2 - (16 / 560) * BH - (sy + LOUPE_IN / 2) * k;
          const A = new THREE.Vector3(ax, ay, 0.02), B = new THREE.Vector3(LX - 2.6, LY, 0.02);
          link.scale.y = A.distanceTo(B); link.geometry.dispose(); link.geometry = new THREE.CylinderGeometry(0.025, 0.025, 1, 8);
          link.position.copy(A).add(B).multiplyScalar(0.5); link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
        }
        const d = Math.round(s.dpi), k2 = `${picKey}|${d}|${s.method}|${s.inks}`;
        if (k2 !== key) { key = k2; Object.assign(st, { dpi: d, method: s.method, inks: s.inks }); lens.redraw(); }
        kBottle.visible = s.inks === 'cmyk';
        lLoupe.element.textContent = `Magnified: ${LOUPE_IN} inch, ${st.n} × ${st.n} dots`;
      },
      readout: (s) => {
        const d = Math.round(s.dpi), um = 25400 / d, seen = um > EYE_UM;
        const ink = st.drops.reduce((a, b) => a + b, 0);
        return `<div class="big">${d} dpi: dots ${Math.round(um)} µm apart</div>
          <div class="row"><span>Dots in one square inch</span><b>${(d * d).toLocaleString()}</b></div>
          <div class="row"><span>${s.method === 'halftone' ? 'Halftone rows per inch (dpi ÷ 8)' : 'Pattern'}</span><b>${s.method === 'halftone' ? Math.round(d / CELL) + ' lpi' : 'scattered, no rows'}</b></div>
          <div class="row"><span>Can you see them from 30 cm?</span><b class="${seen ? 'no' : 'ok'}">${seen ? 'yes' : 'no'}</b></div>
          <div class="row"><span>Ink cover here, C M Y K</span><b>${st.drops.map((v) => Math.round(v * 100) + '%').join(' ')}</b></div>
          <small>The eye separates about 87 µm at 30 cm. ${s.inks === 'cmy' ? 'Without black, dark areas need all three inks: ' : 'Total ink here: '}${Math.round(ink * 100)}%.</small>`;
      },
    };
  },
};
