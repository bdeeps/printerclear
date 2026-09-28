// Chapter 5: three other printers. Dot matrix (pins hit a ribbon, still used for bank passbooks and
// counter tickets), direct thermal (heat darkens special paper, like shop receipts), and a 3D printer
// that builds a small kulhad (clay tea cup) shape out of melted plastic, layer by layer.
import { THREE, M, box, rod, canvasTexture, swarm, clamp } from '../kit.js';
import { dotColumns, TAU } from '../printer.js';

const KINDS = [{ v: 'dot', label: 'Dot matrix' }, { v: 'thermal', label: 'Thermal receipt' }, { v: 'fdm', label: '3D printer' }];
// 3D print: a kulhad 8 cm tall. Real layers 0.2 mm, nozzle 0.4 mm, PLA at about 190–220 °C, 50 mm/s.
const CUP_H = 80, LAYER = 0.2, SPEED = 50, SHOWN = 44;                    // mm, mm, mm/s, layers drawn
const cupR = (h) => 26 + 12 * Math.pow(h / CUP_H, 0.9) - 3 * Math.sin((h / CUP_H) * Math.PI);  // outer radius (mm) at height h
const LINES = ['28/09/26 UPI CR   5,000.00', '29/09/26 ATM DR   2,000.00', '30/09/26 INT CR      41.00', 'BAL              13,041.00'];

