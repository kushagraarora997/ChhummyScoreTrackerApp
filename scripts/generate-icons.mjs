import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "../public/icons");
fs.mkdirSync(iconsDir, { recursive: true });

// Chhummy lightning bolt path from favicon.svg, scaled to fit canvas
function iconSvg(size) {
  const pad = size * 0.1;
  const content = size - pad * 2;
  const scale = Math.min(content / 48, content / 46);
  const tx = (size - 48 * scale) / 2;
  const ty = (size - 46 * scale) / 2;
  const r = size * 0.16;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#050505" rx="${r}"/>
  <g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>
</svg>`;
}

// Maskable: full bleed dark bg, icon in center 60% (well within safe zone)
function maskableSvg(size) {
  const scale = (size * 0.6) / 48;
  const tx = (size - 48 * scale) / 2;
  const ty = (size - 46 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#050505"/>
  <g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>
</svg>`;
}

await sharp(Buffer.from(iconSvg(192))).png().toFile(path.join(iconsDir, "icon-192.png"));
console.log("✅ icon-192.png");

await sharp(Buffer.from(iconSvg(512))).png().toFile(path.join(iconsDir, "icon-512.png"));
console.log("✅ icon-512.png");

await sharp(Buffer.from(maskableSvg(512))).png().toFile(path.join(iconsDir, "maskable-512.png"));
console.log("✅ maskable-512.png");
