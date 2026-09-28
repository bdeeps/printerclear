// Chapter 4: the laser printer's drum cycle, seen from the end of the drum. Charge → expose → develop →
// transfer → fuse, and clean. The drum's surface keeps a real map of charge and toner that each
// station changes as it passes, and the paper carries off what the drum gives it.
import { THREE, M, box, arrow, canvasTexture, swarm, clamp } from '../kit.js';
import { DRUM, FUSER_C, laserScan, TAU } from '../printer.js';

const R = 1.5, LEN = 4;                           // drum radius and length (drawn)
const U = 360, V = 96;                            // drum surface map: around × along
const PK = 700, PAPER_X0 = -7, PAPER_L = 15;      // paper map columns and extent
const STN = {                                     // world angles (radians) of each station round the drum
  clean: -Math.PI / 4 + 0.05, charge: Math.PI / 6, expose: Math.PI / 2, develop: Math.PI, transfer: -Math.PI / 2,
};
const FUSER_X = 4.6;
const STEPS = [
  { v: 'all', label: 'All' }, { v: 'charge', label: '1 Charge' }, { v: 'expose', label: '2 Expose' }, { v: 'develop', label: '3 Develop' },
  { v: 'transfer', label: '4 Transfer' }, { v: 'fuse', label: '5 Fuse' }, { v: 'clean', label: '6 Clean' },
];
const TXT = {
  all: 'Every part of the drum goes round the same loop: charge, expose, develop, transfer, clean.',
  charge: `A charge roller sprays the drum's coating with electrons, to about ${DRUM.charged} V all over.`,
  expose: `The laser flicks on for every dot of ink. Where light hits, the coating conducts and the charge leaks away, to about ${DRUM.exposed} V.`,
  develop: `Toner is charged negative. The developer roller sits at ${DRUM.bias} V, so toner is pushed onto the less-negative laser spots and kept off the rest.`,
  transfer: 'A roller under the paper pulls the other way (positive), so the toner jumps from the drum onto the paper.',
  fuse: `The fuser roller at about ${FUSER_C} °C melts the plastic toner and a rubber roller squeezes it into the paper fibres.`,
  clean: 'A rubber blade scrapes off leftover toner and a lamp wipes away the old charge, ready for the next turn.',
};

