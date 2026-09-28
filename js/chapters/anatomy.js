// Chapter 1: an inkjet and a laser printer side by side, with X-ray and take-apart, and a page
// running through each so you can follow the paper path.
import { THREE, M, exploder, canvasTexture } from '../kit.js';
import { makeInkjet, makeLaser, paperOnPath, dotColumns, TAU } from '../printer.js';

export default {
  id: 'anatomy',
  short: 'Inside a printer',
  title: 'Inside two printers',
  subtitle: 'An inkjet squirts tiny drops of liquid ink. A laser printer paints with static electricity and melts powder onto the page.',
  view: { pos: [0.6, 5.6, 10.4], target: [0.2, 2.0, 0.2] },
  learn: `<p>Every printer does the same job: it turns a page on your screen into millions of tiny <b>dots</b> on paper. The two common kinds do it in very different ways.</p>
    <p>An <b>inkjet</b> (left) pulls one sheet from the tray with a rubber <b>pick roller</b>. <b>Feed rollers</b> step the sheet forward a strip at a time over a flat <b>platen</b>. Above it, a <b>carriage</b> holding the ink <b>cartridges</b> zooms left and right on a steel rail, pulled by a belt and a small motor. Under the carriage is the <b>printhead</b>, a chip with hundreds of nozzles thinner than a hair.</p>
    <p>A <b>laser printer</b> (right) has no nozzles. A green <b>drum</b> is given a coating of static charge, a <b>laser</b> bouncing off a spinning mirror draws the page on it, and fine plastic powder called <b>toner</b> sticks where the laser hit. The powder is rolled onto the paper and a hot <b>fuser</b> melts it in. That's why pages come out warm.</p>
    <p class="tip"><b>Try it:</b> switch on X-ray, press Print, and follow the white sheet through each machine. Then take them apart.</p>`,
  terms: [
    { t: 'Printhead', d: 'The chip under an inkjet carriage with hundreds of tiny nozzles that shoot ink drops.' },
    { t: 'Carriage', d: 'The part that carries the cartridges and printhead back and forth across the page.' },
    { t: 'Platen', d: 'The flat support the paper slides over while it is being printed.' },
    { t: 'Photoconductor drum', d: 'A cylinder whose coating holds static charge in the dark but lets it leak away where light hits it.' },
    { t: 'Toner', d: 'A very fine plastic powder with colour in it, used instead of ink in laser printers.' },
    { t: 'Fuser', d: 'A pair of rollers, one hot, that melt and press toner into the paper.' },
  ],
  defaults: { explode: 0, xray: true, run: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Take them apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray the cases' },
    { key: 'run', type: 'toggle', label: 'Print a page', hint: 'A sheet runs through both printers, slowed down.' },
  ],
  quiz: [
    { q: 'What moves left and right across the page in an inkjet?', options: ['The paper tray', 'The carriage with the cartridges and printhead', 'The drum', 'The fuser'], answer: 1, why: 'The carriage slides along a rail. The paper steps forward between its passes.' },
    { q: 'Why does a page come out of a laser printer warm?', options: ['The laser burns the paper', 'The fuser melts the toner into the paper', 'The motor heats it', 'The ink is hot'], answer: 1, why: 'The fuser roller is hot enough to melt the plastic toner, pressing it into the paper fibres.' },
    { q: 'What does a laser printer use instead of liquid ink?', options: ['Wax crayons', 'Toner, a fine plastic powder', 'Carbon paper', 'Paint'], answer: 1, why: 'Toner is powdered plastic mixed with colour. Static electricity places it and heat fixes it.' },
  ],
  reel: [
    { ms: 6000, caption: 'Two ways to print: an inkjet squirts tiny drops, a laser printer melts powder onto the page.', set: { xray: true, run: true }, anim: { explode: [0, 0.8] }, view: { pos: [1.4, 7.2, 12.6], target: [0.6, 1.4, 0.2] }, spin: 0.3 },
  ],

  build({ stage }) {
    const ij = makeInkjet(), lz = makeLaser();
    ij.group.position.set(-3.1, 0, 0); ij.group.rotation.y = 0.18;
    lz.group.position.set(3.1, 0, -0.2); lz.group.rotation.y = -0.35;
    stage.root.add(ij.group, lz.group);

    // A printed-looking page texture: a heading and lines of text, revealed as the page is printed.
    const cols = dotColumns('HELLO');
    const page = canvasTexture(256, 360, (g, W, H, frac = 1) => {
      g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); g.rect(0, 0, W, H * frac); g.clip();
      g.fillStyle = '#1b1f2a';
      cols.forEach((c, i) => { for (let b = 0; b < 7; b++) if (c & (1 << b)) g.fillRect(28 + i * 6, 30 + b * 6, 5, 5); });
      for (let l = 0; l < 14; l++) { g.fillStyle = l % 5 === 4 ? '#e6358f' : '#3b4252'; g.fillRect(28, 90 + l * 17, 200 - ((l * 37) % 70), 6); }
      g.fillStyle = '#19b7e6'; g.fillRect(150, 22, 70, 50); g.fillStyle = '#f5d316'; g.beginPath(); g.arc(185, 47, 16, 0, TAU); g.fill();
      g.restore();
    });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: page.tex });
    const plainMat = M.matte(0xfbfbf7);
    const sheetI = paperOnPath(ij.path, 2.97, 2.1, plainMat, 26); ij.group.add(sheetI);
    const sheetL = paperOnPath(lz.path, 2.97, 2.1, plainMat, 30); lz.group.add(sheetL);
    // The finished page shown lying in each output tray, printed side up (inkjet) or down (laser).
    const doneI = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.97), paperMat); doneI.rotation.x = -Math.PI / 2; doneI.position.set(0, 0.34, 1.85); ij.group.add(doneI);
    const doneL = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.97), plainMat); doneL.rotation.x = -Math.PI / 2; doneL.position.set(0, 2.8, 0.0); lz.top.add(doneL); doneL.position.set(0, 0.2, -0.2);

    // Labels.
    const L = (t, parent, pos, cls) => stage.label(t, pos, parent, cls);
    stage.label('Inkjet', [-3.1, 2.9, 0.4], stage.root, 'hot');
    stage.label('Laser', [3.1, 3.9, 0.4], stage.root, 'hot');
    const inner = [
      L('Cartridges: C, M, Y, K', ij.carts, [0, 1.55, 0.3]),
      L('Printhead', ij.head, [0.0, -0.12, 0.6], 'hot'),
      L('Carriage rail', ij.rail, [1.5, 0.15, 0]),
      L('Pick roller', ij.pick, [-1.6, 0.1, -0.2]),
      L('Feed roller', ij.feed, [-1.4, -0.1, 0.2]),
      L('Photoconductor drum', lz.drum, [-0.4, -0.05, 0.5], 'hot'),
      L('Laser and spinning mirror', lz.scanner, [0.9, 0.35, 0.2]),
      L('Fuser (hot rollers)', lz.fuser, [0.6, -0.3, 0.4], 'hot'),
      L('Paper cassette', lz.cassette, [-1.0, 0.1, 1.2]),
    ];

    const setExplode = exploder([
      { obj: ij.lid, off: [0, 1.6, 0] },
      { obj: ij.carriage, off: [0, 1.0, 0.9] },
      { obj: ij.carts, off: [0, 0.7, 0] },
      { obj: ij.trayIn, off: [0, 0.4, -1.0] },
      { obj: ij.outTray, off: [0, -0.1, 1.0] },
      { obj: lz.top, off: [0, 1.9, 0] },
      { obj: lz.scanner, off: [0, 1.4, 0] },
      { obj: lz.cart, off: [0, 0.55, -2.2] },
      { obj: lz.fuser, off: [0, 0.0, 2.1] },
      { obj: lz.cassette, off: [0, -0.1, 2.9] },
    ]);

    let u = 0, t = 0, printedFrac = -1;
    const Li = sheetI.length, Ll = sheetL.length;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        setExplode(s.explode);
        const see = s.xray || s.explode > 0.05;
        [ij.shellMat, lz.shellMat].forEach((m) => { m.opacity = see ? 0.16 : 1; m.depthWrite = !see; });
        inner.forEach((l) => { l.visible = see; });
        // One page cycle every 9 s: the sheet travels, the carriage sweeps, rollers turn.
        const cyc = 9;
        if (s.run) u = (u + dt / cyc) % 1;
        const k = u;
        sheetI.place(k * (Li + 2.97));
        sheetL.place(k * (Ll + 2.97));
        const sweeping = s.run && k > 0.25 && k < 0.8;
        ij.carriage.position.x = sweeping ? Math.sin(t * 5) * 1.1 : ij.carriage.position.x * 0.9;
        const spin = s.run ? t * 3 : 0;
        [ij.pick, ij.feed].forEach((r) => { r.rotation.x = -spin; });
        lz.drum.rotation.x = -spin * 1.5; lz.poly.rotation.y = s.run ? t * 40 : 0;
        lz.heatMat.emissiveIntensity = 0.35 + 0.15 * Math.sin(t * 2);
        const frac = Math.min(1, Math.max(0, (k - 0.25) / 0.55));
        doneI.visible = doneL.visible = !s.run || k > 0.97 || k < 0.02;
        const fr = Math.round((s.run ? frac : 1) * 30) / 30;
        if (fr !== printedFrac) { printedFrac = fr; page.redraw(fr); }
      },
      readout: () => `<div class="big">One page, two ways</div>
        <div class="row"><span>Inkjet: tiny drops from</span><b>hundreds of nozzles</b></div>
        <div class="row"><span>Laser: toner melted at about</span><b>150 to 200 °C</b></div>
`,
    };
  },
};