export default {
  id: 'others',
  short: 'Other printers',
  title: 'Pins, heat and plastic',
  subtitle: 'The dot-matrix printer at the bank, the receipt printer at the shop, and the 3D printer that prints things you can hold.',
  view: { pos: [0.6, 4.6, 7.0], target: [0.2, 0.9, 0.2] },
  learn: `<p><b>Dot matrix.</b> A print head with a column of <b>9 or 24 steel pins</b>, each fired by a tiny electromagnet, slams through an inked <b>ribbon</b> onto the paper. Letters are built from a grid of dots, 5 across and 7 down here. Because it strikes hard, it can print through <b>carbon copies</b> and onto thick <b>bank passbooks</b>. That's why Indian banks still use passbook printers, and railway counters have long printed tickets on them.</p>
    <p><b>Thermal.</b> Shop receipts use no ink at all. The paper is coated with a colourless <b>dye</b> and an acid <b>developer</b>. A row of tiny heaters, 8 per millimetre, warms dots of the coating until they melt together and turn black. It's cheap and quiet, but receipts fade in sunlight and heat.</p>
    <p><b>3D printing.</b> A common home 3D printer (<b>FDM</b>) pushes a plastic thread through a hot nozzle at about 200 °C. It draws one thin <b>layer</b>, about 0.2 mm thick, then moves up and draws the next on top, like building a cup from coils of clay.</p>
    <p class="tip"><b>Try it:</b> switch between the three machines. On the 3D printer, change the layer height and see how the print time changes.</p>`,
  terms: [
    { t: 'Dot matrix', d: 'A printer whose head has a column of pins that strike an inked ribbon to make dots.' },
    { t: 'Impact printer', d: 'A printer that hits the paper, so it can print several carbon copies at once.' },
    { t: 'Thermal paper', d: 'Paper coated with a dye and developer that turn dark where they are heated.' },
    { t: 'FDM', d: 'Fused deposition modelling: 3D printing by squeezing melted plastic out of a moving nozzle.' },
    { t: 'Layer height', d: 'How thick each slice of a 3D print is. Thinner layers look smoother but take longer.' },
  ],
  defaults: { kind: 'dot', layer: 0.2, run: true },
  controls: [
    { key: 'kind', type: 'seg', label: 'Printer', options: KINDS },
    { key: 'layer', type: 'range', label: '3D print layer height', min: 0.08, max: 0.32, step: 0.02, fmt: (v) => v.toFixed(2) + ' mm' },
    { key: 'run', type: 'toggle', label: 'Printing' },
  ],
  onChange(s, key) { if (key === 'layer' && s.kind !== 'fdm') s.kind = 'fdm'; },
  quiz: [
    { q: 'Why do banks use dot-matrix printers for passbooks?', options: ['They are colourful', 'The pins strike hard enough to print on thick books and carbon copies', 'They are silent', 'They use no ink'], answer: 1, why: 'An impact printer presses a ribbon onto the page, so it works on thick passbooks and multi-part forms.' },
    { q: 'How does a thermal receipt printer make black marks?', options: ['It sprays ink', 'It heats a special coating on the paper, which turns dark', 'It burns the paper', 'It uses a laser'], answer: 1, why: 'The paper carries a colourless dye and a developer. Heat melts them together and the dye turns dark.' },
    { q: 'What does halving the layer height of a 3D print do?', options: ['Halves the time', 'Roughly doubles the time but makes it smoother', 'Makes it hollow', 'Nothing'], answer: 1, why: 'Twice as many layers means the nozzle has to travel about twice as far.' },
  ],
  reel: [
    { ms: 5000, caption: 'A dot-matrix head fires steel pins through a ribbon: still how many bank passbooks are printed.', set: { kind: 'dot', run: true }, view: { pos: [2.2, 3.4, 6.6], target: [0.3, 0.8, 0] }, spin: 0 },
    { ms: 5200, caption: 'A 3D printer draws in melted plastic, one layer a fifth of a millimetre thick at a time.', set: { kind: 'fdm', run: true, layer: 0.2 }, view: { pos: [3.4, 5.6, 8.4], target: [0.4, 1.6, 0] }, spin: 0.35 },
  ],

  build({ stage }) {
    const groups = {};
    const labels = {};
    // ---------------------------------------------------------------- dot matrix passbook printer
    {
      const g = new THREE.Group(); stage.root.add(g); groups.dot = g; labels.dot = [];
      const PW = 5.2, PD = 3.0;                                      // page area (drawn)
      const bed = box(6.2, 0.2, 3.8, M.plastic(0x3a3f4c)); bed.position.y = 0.1; g.add(bed);
      const PX = 832, PY = 480;
      const page = canvasTexture(PX, PY, (c) => {
        c.fillStyle = '#eef3ea'; c.fillRect(0, 0, PX, PY);
        c.strokeStyle = 'rgba(40,90,120,.35)'; c.lineWidth = 2;
        for (let y = 60; y < PY; y += 90) { c.beginPath(); c.moveTo(0, y); c.lineTo(PX, y); c.stroke(); }
        c.fillStyle = 'rgba(40,90,120,.8)'; c.font = 'bold 22px sans-serif'; c.fillText('DATE      PARTICULARS        AMOUNT', 20, 40);
      });
      const pctx = page.canvas.getContext('2d');
      const book = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), new THREE.MeshStandardMaterial({ map: page.tex, roughness: 0.9 }));
      book.rotation.x = -Math.PI / 2; book.position.y = 0.24; g.add(book);
      const cover = box(PW + 0.2, 0.06, PD + 0.2, M.plastic(0x1d4f8a)); cover.position.y = 0.2; g.add(cover);
      const railA = rod(-3.1, 3.1, 0.06, 0.06, M.metal()); railA.position.set(0, 1.35, -0.6); railA.userData.z = -0.6; g.add(railA);
      const railB = rod(-3.1, 3.1, 0.06, 0.06, M.metal()); railB.position.set(0, 1.35, 0.6); g.add(railB);
      for (const x of [-3.1, 3.1]) { const side = box(0.12, 1.3, 1.6, M.plastic(0x3a3f4c)); side.position.set(x, 0.85, 0); g.add(side); }
      const ribbon = box(6.0, 0.02, 0.5, M.matte(0x15151a)); g.add(ribbon);
      const head = new THREE.Group(); g.add(head);
      const hbody = box(0.7, 0.7, 1.5, M.plastic(0x4a5060)); hbody.position.y = 1.35; head.add(hbody);
      const nose = box(0.3, 0.5, 0.6, M.metal(0x9aa3b2)); nose.position.y = 0.8; head.add(nose);
      const pins = [];
      const rowD = 0.075;                                            // pin spacing (drawn)
      for (let b = 0; b < 7; b++) { const p = rod(0, 0.5, 0.018, 0.018, M.metal(0xe4e8ef)); p.rotation.z = Math.PI / 2; p.position.set(0, 0.62, (b - 3) * rowD); head.add(p); pins.push(p); }
      // Each line of text: character columns, printed left to right.
      const cols = LINES.map((l) => dotColumns(l));
      const dotPx = 5.2;                                             // canvas px per dot column
      labels.dot.push(stage.label('Print head: 7 of its pins shown', [0, 2.1, 0.6], head, 'hot'), stage.label('Inked ribbon', [-2.6, 0.55, 0.45], g), stage.label('Passbook', [-2.2, 0.3, 1.7], g));
      g.userData = {
        line: 0, col: 0, acc: 0, pctx, page, cols, dotPx, head, pins, ribbon, PW, PD, PX, PY,
        reset() { this.line = 0; this.col = 0; page.redraw(); },
      };
    }
    // ---------------------------------------------------------------- thermal receipt printer
    {
      const g = new THREE.Group(); stage.root.add(g); groups.thermal = g; labels.thermal = [];
      const W = 2.4;                                                 // 80 mm roll, 72 mm printed (576 dots)
      const body = box(3.4, 1.4, 2.6, M.plastic(0x2a2e38, { transparent: true, opacity: 0.4, depthWrite: false })); body.position.set(0, 0.7, -0.3); g.add(body);
      const roll = rod(-W / 2, W / 2, 0.75, 0.75, M.matte(0xf6f6f2)); roll.position.set(0, 0.85, -0.7); g.add(roll);
      const core = rod(-W / 2 - 0.02, W / 2 + 0.02, 0.2, 0.2, M.plastic(0x8a6a40)); core.position.copy(roll.position); g.add(core);
      const platen = rod(-W / 2, W / 2, 0.22, 0.22, M.matte(0x1b1b20)); platen.position.set(0, 1.55, 0.55); g.add(platen);
      // Receipt content, 576 dots wide (8 dots per mm across 72 mm).
      const RW = 576, RH = 900;
      const src = document.createElement('canvas'); src.width = RW; src.height = RH;
      const sc = src.getContext('2d'); sc.fillStyle = '#fff'; sc.fillRect(0, 0, RW, RH); sc.fillStyle = '#000';
      sc.font = 'bold 54px monospace'; sc.textAlign = 'center'; sc.fillText('CHAI CORNER', RW / 2, 80);
      sc.font = '30px monospace'; sc.fillText('Bengaluru', RW / 2, 125);
      sc.textAlign = 'left'; sc.font = '32px monospace';
      [['Masala chai x2', '60.00'], ['Samosa x2', '40.00'], ['Bun maska', '35.00']].forEach(([a, b], i) => { sc.fillText(a, 20, 220 + i * 50); sc.fillText(b, 440, 220 + i * 50); });
      sc.fillRect(20, 380, 536, 4);
      sc.font = 'bold 40px monospace'; sc.fillText('TOTAL', 20, 440); sc.fillText('135.00', 400, 440);
      sc.font = '28px monospace'; sc.fillText('Paid by UPI. Thank you!', 50, 520);
      for (let i = 0; i < 60; i++) if ((i * 7919) % 3) sc.fillRect(60 + i * 7.5, 580, (i % 3) + 2, 120);
      const sdata = sc.getImageData(0, 0, RW, RH).data;
      const SHOW = 330;                                              // rows of paper visible above the head
      const rec = canvasTexture(RW, SHOW, () => {});
      const rctx = rec.canvas.getContext('2d');
      const paperGeo = new THREE.PlaneGeometry(W, (W * SHOW) / RW);
      const strip = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: rec.tex, roughness: 0.8, side: THREE.DoubleSide }));
      const stripH = (W * SHOW) / RW;
      strip.position.set(0, 1.55 + stripH / 2 + 0.2, 0.78); strip.rotation.x = -0.18; g.add(strip);
      const heatLine = canvasTexture(RW, 4, () => {});
      const hctx = heatLine.canvas.getContext('2d');
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.08), new THREE.MeshBasicMaterial({ map: heatLine.tex, toneMapped: false, transparent: true }));
      hl.position.set(0, 1.62, 0.77); g.add(hl);
      const headBar = box(W + 0.2, 0.18, 0.12, M.metal(0x7b8391)); headBar.position.set(0, 1.5, 0.84); g.add(headBar);
      labels.thermal.push(stage.label('Paper roll', [-1.3, 1.0, -0.7], g), stage.label('Heater line: 576 dots, 8 per mm', [1.7, 1.25, 1.0], g, 'hot'), stage.label('Receipt', [1.6, 2.7, 0.8], g));
      g.userData = { printed: 0, acc: 0, RW, RH, SHOW, sc, sdata, rctx, rec, hctx, heatLine, src, roll };
    }
    // ---------------------------------------------------------------- FDM 3D printer
    {
      const g = new THREE.Group(); stage.root.add(g); groups.fdm = g; labels.fdm = [];
      const S = 0.03;                                                // units per mm
      const frame = M.metal(0x3b414d, { roughness: 0.4 });
      const base = box(4.2, 0.2, 3.6, frame); base.position.y = 0.1; g.add(base);
      const bedM = box(3.2, 0.08, 3.2, M.metal(0x20242c, { roughness: 0.25 })); bedM.position.y = 0.3; g.add(bedM);
      for (const x of [-1.9, 1.9]) { const p = box(0.14, 4.2, 0.14, frame); p.position.set(x, 2.2, -1.5); g.add(p); }
      const gantry = rod(-1.95, 1.95, 0.06, 0.06, M.metal()); g.add(gantry);
      const hot = new THREE.Group(); g.add(hot);
      const hb = box(0.45, 0.45, 0.45, M.plastic(0x2a6fd1)); hb.position.y = 0.45; hot.add(hb);
      const block = box(0.22, 0.14, 0.22, M.metal(0xc0c6cf, { emissive: new THREE.Color(0xff4020), emissiveIntensity: 0.3 })); block.position.y = 0.16; hot.add(block);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 12), M.metal(0xd6b25a)); tip.rotation.x = Math.PI; tip.position.y = 0.05; hot.add(tip);
      const spool = rod(-0.3, 0.3, 0.7, 0.7, M.plastic(0xd8742a)); spool.rotation.y = Math.PI / 2; spool.position.set(2.5, 2.8, -1.4); g.add(spool);
      const fil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.5, 2.1, -1.2), new THREE.Vector3(1.6, 3.4, -0.6), new THREE.Vector3(0, 1.4, 0)]), 30, 0.02, 6), M.plastic(0xd8742a));
      g.add(fil);
      // The cup's beads: SHOWN layers, each a ring of short segments (bottom layers filled in).
      const SEG = 48, beads = [];
      for (let L = 0; L < SHOWN; L++) {
        const h = ((L + 0.5) / SHOWN) * CUP_H, R0 = cupR(h);
        const rings = L < 3 ? [R0, R0 * 0.7, R0 * 0.4] : [R0, R0 - 1.2];
        for (const r of rings) for (let k = 0; k < SEG; k++) beads.push({ L, a0: (k / SEG) * TAU, a1: ((k + 1) / SEG) * TAU, r, h });
      }
      const bh = CUP_H / SHOWN * S;
      const bm = swarm(beads.length, new THREE.CylinderGeometry(bh * 0.55, bh * 0.55, 1, 6), M.plastic(0xd8742a, { roughness: 0.55 }));
      bm.count = 0; g.add(bm);
      const tmp = new THREE.Object3D();
      beads.forEach((b, i) => {
        const x0 = Math.cos(b.a0) * b.r * S, z0 = Math.sin(b.a0) * b.r * S, x1 = Math.cos(b.a1) * b.r * S, z1 = Math.sin(b.a1) * b.r * S;
        tmp.position.set((x0 + x1) / 2, 0.34 + b.h * S, (z0 + z1) / 2);
        tmp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - x0, 0, z1 - z0).normalize());
        tmp.scale.set(1, Math.hypot(x1 - x0, z1 - z0) * 1.15, 1); tmp.updateMatrix(); bm.setMatrixAt(i, tmp.matrix);
      });
      bm.instanceMatrix.needsUpdate = true;
      labels.fdm.push(stage.label('Hot nozzle, about 200 °C', [0.6, 0.2, 0.3], hot, 'hot'), stage.label('Plastic filament', [2.5, 3.7, -1.4], g), stage.label('Heated bed', [-1.4, 0.45, 1.5], g));
      g.userData = { beads, bm, hot, gantry, S, acc: 0, n: 0 };
    }

    const dot = groups.dot.userData, th = groups.thermal.userData, fd = groups.fdm.userData;
    // Each machine gets its own camera framing.
    const VIEWS = { dot: [[0.6, 4.6, 7.0], [0.2, 0.9, 0.2]], thermal: [[1.4, 4.0, 5.8], [-0.2, 1.7, 0]], fdm: [[3.4, 5.6, 8.4], [0.4, 1.6, 0]] };
    let t = 0, lastKind = 'dot';
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        if (s.kind !== lastKind) { lastKind = s.kind; stage.setView(...VIEWS[s.kind], 0.9); }
        for (const k in groups) { groups[k].visible = s.kind === k; labels[k].forEach((l) => { l.visible = s.kind === k; }); }
        if (!s.run) return;
        if (s.kind === 'dot') {
          // About 60 dot columns a second in the model (a real head does a few hundred characters a second).
          dot.acc += dt * 60;
          const cols = dot.cols[dot.line];
          while (dot.acc >= 1) {
            dot.acc -= 1;
            if (dot.col >= cols.length + 25) { dot.line++; dot.col = 0; if (dot.line >= dot.cols.length) { dot.reset(); } break; }
            const bits = cols[dot.col] || 0, x = 20 + dot.col * dot.dotPx, y0 = 78 + dot.line * 90;
            dot.pctx.fillStyle = 'rgba(20,24,40,.9)';
            for (let b = 0; b < 7; b++) if (bits & (1 << b)) { dot.pctx.beginPath(); dot.pctx.arc(x, y0 + b * 6.5, 2.6, 0, TAU); dot.pctx.fill(); }
            dot.lastBits = bits; dot.col++;
          }
          dot.page.tex.needsUpdate = true;
          const cx = -dot.PW / 2 + ((20 + dot.col * dot.dotPx) / dot.PX) * dot.PW, cz = -dot.PD / 2 + ((78 + 20 + dot.line * 90) / dot.PY) * dot.PD;
          dot.head.position.set(cx, 0, clamp(cz, -dot.PD / 2, dot.PD / 2));
          dot.ribbon.position.set(0, 0.29, dot.head.position.z);
          dot.pins.forEach((p, b) => { const on = (dot.lastBits || 0) & (1 << b); p.position.y = on && (t * 60) % 1 < 0.6 ? 0.55 : 0.62; });
        } else if (s.kind === 'thermal') {
          th.acc += dt * 140;                                       // rows per second in the model
          let rowNow = -1;
          while (th.acc >= 1) { th.acc -= 1; th.printed = (th.printed + 1) % (th.RH + 200); rowNow = th.printed; }
          const p = th.printed;
          th.rctx.fillStyle = '#fbfbf8'; th.rctx.fillRect(0, 0, th.RW, th.SHOW);
          // Newest row sits at the bottom (by the head); older rows have moved up.
          const top = p - th.SHOW;
          const sy = Math.max(0, top), sh = Math.min(th.RH, p) - sy;
          if (sh > 0) th.rctx.drawImage(th.src, 0, sy, th.RW, sh, 0, sy - top, th.RW, sh);
          th.rec.tex.needsUpdate = true;
          // Heater line: glowing dots where the current row has black.
          th.hctx.clearRect(0, 0, th.RW, 4);
          if (p < th.RH) { th.hctx.fillStyle = '#ff5a2a'; for (let x = 0; x < th.RW; x++) if (th.sdata[(p * th.RW + x) * 4] < 128) th.hctx.fillRect(x, 0, 1, 4); }
          th.heatLine.tex.needsUpdate = true;
          th.roll.rotation.x -= dt * 0.8;
        } else {
          const perLayerSec = 2.2;                                   // drawn speed: one shown layer ≈ 2.2 s
          fd.acc += dt / perLayerSec;
          const layersDone = fd.acc % (SHOWN + 4);
          const idx = Math.min(fd.beads.length, Math.floor(layersDone * (fd.beads.length / SHOWN)));
          fd.bm.count = idx;
          const b = fd.beads[Math.min(fd.beads.length - 1, idx)];
          const a = b.a0 + (b.a1 - b.a0) * ((layersDone * (fd.beads.length / SHOWN)) % 1);
          const x = Math.cos(a) * b.r * fd.S, z = Math.sin(a) * b.r * fd.S, y = 0.34 + b.h * fd.S + 0.08;
          fd.hot.position.set(x, idx >= fd.beads.length ? 2.2 : y, z);
          fd.gantry.position.set(0, fd.hot.position.y + 0.45, z);
        }
      },
      readout: (s) => {
        if (s.kind === 'dot') return `<div class="big">Dot matrix</div>
          <div class="row"><span>Pins in the head</span><b>9 or 24 (7 used for these letters)</b></div>
          <div class="row"><span>Each letter</span><b>5 × 7 dots</b></div>
          <div class="row"><span>Real speed range</span><b>30 to 1,550 characters/s</b></div>
          <small>Loud, but it can print carbon copies and thick passbooks. Slowed down here.</small>`;
        if (s.kind === 'thermal') return `<div class="big">Direct thermal</div>
          <div class="row"><span>Heaters across 72 mm</span><b>576 (8 per mm, 203 dpi)</b></div>
          <div class="row"><span>Ink, toner or ribbon</span><b>none</b></div>
          <div class="row"><span>Coating darkens at around</span><b>100 °C</b></div>
          <small>Heat melts a colourless dye into an acid developer and it turns black. Keep receipts out of the sun.</small>`;
        const lh = s.layer, layers = Math.round(CUP_H / lh);
        // Path per layer: two walls round the cup, plus a filled base for the first 1.2 mm.
        let path = 0;
        for (let L = 0; L < layers; L++) { const h = (L + 0.5) * lh, r = cupR(h); path += TAU * (r + (r - 0.45)); if (h < 1.2) path += (Math.PI * r * r) / 0.45; }
        const mins = path / SPEED / 60;
        return `<div class="big">3D printing a kulhad</div>
          <div class="row"><span>Cup height</span><b>${CUP_H} mm</b></div>
          <div class="row"><span>Layers at ${lh.toFixed(2)} mm each</span><b>${layers}</b></div>
          <div class="row"><span>Nozzle travel at ${SPEED} mm/s</span><b>${(path / 1000).toFixed(0)} m</b></div>
          <div class="row"><span>Print time, about</span><b>${mins >= 60 ? Math.floor(mins / 60) + ' h ' + Math.round(mins % 60) + ' min' : Math.round(mins) + ' min'}</b></div>
          <small>Nozzle 0.4 mm wide, PLA plastic at about 190 to 220 °C. ${SHOWN} layers drawn.</small>`;
      },
    };
  },
};