export default {
  id: 'laser',
  short: 'Laser printing',
  title: 'Painting with static',
  subtitle: 'A laser draws the page as a pattern of electric charge. Powder sticks to the pattern and is melted onto paper.',
  view: { pos: [0.2, 12.5, 8.8], target: [0.2, 2.2, 0.2] },
  learn: `<p>The heart of a laser printer is the <b>drum</b>, a tube with a special coating called a <b>photoconductor</b>. In the dark it holds static charge like a balloon rubbed on your hair. Where light shines on it, the charge leaks away.</p>
    <p><b>1. Charge.</b> A roller coats the drum with negative charge, about −700 volts. <b>2. Expose.</b> A laser draws the page, one thin line at a time. A <b>spinning mirror</b> with six faces sweeps the beam across the drum, thousands of lines a second. Every spot the beam hits loses its charge. Now the page exists as an invisible picture of charge.</p>
    <p><b>3. Develop.</b> <b>Toner</b>, a plastic powder a few micrometres across, is also given a negative charge. It is pushed away from the charged drum but lands on the spots the laser drew. <b>4. Transfer.</b> A roller under the paper pulls the toner off the drum onto the page. <b>5. Fuse.</b> Hot rollers at about <b>150 to 200 °C</b> melt the toner into the paper. <b>6. Clean.</b> A blade and a lamp wipe the drum for its next turn.</p>
    <p>The same trick, <b>xerography</b>, was invented in 1938 for photocopiers. A photocopier uses a lamp and a photo of your page instead of a laser.</p>
    <p class="tip"><b>Try it:</b> step through the six stages. Then raise the pages per minute and see how fast the mirror has to spin.</p>`,
  terms: [
    { t: 'Photoconductor', d: 'A material that is an insulator in the dark but conducts electricity when light shines on it.' },
    { t: 'Polygon mirror', d: 'A spinning mirror with several flat faces. Each face sweeps the laser across the drum once.' },
    { t: 'Toner', d: 'A powder of plastic and pigment, just micrometres across, that is charged so it can be moved by static.' },
    { t: 'Fuser', d: 'A hot roller and a pressure roller that melt toner and press it into the paper.' },
    { t: 'Xerography', d: 'Printing or copying with static charge, light and powder. Its name means "dry writing".' },
  ],
  defaults: { step: 'all', speed: 1, ppm: 20, dpi: 600, facets: 6 },
  controls: [
    { key: 'step', type: 'seg', label: 'Show a stage', options: STEPS, fmt: (v) => (v === 'all' ? 'the full cycle' : '') },
    { key: 'speed', type: 'range', label: 'Model speed', min: 0.2, max: 2, step: 0.05, ends: ['slow', 'fast'], fmt: (v) => v.toFixed(2) + '×' },
    { key: 'ppm', type: 'range', label: 'Printer speed', min: 5, max: 60, step: 1, fmt: (v) => `${v} pages/min` },
    { key: 'dpi', type: 'seg', label: 'Resolution', options: [300, 600, 1200].map((v) => ({ v, label: v + ' dpi' })) },
    { key: 'facets', type: 'seg', label: 'Mirror faces', options: [4, 6, 8].map((v) => ({ v, label: String(v) })) },
  ],
  quiz: [
    { q: 'What does the laser actually do to the drum?', options: ['Burns the image into it', 'Lets the charge leak away wherever it shines', 'Heats the toner', 'Cuts the paper'], answer: 1, why: 'The photoconductor conducts where light hits it, so those spots lose their charge. That pattern is the page.' },
    { q: 'Why does toner stick only to the spots the laser hit?', options: ['They are sticky', 'Toner and drum are both negative, so toner is pushed off the charged areas and lands on the discharged spots', 'Magnets pull it', 'Gravity'], answer: 1, why: 'Like charges repel. The discharged spots are the only places toner can settle.' },
    { q: 'What does the fuser do?', options: ['Charges the drum', 'Melts the toner into the paper with heat and pressure', 'Cools the paper', 'Cuts the page'], answer: 1, why: 'Until it is fused, toner is loose powder that would rub off. The fuser melts it in.' },
  ],
  reel: [
    { ms: 5600, caption: 'A laser draws the page as a pattern of charge on a spinning drum, and powder sticks to the pattern.', set: { step: 'expose', speed: 1.2 }, spin: 0 },
    { ms: 5000, caption: 'The powder rolls onto the paper and a roller at about 190 °C melts it in.', set: { step: 'fuse', speed: 1.3 }, view: { pos: [7, 6, 10], target: [2.6, 1.6, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = 2.7; stage.root.add(root);   // lifted above the floor
    // ---- the drum and its surface map
    const charge = new Float32Array(U * V).fill(DRUM.charged), toner = new Float32Array(U * V).fill(0);
    const dtex = canvasTexture(U, V, () => {});
    const dctx = dtex.canvas.getContext('2d'), dimg = dctx.createImageData(U, V);
    const drumGeo = new THREE.CylinderGeometry(R, R, LEN, 96, 1, true); drumGeo.rotateX(Math.PI / 2);
    const drum = new THREE.Mesh(drumGeo, new THREE.MeshStandardMaterial({ map: dtex.tex, roughness: 0.35, metalness: 0.1 }));
    root.add(drum);
    for (const z of [-LEN / 2, LEN / 2]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 64), M.metal(0x8a929e, { side: THREE.DoubleSide })); cap.position.z = z; root.add(cap); }
    const polar = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
    // ---- stations
    const zRod = (r, mat, len = LEN) => { const g = new THREE.CylinderGeometry(r, r, len, 40); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
    root.add(zRod(0.12, M.metal(), LEN + 0.6));   // axle
    const chgR = zRod(0.28, M.matte(0x3a3a44)); chgR.position.set(...polar(STN.charge, R + 0.28), 0); root.add(chgR);
    const devR = zRod(0.45, M.metal(0x6b7280, { roughness: 0.5 })); devR.position.set(...polar(STN.develop, R + 0.46), 0); root.add(devR);
    const hopper = box(1.3, 2.0, LEN, M.clear(0x9aa3b2, 0.22)); hopper.position.set(-R - 1.55, 0.2, 0); root.add(hopper);
    const tonerPile = box(1.15, 0.9, LEN - 0.2, M.matte(0x111114)); tonerPile.position.set(-R - 1.55, -0.3, 0); root.add(tonerPile);
    const blade = box(0.08, 0.7, LEN, M.matte(0x2a2c33)); { const [x, y] = polar(STN.clean, R + 0.3); blade.position.set(x, y, 0); blade.rotation.z = STN.clean + 0.5; } root.add(blade);
    const lamp = box(0.2, 0.2, LEN, M.glow(0x9fe6ff)); { const [x, y] = polar(STN.clean + 0.45, R + 0.3); lamp.position.set(x, y, 0); } root.add(lamp);
    const xferR = zRod(0.5, M.matte(0x1d1f25)); xferR.position.set(0, -R - 0.52, 0); root.add(xferR);
    const heatMat = M.metal(0xc8ccd4, { emissive: new THREE.Color(0xff4a1a), emissiveIntensity: 0.5 });
    const fuseT = zRod(0.5, heatMat); fuseT.position.set(FUSER_X, -R + 0.5, 0); root.add(fuseT);
    const fuseB = zRod(0.5, M.matte(0x5a3025)); fuseB.position.set(FUSER_X, -R - 0.52, 0); root.add(fuseB);
    const glowTube = zRod(0.12, M.glow(0xff7a3a), LEN + 0.2); glowTube.position.copy(fuseT.position); root.add(glowTube);
    // Laser unit above: diode, spinning polygon mirror, beam to the top of the drum sweeping along its length.
    const poly = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 6), M.metal(0xf2f5fa, { roughness: 0.04, metalness: 1 }));
    poly.position.set(2.4, 3.6, 0); root.add(poly);
    const diode = box(0.4, 0.3, 0.3, M.metal(0xb08040)); diode.position.set(4.3, 3.6, 0); root.add(diode);
    const beamMat = M.glow(0xff2a2a, { transparent: true, opacity: 0.9 });
    const beamIn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), beamMat); root.add(beamIn);
    const beamOut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), beamMat); root.add(beamOut);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), M.glow(0xff6a6a)); root.add(spot);
    const setBeam = (m, a, b) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); m.position.copy(A).add(B).multiplyScalar(0.5); m.scale.set(1, A.distanceTo(B), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); };
    setBeam(beamIn, [4.1, 3.6, 0], [2.4, 3.6, 0]);
    // ---- paper
    const ptex = canvasTexture(PK, V, () => {});
    ptex.tex.wrapS = THREE.RepeatWrapping;
    const pctx = ptex.canvas.getContext('2d'), pimg = pctx.createImageData(PK, V);
    const pToner = new Float32Array(PK * V), pFused = new Uint8Array(PK);
    const pgeo = new THREE.PlaneGeometry(PAPER_L, LEN); pgeo.rotateX(-Math.PI / 2);
    const paper = new THREE.Mesh(pgeo, new THREE.MeshStandardMaterial({ map: ptex.tex, roughness: 0.9 }));
    paper.position.set(PAPER_X0 + PAPER_L / 2, -R - 0.012, 0); root.add(paper);
    // Toner particles flying from the developer roller onto the drum.
    const specks = swarm(90, new THREE.SphereGeometry(0.045, 6, 4), M.matte(0x0c0c0e));
    root.add(specks);
    // ---- the page image: text drawn into a V-row bitmap; the laser writes one column per drum step.
    const IMG_W = 420;
    const icv = document.createElement('canvas'); icv.width = IMG_W; icv.height = V;
    const ig = icv.getContext('2d');
    ig.fillStyle = '#fff'; ig.fillRect(0, 0, IMG_W, V); ig.fillStyle = '#000';
    ig.font = 'bold 56px Georgia, serif'; ig.fillText('Hello!', 14, 62);
    ig.font = '20px sans-serif'; ig.fillText('printed with static', 16, 88);
    ig.beginPath(); ig.arc(320, 48, 34, 0, TAU); ig.lineWidth = 7; ig.stroke();
    ig.beginPath(); ig.arc(308, 38, 5, 0, TAU); ig.arc(334, 38, 5, 0, TAU); ig.fill();
    ig.beginPath(); ig.arc(320, 52, 18, 0.2, Math.PI - 0.2); ig.lineWidth = 5; ig.stroke();
    const idata = ig.getImageData(0, 0, IMG_W, V).data;
    const imgOn = (col, row) => col >= 0 && col < IMG_W && idata[(row * IMG_W + col) * 4] < 128;
    // ---- labels
    const lab = {};
    const L = (k, t, pos, cls) => { lab[k] = stage.label(t, pos, root, cls); };
    L('charge', '1 Charge roller', [...polar(STN.charge, R + 1.0), 2.2]);
    L('expose', '2 Laser', [1.0, 2.35, 2.2]);
    L('develop', '3 Developer roller and toner', [-R - 1.6, 1.55, 2.2]);
    L('transfer', '4 Transfer roller', [0.6, -R - 1.25, 2.2]);
    L('fuse', `5 Fuser, about ${FUSER_C} °C`, [FUSER_X, -R + 1.4, 2.2]);
    L('clean', '6 Cleaning blade and erase lamp', [...polar(STN.clean, R + 1.2), 2.2]);
    stage.label('Spinning mirror', [2.4, 4.2, 0.4], root);
    stage.label('Photoconductor drum', [-0.3, 0.4, 2.3], root, 'hot');
    stage.label('Paper', [-5.2, -R + 0.2, 2.0], root);
    const turn = arrow(0xffb547, 0.9, 0.3, 0.05); turn.position.set(-R * 0.55, R * 0.55, LEN / 2 + 0.1); turn.rotation.z = Math.PI * 0.75; root.add(turn);

    // ---- simulation
    let ang = 0, travel = 0, lineNo = 0, t = 0, redraw = 0;
    const lastU = {};
    const uAt = (world) => { const th = world + Math.PI / 2 - ang; return ((Math.floor((th / TAU) * U) % U) + U) % U; };
    const sweep = (name, fn) => {                  // run fn(u) for each surface column that passed a station
      const u1 = uAt(STN[name]); let u0 = lastU[name] ?? u1;
      let n = (u0 - u1 + U) % U; if (n > U / 2) n = 0;
      for (let k = 0; k < n; k++) fn((u0 - k - 1 + U) % U);
      lastU[name] = u1;
    };
    const pcol = (x) => (((Math.floor(((x - PAPER_X0 - travel) / PAPER_L) * PK)) % PK) + PK) % PK;
    const ds = TAU * R / U;                        // surface length of one drum column
    const rowZ = (r) => LEN / 2 - (LEN * (r + 0.5)) / V;
    const paint = () => {
      const d = dimg.data;
      for (let u = 0; u < U; u++) for (let v = 0; v < V; v++) {
        const k = v * U + u, o = (v * U + u) * 4, q = clamp(-charge[k] / 700, 0, 1), tn = toner[k];
        // Charged: deep blue; discharged: green of the bare coating; toner: black.
        let r = 60 + (40 - 60) * q, g = 140 + (70 - 140) * q, b = 90 + (200 - 90) * q;
        r = r * (1 - tn) + 16 * tn; g = g * (1 - tn) + 16 * tn; b = b * (1 - tn) + 18 * tn;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
      dctx.putImageData(dimg, 0, 0); dtex.tex.needsUpdate = true;
      const p = pimg.data;
      for (let c = 0; c < PK; c++) for (let v = 0; v < V; v++) {
        const tn = pToner[v * PK + c], o = (v * PK + c) * 4;
        let w = 248;
        if (tn > 0) w = pFused[c] ? 18 : ((c * 7 + v * 13) % 5 < 3 ? 55 : 130);
        p[o] = w; p[o + 1] = w; p[o + 2] = pFused[c] || !tn ? w - 2 : w + 4; p[o + 3] = 255;
      }
      pctx.putImageData(pimg, 0, 0); ptex.tex.needsUpdate = true;
    };
    paint();

    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const w = 0.35 * s.speed;                   // drum turn rate, rad/s (drawn)
        const dA = w * dt; ang += dA; travel += dA * R;
        drum.rotation.z = ang;
        chgR.rotation.z = -ang * R / 0.28; devR.rotation.z = -ang * R / 0.45; xferR.rotation.z = -ang * R / 0.5;
        fuseT.rotation.z = -ang * R / 0.5; fuseB.rotation.z = ang * R / 0.5;
        poly.rotation.y += dt * 25 * s.speed;
        // Stations, in the order the surface meets them.
        sweep('transfer', (u) => {
          const c = pcol(0);
          for (let v = 0; v < V; v++) { const k = v * U + u; if (toner[k] > 0.1) { pToner[(V - 1 - v) * PK + c] = 1; toner[k] = 0.12; } }
        });
        sweep('clean', (u) => { for (let v = 0; v < V; v++) { toner[v * U + u] = 0; charge[v * U + u] = 0; } });
        sweep('charge', (u) => { for (let v = 0; v < V; v++) charge[v * U + u] = DRUM.charged; });
        let laserOn = false;
        sweep('expose', (u) => {
          // The image is written in reverse column order so it reads correctly on the paper.
          const col = IMG_W - 1 - (lineNo % (IMG_W + 120)); lineNo++;
          for (let v = 0; v < V; v++) if (imgOn(col, V - 1 - v)) { charge[v * U + u] = DRUM.exposed; laserOn = true; }
        });
        sweep('develop', (u) => { for (let v = 0; v < V; v++) { const k = v * U + u; if (charge[k] > DRUM.bias) toner[k] = 1; } });
        // Paper: clear what enters at the left, fuse what passes the fuser.
        const cIn = pcol(PAPER_X0 + 0.01);
        for (let v = 0; v < V; v++) pToner[v * PK + cIn] = 0;
        pFused[cIn] = 0;
        pFused[pcol(FUSER_X)] = 1; pFused[(pcol(FUSER_X) + PK - 1) % PK] = 1;
        ptex.tex.offset.x = -travel / PAPER_L;
        // Laser beam sweeps along the drum's length; it flickers with the image.
        const zs = -LEN / 2 + ((t * 3.1 * s.speed) % 1) * LEN;
        setBeam(beamOut, [2.4, 3.6, 0], [0, R + 0.01, zs]);
        spot.position.set(0, R + 0.02, zs);
        beamOut.visible = spot.visible = laserOn || (Math.sin(t * 57) > 0.2);
        // Toner specks hop from the developer roller to the drum.
        for (let i = 0; i < 90; i++) {
          const ph = ((t * 0.9 * s.speed + i * 0.37) % 1), a = STN.develop + (i % 9 - 4) * 0.06;
          const r0 = R + 0.9, r1 = R + 0.03, rr = r0 + (r1 - r0) * ph;
          specks.place(i, [Math.cos(a) * rr, Math.sin(a) * rr, -LEN / 2 + ((i * 0.61) % 1) * LEN], null, 1 - ph * 0.3);
        }
        specks.done();
        // Highlight the chosen stage.
        const st = s.step;
        Object.entries(lab).forEach(([k, l]) => { l.element.classList.toggle('hot', st === k); l.element.style.opacity = st === 'all' || st === k ? '1' : '0.45'; });
        heatMat.emissiveIntensity = st === 'fuse' ? 1.1 + 0.3 * Math.sin(t * 6) : 0.55;
        redraw += dt; if (redraw > 0.06) { redraw = 0; paint(); }
      },
      readout: (s) => {
        const sc = laserScan(s.ppm, s.dpi, s.facets);
        const head = s.step === 'all' ? 'The drum cycle' : STEPS.find((x) => x.v === s.step).label;
        return `<div class="big">${head}</div>
          <div style="max-width:360px;margin:2px 0 4px;font-size:13px">${TXT[s.step]}</div>
          <div class="row"><span>Drum: charged / lasered</span><b>${DRUM.charged} V / ${DRUM.exposed} V</b></div>
          <div class="row"><span>Laser lines at ${s.ppm} pages/min</span><b>${Math.round(sc.linesPerS).toLocaleString()} a second</b></div>
          <div class="row"><span>Mirror with ${s.facets} faces spins at</span><b>${(Math.round(sc.rpm / 100) * 100).toLocaleString()} rpm</b></div>
          <div class="row"><span>Dots the laser decides</span><b>${(sc.dotsPerS / 1e6).toFixed(1)} million per second</b></div>`;
      },
    };
  },
};
