/**
 * Slices the 2x2 hero sprite sheet into 4 individual PNGs.
 * Layout:
 *   top-left     = idle
 *   top-right    = run (used for both run & jump)
 *   bottom-left  = punch
 *   bottom-right = duck
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../resources/heroSprites.png');
const outDir = path.resolve(__dirname, '../public/assets/hero');

const meta = await sharp(src).metadata();
const { width, height } = meta;
const hw = Math.floor(width / 2);
const hh = Math.floor(height / 2);

const sprites = [
    { name: 'idle',  left: 0,  top: 0,  width: hw, height: hh },
    { name: 'run',   left: hw, top: 0,  width: hw, height: hh },
    { name: 'punch', left: 0,  top: hh, width: hw, height: hh },
    { name: 'duck',  left: hw, top: hh, width: hw, height: hh },
];

for (const s of sprites) {
    const outPath = path.join(outDir, `${s.name}.png`);
    await sharp(src)
        .extract({ left: s.left, top: s.top, width: s.width, height: s.height })
        .png()
        .toFile(outPath);
    console.log(`✓ ${s.name}.png  (${s.width}×${s.height})`);
}

console.log('\nAll hero sprites sliced successfully!');
