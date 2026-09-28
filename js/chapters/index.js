// PrinterClear's chapters, in reading order.
import anatomy from './anatomy.js';
import inkjet from './inkjet.js';
import dots from './dots.js';
import laser from './laser.js';
import others from './others.js';
import cost from './cost.js';

export const BOX = { slug: 'printerclear', title: 'PrinterClear' };
export const CHAPTERS = [anatomy, inkjet, dots, laser, others, cost];
