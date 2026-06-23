import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

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

for (const [dir, size] of Object.entries(sizes)) {
  const outDir = path.join(__dirname, "../android/app/src/main/res", dir);
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(Buffer.from(iconSvg(size))).png().toFile(path.join(outDir, "ic_launcher.png"));
  console.log(`✅ ${dir}/ic_launcher.png (${size}x${size})`);
}
