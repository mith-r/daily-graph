// One-off generator for placeholder App Store assets (icon + splash).
// Replace assets/icon.png and assets/splash.png with real brand art anytime,
// then re-run: npx capacitor-assets generate --ios
import sharp from "@capacitor/assets/node_modules/sharp/lib/index.js";
import { mkdirSync } from "node:fs";

const NAVY = "#0a192f";

const dots = [
  { x: 310, y: 660, r: 46, c: "#7dd3fc" },
  { x: 460, y: 520, r: 46, c: "#f0abfc" },
  { x: 580, y: 580, r: 46, c: "#fcd34d" },
  { x: 700, y: 380, r: 56, c: "#ffffff" },
];

const dotSvg = dots
  .map(
    (d) => `
  <circle cx="${d.x}" cy="${d.y}" r="${d.r * 1.9}" fill="${d.c}" opacity="0.18"/>
  <circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${d.c}"/>`
  )
  .join("");

// Axes + dots, sized for a 1024 canvas; iOS masks its own corners.
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${NAVY}"/>
  <line x1="190" y1="150" x2="190" y2="840" stroke="#ffffff" stroke-opacity="0.55" stroke-width="22" stroke-linecap="round"/>
  <line x1="184" y1="834" x2="880" y2="834" stroke="#ffffff" stroke-opacity="0.55" stroke-width="22" stroke-linecap="round"/>
  <line x1="250" y1="730" x2="800" y2="320" stroke="#ffffff" stroke-opacity="0.30" stroke-width="16" stroke-linecap="round" stroke-dasharray="2 44"/>
  ${dotSvg}
</svg>`;

const splashSvg = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="${NAVY}"/>
  <g transform="translate(854,854) scale(1)">
    ${iconSvg.replace(/<svg[^>]*>|<\/svg>|<rect[^>]*\/>/g, "")}
  </g>
</svg>`;

mkdirSync("assets", { recursive: true });
await sharp(Buffer.from(iconSvg)).png().toFile("assets/icon.png");
await sharp(Buffer.from(splashSvg)).png().toFile("assets/splash.png");
await sharp(Buffer.from(splashSvg)).png().toFile("assets/splash-dark.png");
console.log("wrote assets/icon.png, assets/splash.png, assets/splash-dark.png");
