import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const texturesDir = path.join(publicDir, "textures");
const ogOutPath = path.join(publicDir, "og-image.png");
const noiseOutPath = path.join(texturesDir, "noise.png");

const mineralDir = path.join(root, "src", "assets", "mineral");
const agatePath = path.join(mineralDir, "03-agate-copper-backlit.png");

await fs.mkdir(texturesDir, { recursive: true });

await sharp(crypto.randomBytes(200 * 200), {
  raw: { width: 200, height: 200, channels: 1 },
})
  .png()
  .toFile(noiseOutPath);

const bg = sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: "#0a0a0c",
  },
});

const agate = await sharp(agatePath)
  .resize(560, 560, { fit: "cover" })
  .modulate({ brightness: 0.9, saturation: 1 })
  .png()
  .toBuffer();

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <style>
    .mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
    .serif { font-family: "EB Garamond", serif; }
    .muted { fill: #b8a080; }
    .bone { fill: #d4d0c4; }
    .copper { fill: #c87a4a; }
  </style>
  <text x="88" y="160" class="mono copper" font-size="18" letter-spacing="3">[SPECIMEN #0001]</text>
  <text x="88" y="240" class="serif bone" font-size="56" font-weight="600">BubbleCrisp</text>
  <text x="88" y="286" class="mono muted" font-size="18" letter-spacing="2">CABINET OF CURIOSITIES</text>
  <text x="88" y="352" class="serif bone" font-size="32">你正在进入一个未命名空间</text>
  <text x="88" y="392" class="mono muted" font-size="18" letter-spacing="1">Entering an Unnamed Space</text>
</svg>
`;

await bg
  .composite([
    { input: agate, left: 1200 - 88 - 560, top: 35 },
    { input: Buffer.from(svg), top: 0, left: 0 },
  ])
  .png()
  .toFile(ogOutPath);
