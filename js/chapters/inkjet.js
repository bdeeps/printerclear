// Chapter 2: the inkjet nozzle, slowed about 40,000 times. A row of 7 nozzles (a slice through the
// printhead) fires drops onto paper sliding underneath, spelling letters from a 5×7 dot font.
// Scale: 1 unit = 10 µm. The head-to-paper gap (about 1 mm in real life) is drawn much shorter.
import { THREE, M, box, canvasTexture, clamp } from '../kit.js';
import { TIJ, HEAD, dropDiameterUm, SPREAD, pitchUm, carriageSpeed, inkjetPpm, dotColumns, TAU } from '../printer.js';

const N = 7, DPI = 600, P = pitchUm(DPI) / 10;     // nozzle pitch in units (42.3 µm → 4.23)
const X0 = -((N - 1) / 2) * P;
const PAPER_Y = -9, PW = 34, PL = 26;              // paper strip in units
const US_PER_S = 25;                               // simulated microseconds per real second (≈ 40,000× slower)

export default {
  id: 'inkjet',
  short: 'Inkjet nozzles',
  title: 'Boiling ink into drops',
  subtitle: 'A heater the size of a speck of dust boils ink for a few millionths of a second, and the bubble throws out one drop.',
  view: { pos: [1, 29, 44], target: [-5, 6, 3] },
  learn: `<p>Under the carriage is the <b>printhead</b>, a silicon chip with a row of tiny <b>nozzles</b>. An ink-tank printer's head can have <b>1,792</b> of them. Each nozzle sits over its own little <b>chamber</b> of ink.</p>
    <p>In a <b>thermal inkjet</b>, the chamber has a tiny <b>heater</b> in it. A pulse of current lasting about <b>3 microseconds</b> heats a thin skin of ink to around <b>300 °C</b>. It boils instantly into a <b>vapour bubble</b> that shoves a <b>drop</b> out of the nozzle at about <b>10 m/s</b>. The bubble collapses, and fresh ink is sucked back in from behind. A nozzle can do this more than <b>10,000 times a second</b>.</p>
    <p>A <b>piezo</b> head, used by Epson, has no heater. A crystal that <b>bends</b> when you put a voltage across it squeezes the chamber instead, like pressing a dropper.</p>
    <p>The drops are measured in <b>picolitres</b>, trillionths of a litre. A 5 pL drop is about 21 µm across, smaller than a hair is thick. On paper it spreads into a dot about twice as wide.</p>
    <p class="tip"><b>Try it:</b> make the drops tiny and see gaps appear between the dots. Then switch to piezo and watch the wall bend instead of a bubble.</p>`,
  terms: [
    { t: 'Nozzle', d: 'A hole in the printhead, about 10 to 20 µm across, that one drop at a time flies out of.' },
    { t: 'Thermal inkjet', d: 'A printhead that boils a tiny bit of ink with a heater, so the bubble pushes out a drop.' },
    { t: 'Piezo inkjet', d: 'A printhead that squeezes ink out using a crystal that bends when a voltage is applied.' },
    { t: 'Picolitre (pL)', d: 'A trillionth of a litre. A 1 pL drop is about 12 µm across.' },
    { t: 'Firing rate', d: 'How many drops one nozzle can fire each second, measured in kilohertz (kHz).' },
  ],
  defaults: { kind: 'thermal', pl: 5, khz: 12, slow: 1, demo: false },
  controls: [
    { key: 'kind', type: 'seg', label: 'Printhead', options: [{ v: 'thermal', label: 'Thermal (bubble)' }, { v: 'piezo', label: 'Piezo (bending)' }], fmt: (v) => (v === 'thermal' ? 'heater boils the ink' : 'crystal squeezes the chamber') },
    { key: 'pl', type: 'log', label: 'Drop size', min: 1, max: 30, fmt: (v) => `${v < 10 ? v.toFixed(1) : Math.round(v)} pL` },
    { key: 'khz', type: 'range', label: 'Firing rate', min: 2, max: 24, step: 0.5, fmt: (v) => `${v} kHz` },
    { key: 'slow', type: 'log', label: 'Slow motion', min: 0.25, max: 16, ends: ['see the bubble', 'see the letters'], fmt: (v) => `${(Math.round(40000 / v / 100) * 100).toLocaleString()}× slower` },
  ],
  quiz: [
    { q: 'In a thermal inkjet, what actually pushes the drop out?', options: ['A tiny pump', 'A bubble of boiling ink', 'Air pressure from a fan', 'Magnetism'], answer: 1, why: 'The heater boils a thin layer of ink into a vapour bubble, and the bubble shoves ink out of the nozzle.' },
    { q: 'How big is a 5 picolitre drop?', options: ['About 2 mm across', 'About 21 µm across, thinner than a hair', 'About 1 mm across', 'Too small to measure'], answer: 1, why: 'Volume = πd³/6, so 5 pL gives d ≈ 21 µm. A human hair is about 50 to 100 µm thick.' },
    { q: 'What does a piezo printhead use instead of a heater?', options: ['A laser', 'A crystal that bends when a voltage is applied', 'A spring', 'Static electricity'], answer: 1, why: 'The piezo crystal bends and squeezes the chamber, pushing a drop out without boiling the ink.' },
  ],
  reel: [
    { ms: 5600, caption: 'A heater boils a skin of ink for 3 millionths of a second, and the bubble throws out a drop.', set: { kind: 'thermal', pl: 5, khz: 12, slow: 0.8, demo: true }, view: { pos: [3, 12.5, 12], target: [0, 11.2, -1.2] }, spin: 0 },
    { ms: 5200, caption: 'Row by row, thousands of drops a second spell out the page.', set: { kind: 'thermal', khz: 12, pl: 5, demo: false }, anim: { slow: [1, 14, true] }, view: { pos: [10, 22, 40], target: [0, 5, 8] }, spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = 10; stage.root.add(root);   // lifted so the paper sits above the floor grid
    const silicon = M.metal(0x6d7686, { roughness: 0.45, metalness: 0.5 });
    const wallMat = M.plastic(0xc9a86a, { roughness: 0.5 });
    const plateMat = M.metal(0xb7bfcc, { roughness: 0.3 });
    const inkMat = M.clear(0x2c7bd6, 0.45);
    const D = 3.2;                             // chamber depth (Z) shown: a cutaway slice from z = −D to 0
    // Silicon substrate (top), chamber walls, nozzle plate (bottom, with holes).
    const sub = box(N * P + 4, 1.2, D + 3, silicon); sub.position.set(0, 3.6, -D / 2 - 1); root.add(sub);
    for (let i = 0; i <= N; i++) {
      const w = box(1.1, 2.4, D, wallMat); w.position.set(X0 + (i - 0.5) * P, 1.8, -D / 2); root.add(w);
    }
    const hole = 1.8;                          // orifice diameter: 18 µm
    for (let i = 0; i <= N; i++) {
      const xL = i === 0 ? X0 - P / 2 - 2 : X0 + (i - 1) * P + hole / 2, xR = i === N ? X0 + (N - 1) * P + P / 2 + 2 : X0 + i * P - hole / 2;
      const seg = box(xR - xL, 0.8, D, plateMat); seg.position.set((xL + xR) / 2, -0.4, -D / 2); root.add(seg);
    }
    // Ink supply channel behind, and the ink in each chamber.
    const supply = box(N * P + 2, 2.4, 2.5, inkMat); supply.position.set(0, 1.8, -D - 1.25); root.add(supply);
    const nozzles = [];
    for (let i = 0; i < N; i++) {
      const x = X0 + i * P;
      const ink = box(P - 1.1, 2.4, D, inkMat); ink.position.set(x, 1.8, -D / 2); root.add(ink);
      const heatM = M.metal(0x8a4a3a, { emissive: new THREE.Color(0xff3a10), emissiveIntensity: 0 });
      const heater = box(2.4, 0.18, 2.2, heatM); heater.position.set(x, 2.92, -D / 2); root.add(heater);
      const piezo = box(P - 1.3, 0.35, D - 0.4, M.plastic(0xe0c060, { roughness: 0.3 })); piezo.position.set(x, 2.85, -D / 2); root.add(piezo);
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), M.clear(0xeaf6ff, 0.75, { depthWrite: false }));
      bubble.position.set(x, 2.8, -D / 2); root.add(bubble);
      const drop = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M.plastic(0x1d5fc0, { roughness: 0.15 }));
      root.add(drop);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.1, 1, 10), M.plastic(0x1d5fc0, { roughness: 0.15 }));
      root.add(tail);
      nozzles.push({ x, heatM, heater, piezo, bubble, drop, tail, fireAt: -1e9, pending: false });
    }
    // Paper strip underneath that slides towards you (the carriage really moves; relative to the head the paper moves).
    const PX = 512, PY = 392, pxPerU = PX / PW;
    const paper = canvasTexture(PX, PY, (g, W, H) => { g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, W, H); });
    paper.tex.wrapT = THREE.RepeatWrapping;
    const pg = paper.canvas.getContext('2d');
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), new THREE.MeshStandardMaterial({ map: paper.tex, roughness: 0.95 }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(0, PAPER_Y, PL / 2 - 10); root.add(sheet);
    const Z0 = sheet.position.z;
    // Grid showing where 600 dpi dots should land (faint ticks along the edge).
    stage.label('Silicon chip', [N * P / 2 + 1, 4.4, -2], root);
    const lHeat = stage.label('Heater, about 300 °C', [X0 + 3 * P + 1.6, 3.5, 0.6], root, 'hot');
    const lPiezo = stage.label('Piezo crystal bends', [X0 + 3 * P + 1.6, 3.6, 0.6], root, 'hot');
    stage.label('Ink chamber', [X0 + 6 * P + 3.5, 1.2, 0.4], root);
    stage.label('Nozzle, 18 µm', [X0 + 5 * P, -1.6, 0.6], root);
    stage.label('Ink supply', [X0 + 6 * P + 3, 2.6, -D - 1.5], root);
    stage.label('Paper (gap drawn shorter)', [PW / 2 - 6, PAPER_Y + 0.2, 12], root);
    const lDrop = stage.label('', [X0 + 6 * P + 2.5, -5, 0], root);

    const cols = dotColumns('INK DOTS  ');
    let sim = 0, travel = 0, col = 0, lastCol = -1, redraw = 0;
    const ringRow = (z) => ((((z - Z0 + PL / 2) - travel) / PL) % 1 + 1) % 1 * PY;
    // The paper canvas's rows map along Z (row 0 = far end). Dots are drawn at the landing spot.
    const landDot = (x, dUm) => {
      const r = Math.max(1, (dUm / 10 / 2) * pxPerU);
      const cx = (x + PW / 2) * pxPerU, cy = ringRow(0);
      pg.fillStyle = 'rgba(25,70,160,0.92)';
      for (const off of [-PY, 0, PY]) { pg.beginPath(); pg.arc(cx, cy + off, r, 0, TAU); pg.fill(); }
    };

    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const thermal = s.kind === 'thermal';
        const period = 1000 / s.khz;                       // µs between firings
        const dUm = dropDiameterUm(s.pl), rU = dUm / 20;   // drop radius in units
        const vIn = carriageSpeed(s.khz, DPI);             // inches per second
        const vU = (vIn * 25400) / 1e6 / 10;               // units per µs
        const dsim = dt * US_PER_S * s.slow;
        sim += dsim;
        const prev = travel; travel += vU * dsim;
        // Clear the paper entering at the far end (rows between the old and new far-edge positions).
        const mod = (v, m) => ((v % m) + m) % m;
        const yN = mod(-travel / PL, 1) * PY, hC = mod(mod(-prev / PL, 1) * PY - yN, PY) + 2;
        if (hC < PY / 2) {
          pg.fillStyle = '#fbfaf5';
          const y0 = Math.floor(yN) - 1;
          pg.fillRect(0, y0, PX, hC); if (y0 < 0) pg.fillRect(0, PY + y0, PX, -y0); if (y0 + hC > PY) pg.fillRect(0, 0, PX, y0 + hC - PY);
        }
        // A new dot column arrives under the nozzles every period: fire the nozzles whose pixel is on.
        const c = Math.floor(sim / period);
        if (c !== lastCol) {
          lastCol = c; const bits = s.demo ? 127 : cols[col % cols.length]; col++;
          nozzles.forEach((n, i) => { if (bits & (1 << (N - 1 - i))) { n.fireAt = c * period; n.pending = true; } });
        }
        const flightUs = (Math.abs(PAPER_Y) * 10) / TIJ.dropMs;   // drawn gap / 10 m/s (10 µm per µs)
        let showT = null;
        nozzles.forEach((n) => {
          const t = sim - n.fireAt;                        // µs since this nozzle fired
          // Heater pulse 0–3 µs; bubble grows to its peak by ~8 µs, collapses by ~20 µs.
          const heat = thermal && t >= 0 && t < TIJ.pulseUs ? 1 : 0;
          n.heatM.emissiveIntensity = heat * 2.2 + (thermal && t >= 0 && t < 12 ? Math.max(0, 0.6 - t * 0.05) : 0);
          n.heater.visible = thermal; n.piezo.visible = !thermal;
          let bub = 0;
          if (thermal && t >= 0 && t < TIJ.collapseUs) bub = t < TIJ.bubblePeakUs ? Math.sin((t / TIJ.bubblePeakUs) * Math.PI / 2) : Math.cos(((t - TIJ.bubblePeakUs) / (TIJ.collapseUs - TIJ.bubblePeakUs)) * Math.PI / 2);
          const size = Math.cbrt(s.pl / 5);
          n.bubble.visible = bub > 0.02;
          n.bubble.scale.set(1.25 * size * bub + 0.01, 1.15 * size * bub + 0.01, 1.1 * size * bub + 0.01);
          n.bubble.position.y = 2.8 - 1.0 * size * bub;
          // Piezo: the crystal plate bends down into the chamber for ~6 µs, then springs back.
          const bend = !thermal && t >= 0 && t < 14 ? Math.sin(clamp(t / 14, 0, 1) * Math.PI) : 0;
          n.piezo.position.y = 2.85 - bend * 0.7; n.piezo.scale.y = 1 + bend * 0.6;
          // Drop: pushed out from 2 µs, breaks off at ~12 µs, then flies at 10 m/s = 1 unit/µs to the paper.
          const tOut = t - 2;
          if (tOut > 0 && tOut < 10 + flightUs) {
            const yTip = tOut < 10 ? -0.2 - tOut * 0.45 : -4.7 - (tOut - 10) * ((Math.abs(PAPER_Y) - 4.7) / flightUs);
            n.drop.visible = true; n.drop.scale.setScalar(rU * (tOut < 10 ? 0.4 + 0.06 * tOut : 1));
            n.drop.position.set(n.x, yTip, -D / 2);
            const tailL = tOut < 10 ? Math.max(0.1, -yTip - 0.2) : Math.max(0.01, 3 - (tOut - 10) * 0.8);
            n.tail.visible = tailL > 0.05; n.tail.scale.set(rU * 0.8, tailL, rU * 0.8);
            n.tail.position.set(n.x, yTip + tailL / 2, -D / 2);
            if (showT === null) showT = tOut;
          } else { n.drop.visible = false; n.tail.visible = false; }
          if (n.pending && tOut >= 10 + flightUs) { n.pending = false; landDot(n.x, dUm * SPREAD); }
        });
        lHeat.visible = thermal; lPiezo.visible = !thermal;
        lDrop.element.textContent = `Drop: ${s.pl < 10 ? s.pl.toFixed(1) : Math.round(s.pl)} pL, ${Math.round(dUm)} µm, 10 m/s`;
        paper.tex.offset.y = travel / PL;
        redraw += dt; if (redraw > 0.05) { paper.tex.needsUpdate = true; redraw = 0; }
      },
      readout: (s) => {
        const d = dropDiameterUm(s.pl), dot = d * SPREAD, pitch = pitchUm(DPI);
        const fit = dot < pitch * 0.9 ? '<b class="no">gaps between dots</b>' : dot > pitch * 1.6 ? '<b>dots overlap a lot</b>' : '<b class="ok">dots just touch</b>';
        const pp = inkjetPpm(s.khz, DPI, HEAD.black);
        const pageDots = 8.27 * 11.69 * DPI * DPI * 0.05, ul = (pageDots * s.pl) / 1e6;
        return `<div class="big">${Math.round(d)} µm drop, ${Math.round(dot)} µm dot</div>
          <div class="row"><span>Dot grid at ${DPI} dpi</span>${fit}</div>
          <div class="row"><span>One firing every</span><b>${(1000 / s.khz).toFixed(0)} µs</b></div>
          <div class="row"><span>Carriage speed (f ÷ dpi)</span><b>${pp.v.toFixed(0)} in/s, ${(pp.v * 0.0254).toFixed(2)} m/s</b></div>
          <div class="row"><span>Draft black page, ${HEAD.black} nozzles</span><b>about ${pp.ppm.toFixed(0)} pages/min</b></div>
          <div class="row"><span>Ink for a 5% page, one drop a dot</span><b>${ul.toFixed(1)} µL</b></div>
          <small>${s.kind === 'thermal' ? 'Heater pulse 3 µs, ink skin about 300 °C.' : 'No heat: a voltage bends the piezo crystal.'} Nozzles 1/600 inch apart.</small>`;
      },
    };
  },
};
