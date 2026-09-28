// PrinterClear's shared models, numbers and helpers.
// Numbers come from real specs; sources are given next to each constant.
import { THREE, M, box, rod, beam, tube, clamp } from './kit.js';

export const TAU = Math.PI * 2;
export const A4 = { w: 8.27, h: 11.69 };            // inches (210 × 297 mm)

// ------------------------------------------------------------------ inkjet physics
// Thermal inkjet: a 3–5 µs current pulse heats a thin ink layer to about 300–350 °C, a vapour
// bubble forms, throws a drop of a few picolitres, and collapses within about 10–20 µs.
// (REA JET, "Thermal inkjet printing technology"; ResearchGate, "Thermal inkjet heaters: experimental
// parameters and micro-boiling limits".) Drops leave at about 10 m/s (US patent 7997713 and others).
// Heads fire 8–12 kHz per chamber, up to 18 kHz with 5 pL drops by 2000 (Wikipedia, Inkjet printing).
export const TIJ = { heaterC: 300, pulseUs: 3, bubblePeakUs: 8, collapseUs: 20, refillUs: 45, dropMs: 10 };
// Canon PIXMA G-series ink tank head: 1,792 nozzles in all, 640 for black and 384 for each colour
// (Canon USA, PIXMA G3290 specifications).
export const HEAD = { total: 1792, black: 640, colour: 384 };

// Diameter of a spherical drop of V picolitres, in micrometres. 1 pL = 1e-15 m³.
export const dropDiameterUm = (pL) => Math.cbrt((6 * pL * 1e-15) / Math.PI) * 1e6;
// On plain paper a drop spreads into a dot roughly twice its own diameter (typical; depends on ink and paper).
export const SPREAD = 2;
export const pitchUm = (dpi) => 25400 / dpi;
// The carriage may move one dot column per firing: v = f / dpi (inches per second).
export const carriageSpeed = (kHz, dpi) => (kHz * 1000) / dpi;
// A rough page time: each pass covers a band as tall as the nozzle column; each pass sweeps the page
// width plus about an inch to turn round, and the paper steps between passes (~0.1 s).
export function inkjetPpm(kHz, dpi, nozzles, passesPerBand = 1) {
  const v = carriageSpeed(kHz, dpi), swath = nozzles / 600;         // nozzles are 600 per inch
  const bands = Math.ceil(A4.h / swath) * passesPerBand;
  const t = bands * ((A4.w + 1) / v + 0.1);
  return { v, swath, bands, t, ppm: 60 / t };
}

// ------------------------------------------------------------------ laser physics
// Drum charged to about −700 V; spots hit by the laser drop to about −150 V; the developer roller
// is biased in between, so negatively charged toner jumps only to the discharged spots.
// (Example values: a primary charger to −720 V with exposed areas at −200 V, US patent 4890125.)
export const DRUM = { charged: -700, exposed: -150, bias: -400 };
// Fuser: a hot roller at about 150–200 °C melts the toner into the paper under pressure
// (US patent 5406361; HP support: up to about 200 °C for a fraction of a second).
export const FUSER_C = 190;
// Toner particles: about 5 µm for 600 dpi, about 3 µm for 1,200 dpi (Wikipedia, Toner (printing)).
// Polygon mirror: 5 or more faces keep the motor to a practical 5,000–10,000 rpm for office speeds
// (MindMachine, Laser printer light sources; US patent 4942406).
export function laserScan(ppm, dpi, facets) {
  const mmPerS = (ppm * (297 + 30)) / 60;       // A4 length plus about a 30 mm gap between sheets
  const linesPerS = (mmPerS / 25.4) * dpi;
  const rpm = (linesPerS / facets) * 60;
  const dotsPerS = linesPerS * A4.w * dpi;
  return { mmPerS, linesPerS, rpm, dotsPerS };
}

