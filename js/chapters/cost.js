// Chapter 6: ink, cost and care. A pages-per-month calculator for three kinds of home printer, using
// Indian prices (2025–26 list and street prices, see printer.js), shown as 3D bars of the total cost
// and a live chart of money spent month by month.
import { THREE, M, box, rod, canvasTexture, approach } from '../kit.js';
import { COST } from '../printer.js';

const KEYS = ['cart', 'tank', 'laser'];
const COL = { cart: 0x5b8cff, tank: 0x5ce1a9, laser: 0xffb547 };
const HEX = { cart: '#5b8cff', tank: '#5ce1a9', laser: '#ffb547' };
const rs = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
const rsp = (v) => (v < 1 ? Math.round(v * 100) + ' paise' : '₹' + v.toFixed(2));

// Monthly running cost for a printer type. A mono laser prints colour pages in black.
function monthly(k, pages, colourShare) {
  const c = COST[k], col = pages * colourShare, blk = pages - col;
  return blk * c.black + col * (c.colourOk ? c.colour : c.black);
}

export default {
  id: 'cost',
  short: 'Ink, cost and care',
  title: 'Why ink costs so much',
  subtitle: 'The printer is often cheap and the ink is not. Work out what your printing really costs.',
  view: { pos: [-0.4, 4.4, 12.6], target: [-0.5, 2.9, 0] },
  learn: `<p>Printer ink can cost more per millilitre than perfume. An 8.5 ml black cartridge listed at about ₹1,025 works out at around <b>₹1.2 lakh a litre</b>. Why? Many companies sell cartridge printers cheaply and make their money on the ink, like selling a cheap razor with expensive blades. The cartridge also holds chips and sometimes the printhead itself.</p>
    <p><b>Ink tank</b> printers flip this: the printer costs more, but you refill it from bottles, and a black page costs around <b>10 paise</b> instead of about <b>₹2</b>. These printers took off in India and other Asian countries in the 2010s.</p>
    <p>A <b>laser</b> printer's toner doesn't dry out, so it suits people who print lots of black text now and then. Refilled and compatible toner is common in India and much cheaper, though quality varies.</p>
    <p><b>Caring for a printer.</b> Print a page every week or so, or ink can dry in the nozzles. Fan paper before loading and don't overfill the tray, which prevents most <b>paper jams</b>. Pull a jammed sheet out slowly, in the direction it travels. Give empty toner and ink cartridges to the maker's <b>recycling</b> scheme or a refiller rather than the bin.</p>
    <p class="tip"><b>Try it:</b> set your own pages per month and colour share, and see which printer is cheapest over three years.</p>`,
  terms: [
    { t: 'Cost per page', d: 'What the ink or toner for one page costs, found by dividing the price of a refill by the pages it prints.' },
    { t: 'Page yield', d: 'How many standard test pages (about 5% covered in ink) a cartridge or bottle prints, measured by ISO/IEC 24711.' },
    { t: 'Ink tank', d: 'A printer with large refillable ink tanks on the side, filled from bottles.' },
    { t: 'Paper jam', d: 'When a sheet gets stuck or crumpled on its way through the rollers.' },
  ],
  defaults: { pages: 100, colour: 0.2, years: 3 },
  controls: [
    { key: 'pages', type: 'log', label: 'Pages per month', min: 10, max: 3000, fmt: (v) => Math.round(v).toLocaleString('en-IN') },
    { key: 'colour', type: 'range', label: 'Pages in colour', min: 0, max: 1, step: 0.05, fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'years', type: 'range', label: 'Years of use', min: 1, max: 5, step: 1, fmt: (v) => `${v} year${v > 1 ? 's' : ''}` },
  ],
  quiz: [
    { q: 'Why is cartridge ink so expensive?', options: ['Ink is rare', 'Printers are often sold cheaply and money is made on the ink', 'It contains gold', 'It is imported by air'], answer: 1, why: 'Like cheap razors with pricey blades: the maker earns over the printer\'s life through cartridges.' },
    { q: 'You print 300 black pages a month. Which is usually cheapest over a few years?', options: ['A cartridge inkjet', 'An ink tank printer', 'It never matters'], answer: 1, why: 'Its pages cost paise, not rupees, so its higher price is paid back within months.' },
    { q: 'What stops an inkjet\'s nozzles drying out?', options: ['Keeping it in the fridge', 'Printing something every week or so', 'Shaking it', 'Leaving the lid open'], answer: 1, why: 'Firing the nozzles now and then keeps fresh ink in them. The printer also cleans them itself, using a little ink.' },
  ],
  reel: [
    { ms: 5400, caption: 'Cartridge ink can cost over a lakh of rupees a litre; an ink tank page costs about 10 paise.', set: { colour: 0.2, years: 3 }, anim: { pages: [20, 600, true] }, spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // 3D bars: total cost over the chosen years, split into printer (solid) and ink (lighter).
    const bars = {};
    KEYS.forEach((k, i) => {
      const x = -3.5 + i * 1.25;
      const base = box(0.95, 0.08, 0.95, M.plastic(0x2a2f3a)); base.position.set(x, 0.04, 0); root.add(base);
      const pr = box(1, 1, 1, M.plastic(COL[k], { roughness: 0.4 })); root.add(pr);
      const ink = box(1, 1, 1, M.plastic(COL[k], { roughness: 0.3, transparent: true, opacity: 0.55 })); root.add(ink);
      const lab = stage.label(COST[k].short, [x, -0.3, 0.8], root);
      const val = stage.label('', [x, 1, 0.6], root, 'hot');
      bars[k] = { x, pr, ink, val, lab, h1: 0.01, h2: 0.01 };
    });
    // Ink bottle vs cartridge models, to scale with each other: 65 ml bottle and an 8.5 ml cartridge.
    const bottle = rod(0, 1.4, 0.34, 0.34, M.plastic(0x1b1b1f, { roughness: 0.3 })); bottle.rotation.z = Math.PI / 2; bottle.position.set(0.9, 0.7, 2.2); root.add(bottle);
    const cartM = box(0.35, 0.55, 0.62, M.plastic(0x2b2f3a)); cartM.position.set(1.8, 0.275, 2.2); root.add(cartM);
    stage.label('65 ml bottle ₹404 · 8.5 ml cartridge ₹1,025', [1.4, -0.35, 2.5], root);
    // Chart: money spent month by month.
    const st = { pages: 100, colour: 0.2, years: 3 };
    const chart = canvasTexture(900, 640, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, W, H);
      g.font = 'bold 30px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText('Money spent, printer plus ink or toner', 24, 44);
      const months = st.years * 12, totals = KEYS.map((k) => COST[k].printer + monthly(k, st.pages, st.colour) * months);
      const maxV = Math.max(...totals) * 1.08;
      const x0 = 110, x1 = W - 30, y0 = H - 70, y1 = 90;
      const X = (m) => x0 + (m / months) * (x1 - x0), Y = (v) => y0 - (v / maxV) * (y0 - y1);
      g.font = '24px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
      const step = Math.pow(10, Math.floor(Math.log10(maxV / 4))), nice = [1, 2, 5].map((m) => m * step).find((s) => maxV / s <= 6) || step * 10;
      for (let v = 0; v <= maxV; v += nice) { g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke(); g.fillText(v >= 1e5 ? (v / 1e5).toFixed(1) + ' L' : v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v), 30, Y(v) + 6); }
      for (let y = 0; y <= st.years; y++) g.fillText(`${y} y`, X(y * 12) - 12, y0 + 30);
      KEYS.forEach((k) => {
        g.strokeStyle = HEX[k]; g.lineWidth = 5; g.beginPath();
        for (let m = 0; m <= months; m++) { const v = COST[k].printer + monthly(k, st.pages, st.colour) * m; m ? g.lineTo(X(m), Y(v)) : g.moveTo(X(m), Y(v)); }
        g.stroke();
      });
      g.font = 'bold 26px sans-serif';
      KEYS.forEach((k, i) => { g.fillStyle = HEX[k]; g.fillText(COST[k].name, x0 + 10 + i * 250, y1 - 12); });
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 3.63), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(3.3, 1.95, -0.4); root.add(board);

    let key = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const months = s.years * 12;
        const tot = KEYS.map((k) => COST[k].printer + monthly(k, s.pages, s.colour) * months);
        const scale = 2.6 / Math.max(...tot);
        KEYS.forEach((k) => {
          const b = bars[k], p = COST[k].printer * scale, ink = monthly(k, s.pages, s.colour) * months * scale;
          b.h1 = approach(b.h1, Math.max(0.01, p), 6, dt); b.h2 = approach(b.h2, Math.max(0.01, ink), 6, dt);
          b.pr.scale.set(0.8, b.h1, 0.8); b.pr.position.set(b.x, 0.08 + b.h1 / 2, 0);
          b.ink.scale.set(0.8, b.h2, 0.8); b.ink.position.set(b.x, 0.08 + b.h1 + b.h2 / 2, 0);
          b.val.position.set(b.x, 0.3 + b.h1 + b.h2, 0.5);
          b.val.element.textContent = rs(COST[k].printer + monthly(k, s.pages, s.colour) * months);
        });
        const k2 = `${Math.round(s.pages)}|${s.colour}|${s.years}`;
        if (k2 !== key) { key = k2; Object.assign(st, { pages: s.pages, colour: s.colour, years: s.years }); chart.redraw(); }
      },
      readout: (s) => {
        const months = s.years * 12;
        const tot = KEYS.map((k) => [k, COST[k].printer + monthly(k, s.pages, s.colour) * months]).sort((a, b) => a[1] - b[1]);
        const rows = KEYS.map((k) => `<div class="row"><span>${COST[k].short}: black / colour page</span><b>${rsp(COST[k].black)} / ${COST[k].colourOk ? rsp(COST[k].colour) : 'black only'}</b></div>`).join('');
        return `<div class="big">Cheapest over ${s.years} year${s.years > 1 ? 's' : ''}: ${COST[tot[0][0]].short}</div>
          ${rows}
          <div class="row"><span>Ink per ml: cartridge vs bottle</span><b>₹${Math.round(COST.cart.mlPrice)} vs ₹${COST.tank.mlPrice.toFixed(1)}</b></div>
          <div class="row"><span>Monthly ink at ${Math.round(s.pages)} pages</span><b>${KEYS.map((k) => rs(monthly(k, s.pages, s.colour))).join(' · ')}</b></div>
          <small>Typical Indian list and street prices, 2025–26. Yields are for ISO test pages; paper not included.${s.colour > 0 ? ' A mono laser prints colour pages in black.' : ''}</small>`;
      },
    };
  },
};