// ------------------------------------------------------------------ cost data (India, 2025–26 street/list prices)
// HP 682 black: ₹1,025 on HP India, 480 pages, 8.5 ml. HP 682 tri-colour: ₹949, 150 pages, 4 ml.
// Epson 003 black bottle: about ₹404, 65 ml, 4,500 pages; a C/M/Y set yields about 7,500 colour pages.
// HP 1008a laser: about ₹12,000 on HP India; retail listings put a page at about ₹4.8 with genuine toner.
// Printers: HP DeskJet Ink Advantage 2876 about ₹8,900; Epson L3250 about ₹14,500.
export const COST = {
  cart:  { name: 'Cartridge inkjet', short: 'Cartridge', printer: 8900,  black: 1025 / 480, colour: 1025 / 480 + 949 / 150, mlPrice: 1025 / 8.5, colourOk: true },
  tank:  { name: 'Ink tank inkjet',  short: 'Ink tank',  printer: 14500, black: 404 / 4500, colour: 404 / 4500 + (3 * 404) / 7500, mlPrice: 404 / 65, colourOk: true },
  laser: { name: 'Mono laser',       short: 'Laser',     printer: 12000, black: 4.8, colour: 4.8, mlPrice: null, colourOk: false },
};

// ------------------------------------------------------------------ 5×7 dot font (columns of 7 bits, bit 0 = top)
const F = {
  ' ': [0, 0, 0, 0, 0], '-': [8, 8, 8, 8, 8], '.': [0, 96, 96, 0, 0], ',': [0, 80, 48, 0, 0], '/': [32, 16, 8, 4, 2], ':': [0, 54, 54, 0, 0],
  0: [62, 81, 73, 69, 62], 1: [0, 66, 127, 64, 0], 2: [66, 97, 81, 73, 70], 3: [33, 65, 69, 75, 49], 4: [24, 20, 18, 127, 16],
  5: [39, 69, 69, 69, 57], 6: [60, 74, 73, 73, 48], 7: [1, 113, 9, 5, 3], 8: [54, 73, 73, 73, 54], 9: [6, 73, 73, 41, 30],
  A: [126, 17, 17, 17, 126], B: [127, 73, 73, 73, 54], C: [62, 65, 65, 65, 34], D: [127, 65, 65, 34, 28], E: [127, 73, 73, 73, 65],
  F: [127, 9, 9, 9, 1], G: [62, 65, 73, 73, 122], H: [127, 8, 8, 8, 127], I: [0, 65, 127, 65, 0], J: [32, 64, 65, 63, 1],
  K: [127, 8, 20, 34, 65], L: [127, 64, 64, 64, 64], M: [127, 2, 12, 2, 127], N: [127, 4, 8, 16, 127], O: [62, 65, 65, 65, 62],
  P: [127, 9, 9, 9, 6], R: [127, 9, 25, 41, 70], S: [70, 73, 73, 73, 49], T: [1, 1, 127, 1, 1], U: [63, 64, 64, 64, 63],
  V: [31, 32, 64, 32, 31], W: [63, 64, 56, 64, 63], X: [99, 20, 8, 20, 99], Y: [7, 8, 112, 8, 7], Z: [97, 81, 73, 69, 67],
};
// Text → array of 7-bit columns, one blank column between letters.
export function dotColumns(text) {
  const out = [];
  for (const ch of text.toUpperCase()) { (F[ch] || F[' ']).forEach((c) => out.push(c)); out.push(0); }
  return out;
}

// ------------------------------------------------------------------ pictures for the halftone chapter
// Each draws a 2 × 2 inch picture onto a square canvas.
export const PICTURES = {
  marigold: 'Marigolds',
  sunset: 'Sunset at sea',
  wheel: 'Colour wheel',
  text: 'Small text',
};
export function drawPicture(g, key, S) {
  g.save(); g.clearRect(0, 0, S, S);
  if (key === 'sunset') {
    const sky = g.createLinearGradient(0, 0, 0, S * 0.62);
    sky.addColorStop(0, '#2a2f7a'); sky.addColorStop(0.45, '#c8527a'); sky.addColorStop(1, '#ffb347');
    g.fillStyle = sky; g.fillRect(0, 0, S, S * 0.62);
    g.fillStyle = '#ffe07a'; g.beginPath(); g.arc(S * 0.55, S * 0.6, S * 0.13, 0, TAU); g.fill();
    const sea = g.createLinearGradient(0, S * 0.62, 0, S);
    sea.addColorStop(0, '#e0766a'); sea.addColorStop(1, '#16304f');
    g.fillStyle = sea; g.fillRect(0, S * 0.62, S, S * 0.38);
    g.strokeStyle = 'rgba(255,230,150,.8)';
    for (let k = 0; k < 9; k++) { g.lineWidth = S * 0.006; const y = S * (0.65 + k * 0.035), w = S * (0.2 - k * 0.012); g.beginPath(); g.moveTo(S * 0.55 - w, y); g.lineTo(S * 0.55 + w, y); g.stroke(); }
    g.fillStyle = '#111522'; g.beginPath(); g.moveTo(S * 0.12, S * 0.78); g.lineTo(S * 0.34, S * 0.78); g.lineTo(S * 0.3, S * 0.82); g.lineTo(S * 0.15, S * 0.82); g.fill();
    g.fillRect(S * 0.22, S * 0.66, S * 0.008, S * 0.12);
  } else if (key === 'wheel') {
    g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    const c = S / 2, R = S * 0.44;
    for (let a = 0; a < 360; a += 1) {
      const gr = g.createRadialGradient(c, c, 0, c, c, R);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, `hsl(${a},100%,50%)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(c, c); g.arc(c, c, R, (a - 0.7) * Math.PI / 180, (a + 1) * Math.PI / 180); g.fill();
    }
    for (let k = 0; k < 8; k++) { g.fillStyle = `rgb(${k * 36},${k * 36},${k * 36})`; g.fillRect(k * S / 8, S * 0.94, S / 8, S * 0.06); }
  } else if (key === 'text') {
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#10131c';
    const lines = ['How does a', 'printer work?', 'Tiny dots of ink,', 'thousands per inch,', 'fool your eye into', 'seeing letters', 'and pictures.', 'छोटी बूँदें, बड़ा चित्र'];
    lines.forEach((t, i) => { g.font = `${i < 2 ? 700 : 400} ${S * (i < 2 ? 0.1 : 0.068)}px Georgia, serif`; g.fillText(t, S * 0.06, S * (0.14 + i * 0.112 + (i > 1 ? 0.03 : 0))); });
  } else {
    // Marigolds (genda phool) on a leafy background.
    g.fillStyle = '#1f4d2a'; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 40; k++) { const x = ((k * 97) % 100) / 100 * S, y = ((k * 57) % 100) / 100 * S; g.fillStyle = k % 2 ? '#2f7a3a' : '#3f9147'; g.beginPath(); g.ellipse(x, y, S * 0.09, S * 0.035, k, 0, TAU); g.fill(); }
    const flower = (x, y, r, hue) => {
      for (let ring = 6; ring >= 1; ring--) {
        const rr = (r * ring) / 6, n = 8 + ring * 5;
        for (let p = 0; p < n; p++) { const a = (p / n) * TAU + ring; g.fillStyle = `hsl(${hue - ring * 2},100%,${40 + ring * 4}%)`; g.beginPath(); g.ellipse(x + Math.cos(a) * rr * 0.75, y + Math.sin(a) * rr * 0.75, rr * 0.32, rr * 0.2, a, 0, TAU); g.fill(); }
      }
    };
    flower(S * 0.33, S * 0.36, S * 0.26, 34); flower(S * 0.72, S * 0.62, S * 0.22, 46); flower(S * 0.25, S * 0.82, S * 0.15, 28);
  }
  g.restore();
}

// RGB (0–255) → CMYK (0–1), with grey-component replacement: the grey part of a colour goes to black ink.
export function rgbToCmyk(r, g, b, useK = true) {
  const c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255;
  if (!useK) return [c, m, y, 0];
  const k = Math.min(c, m, y);
  if (k >= 0.999) return [0, 0, 0, 1];
  return [(c - k) / (1 - k), (m - k) / (1 - k), (y - k) / (1 - k), k];
}

// ------------------------------------------------------------------ small building helpers
export function plate(w, h, d, color, o = {}) { return box(w, h, d, M.plastic(color, o)); }

// A sheet of paper that bends along a path: N short slices placed along a curve.
export function paperOnPath(curve, len, width, mat, N = 24) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(width, 0.012, 1);
  const slices = Array.from({ length: N }, () => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m); return m; });
  const L = curve.getLength(), up = new THREE.Vector3(), q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
  // u is the arc-length position (0…L) of the sheet's leading edge along the path.
  g.place = (u) => {
    const d = len / N;
    slices.forEach((m, i) => {
      const s = u - (i + 0.5) * d;
      if (s < 0 || s > L) { m.visible = false; return; }
      m.visible = true;
      const t = s / L, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      m.position.copy(p); q.setFromUnitVectors(zAxis, tg); m.quaternion.copy(q);
      m.scale.set(1, 1, d * 1.04);
    });
  };
  g.length = L;
  return g;
}

// ------------------------------------------------------------------ the inkjet printer (chapter 1)
// Width along X, paper travels from the back (−Z) to the front (+Z). About 1 unit = 10 cm.
export function makeInkjet() {
  const group = new THREE.Group();
  const shellMat = M.plastic(0xe9ecf2, { transparent: true, opacity: 1 });
  const darkMat = M.plastic(0x2b2f3a);
  const shell = new THREE.Group(); group.add(shell);
  const base = box(4.4, 0.35, 3.0, shellMat); base.position.y = 0.175; shell.add(base);
  const walls = new THREE.Group(); shell.add(walls);
  for (const sx of [-1, 1]) { const w = box(0.4, 0.9, 3.0, shellMat); w.position.set(sx * 2.0, 0.8, 0); walls.add(w); }
  const back = box(3.6, 0.9, 0.3, shellMat); back.position.set(0, 0.8, -1.35); walls.add(back);
  const front = box(3.6, 0.35, 0.3, shellMat); front.position.set(0, 0.52, 1.35); walls.add(front);
  const lid = new THREE.Group(); lid.position.y = 1.25; shell.add(lid);
  const lidTop = box(4.4, 0.18, 3.0, shellMat); lid.add(lidTop);
  const panel = box(0.9, 0.05, 0.4, darkMat); panel.position.set(1.4, 0.11, 1.1); lid.add(panel);
  const led = box(0.12, 0.03, 0.06, M.glow(0x5ce1a9)); led.position.set(1.1, 0.14, 1.1); lid.add(led);

  // Input tray standing up at the back, with a stack of paper.
  const trayIn = new THREE.Group(); trayIn.position.set(0, 1.25, -1.35); trayIn.rotation.x = -0.45; group.add(trayIn);
  const trayBack = box(2.6, 0.05, 2.0, M.plastic(0xd9dde5)); trayBack.rotation.x = Math.PI / 2; trayBack.position.set(0, 1.0, -0.06); trayIn.add(trayBack);
  const stack = box(2.1, 1.7, 0.12, M.matte(0xfbfbf7)); stack.position.set(0, 0.95, 0.05); trayIn.add(stack);

  // Inner parts.
  const inner = new THREE.Group(); group.add(inner);
  const rubber = M.matte(0x1d1f25), steel = M.metal(0xc5cad3);
  const pick = new THREE.Group(); pick.position.set(0, 1.05, -1.05); inner.add(pick);
  pick.add(rod(-1.2, 1.2, 0.03, 0.03, steel), rod(-0.5, -0.1, 0.12, 0.12, rubber), rod(0.1, 0.5, 0.12, 0.12, rubber));
  const feed = new THREE.Group(); feed.position.set(0, 0.55, -0.55); inner.add(feed);
  feed.add(rod(-1.3, 1.3, 0.09, 0.09, rubber), rod(-1.4, 1.4, 0.03, 0.03, steel));
  const pinch = rod(-1.2, 1.2, 0.05, 0.05, steel); pinch.position.set(0, 0.7, -0.52); inner.add(pinch);
  const platen = box(3.0, 0.08, 0.7, M.plastic(0x3a3f4c)); platen.position.set(0, 0.42, 0.05); inner.add(platen);
  const exitR = new THREE.Group(); exitR.position.set(0, 0.5, 0.7); inner.add(exitR);
  exitR.add(rod(-1.3, 1.3, 0.06, 0.06, rubber));
  for (let k = -3; k <= 3; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 8), steel); s.rotation.z = Math.PI / 2; s.position.set(k * 0.4, 0.62, 0.72); inner.add(s); }   // star wheels
  // Carriage rail, belt and motor.
  const rail = rod(-1.9, 1.9, 0.04, 0.04, steel); rail.position.set(0, 1.0, -0.2); inner.add(rail);
  const belt = box(3.6, 0.1, 0.015, rubber); belt.position.set(0, 1.0, -0.33); inner.add(belt);
  const motor = rod(-1.95, -1.6, 0.14, 0.14, M.metal(0x7c8594)); motor.position.set(0, 0.9, -0.5); inner.add(motor);
  const feedMotor = rod(1.55, 1.9, 0.14, 0.14, M.metal(0x7c8594)); feedMotor.position.set(0, 0.55, -0.9); inner.add(feedMotor);
  // Carriage with four cartridges; the printhead sits underneath, a millimetre or so above the paper.
  const carriage = new THREE.Group(); carriage.position.set(0, 0, 0); inner.add(carriage);
  const cBody = box(0.9, 0.3, 0.7, M.plastic(0x404656)); cBody.position.set(0, 0.8, 0.02); carriage.add(cBody);
  const head = box(0.8, 0.05, 0.55, M.metal(0x9aa3b2)); head.position.set(0, 0.63, 0.05); carriage.add(head);
  const carts = new THREE.Group(); carriage.add(carts);
  [[0x14161c, -0.3, 0.22], [0x19b7e6, -0.07, 0.16], [0xe6358f, 0.12, 0.16], [0xf5d316, 0.31, 0.16]].forEach(([c, x, w]) => {
    const b = box(w, 0.38, 0.5, M.plastic(c, { roughness: 0.35 })); b.position.set(x, 1.12, 0.02); carts.add(b);
  });
  // Paper path: from the tray, round the pick roller, over the platen, out to the front.
  const path = new THREE.CatmullRomCurve3([
    [0, 2.2, -2.15], [0, 1.6, -1.7], [0, 1.15, -1.25], [0, 0.72, -0.8], [0, 0.49, -0.35], [0, 0.47, 0.3], [0, 0.46, 0.9], [0, 0.4, 1.6], [0, 0.35, 2.4],
  ].map((p) => new THREE.Vector3(...p)));
  const outTray = box(2.3, 0.04, 1.2, M.plastic(0xd9dde5)); outTray.position.set(0, 0.3, 2.05); group.add(outTray);
  return { group, shell, shellMat, lid, walls, trayIn, inner, pick, feed, platen, carriage, carts, head, rail, path, outTray, motor };
}

// ------------------------------------------------------------------ the laser printer (chapter 1)
// Rollers run along X; the paper goes up from the cassette at the bottom back, forward under the drum,
// through the fuser, then up the front and out face-down on top.
export function makeLaser() {
  const group = new THREE.Group();
  const shellMat = M.plastic(0xdfe3ea, { transparent: true, opacity: 1 });
  const shell = new THREE.Group(); group.add(shell);
  const body = box(3.8, 2.3, 3.4, shellMat); body.position.y = 1.35; shell.add(body);
  const top = new THREE.Group(); top.position.y = 2.6; shell.add(top);
  const topBox = box(3.8, 0.3, 3.4, shellMat); top.add(topBox);
  const outWell = box(2.4, 0.04, 1.8, M.plastic(0x2e333e)); outWell.position.set(0, 0.16, -0.2); top.add(outWell);
  const inner = new THREE.Group(); group.add(inner);
  const rubber = M.matte(0x1d1f25), steel = M.metal(0xc5cad3);
  const cassette = new THREE.Group(); cassette.position.set(0, 0.4, 0); inner.add(cassette);
  cassette.add(box(2.6, 0.3, 3.0, M.plastic(0x3a3f4c)));
  const cstack = box(2.1, 0.18, 2.6, M.matte(0xfbfbf7)); cstack.position.y = 0.12; cassette.add(cstack);
  const pick = new THREE.Group(); pick.position.set(0, 0.75, -1.25); inner.add(pick);
  pick.add(rod(-1.2, 1.2, 0.03, 0.03, steel), rod(-0.3, 0.3, 0.16, 0.16, rubber));
  // Toner cartridge: hopper, developer roller and the green photoconductor drum.
  const cart = new THREE.Group(); cart.position.set(0, 1.62, -0.25); inner.add(cart);
  const drum = rod(-1.15, 1.15, 0.3, 0.3, M.plastic(0x2f8a55, { roughness: 0.3 })); cart.add(drum);
  const dev = rod(-1.1, 1.1, 0.16, 0.16, M.metal(0x6b7280)); dev.position.set(0, 0.2, -0.45); cart.add(dev);
  const hopper = box(2.5, 0.6, 0.7, M.plastic(0x23262e, { transparent: true, opacity: 1 })); hopper.position.set(0, 0.4, -0.95); cart.add(hopper);
  const tonerFill = box(2.3, 0.35, 0.5, M.matte(0x0b0b0d)); tonerFill.position.set(0, 0.28, -0.95); cart.add(tonerFill);
  const chg = rod(-1.1, 1.1, 0.09, 0.09, M.matte(0x3a3a44)); chg.position.set(0, 0.32, 0.2); cart.add(chg);
  const transfer = rod(-1.1, 1.1, 0.13, 0.13, rubber); transfer.position.set(0, 1.18, -0.25); inner.add(transfer);
  // Laser scanner unit at the top: diode, spinning six-sided polygon mirror, lens and a fold mirror.
  const scanner = new THREE.Group(); scanner.position.set(0, 2.2, 0.5); inner.add(scanner);
  scanner.add(box(2.6, 0.12, 1.1, M.plastic(0x4a5060)));
  const poly = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 6), M.metal(0xeef2f8, { roughness: 0.05 })); poly.position.set(0.9, 0.12, 0.2); scanner.add(poly);
  const diode = box(0.14, 0.1, 0.14, M.metal(0xb08040)); diode.position.set(1.15, 0.12, -0.25); scanner.add(diode);
  const lens = box(1.6, 0.14, 0.06, M.clear(0x9fe6ff, 0.45)); lens.position.set(0, 0.12, -0.1); scanner.add(lens);
  const fuser = new THREE.Group(); fuser.position.set(0, 1.35, 0.85); inner.add(fuser);
  const heatMat = M.metal(0xb9bec8, { emissive: new THREE.Color(0xff5a2a), emissiveIntensity: 0.25 });
  const heatR = rod(-1.15, 1.15, 0.17, 0.17, heatMat); heatR.position.y = 0.17; fuser.add(heatR);
  const presR = rod(-1.15, 1.15, 0.17, 0.17, rubber); presR.position.y = -0.17; fuser.add(presR);
  const fuserCover = box(2.5, 0.55, 0.05, M.plastic(0x3a3f4c, { transparent: true, opacity: 0.6 })); fuserCover.position.z = 0.3; fuser.add(fuserCover);
  const exitR = rod(-1.1, 1.1, 0.08, 0.08, rubber); exitR.position.set(0, 2.45, 1.35); inner.add(exitR);
  const path = new THREE.CatmullRomCurve3([
    [0, 0.6, 0.3], [0, 0.66, -1.0], [0, 0.95, -1.45], [0, 1.28, -1.05], [0, 1.32, -0.25], [0, 1.35, 0.85], [0, 1.45, 1.35], [0, 2.1, 1.5], [0, 2.52, 1.2], [0, 2.8, 0.2], [0, 2.8, -0.6],
  ].map((p) => new THREE.Vector3(...p)));
  return { group, shell, shellMat, top, inner, cassette, pick, cart, drum, dev, hopper, transfer, scanner, poly, fuser, heatMat, path, chg };
}

export { clamp, beam, tube };
