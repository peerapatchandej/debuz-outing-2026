// Builds klaisud-game-offline.html (one self-contained file) from klaisud-game.html.
//   node build-offline.mjs
// Edit klaisud-game.html, then run this. The offline file:
//   - gets a full <!doctype html> head/body (build/offline-head.html)
//   - gets the "จอใหญ่ / หลังบ้าน / สาธิต" switch bar (build/offline-nav.html)
//   - embeds the fonts from fonts/ instead of loading Google Fonts (works with no internet)
//   - embeds vo/narration.mp3 instead of loading it from the vo folder
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const rd = (p, enc = "utf8") => readFileSync(join(dir, p), enc);

// replace exactly one occurrence, or stop: a silent miss would ship a broken offline file
function swap(src, find, repl, what) {
  const n = src.split(find).length - 1;
  if (n !== 1) throw new Error(`${what}: expected 1 match, found ${n}`);
  return src.replace(find, () => repl);
}

let html = rd("klaisud-game.html");

// 1. fonts: Google Fonts links -> inline @font-face with base64 woff2
const fontCss = rd("fonts/fonts.css").replace(/url\(([^)]+\.woff2)\)/g, (_, f) =>
  `url(data:font/woff2;base64,${readFileSync(join(dir, "fonts", f)).toString("base64")})`);
const gf = html.match(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\r?\n<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\r?\n<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*">/);
if (!gf) throw new Error("fonts: Google Fonts <link> lines not found");
html = swap(html, gf[0], `<style>\n${fontCss}</style>`, "fonts");

// 2. view switch bar, right after <title>
const title = html.match(/<title>[^<]*<\/title>\r?\n/);
if (!title) throw new Error("nav: <title> not found");
html = swap(html, title[0], title[0] + rd("build/offline-nav.html") + "\n", "nav");

// 3. narration audio
const mp3 = readFileSync(join(dir, "vo", "narration.mp3")).toString("base64");
html = swap(html, 'VO_URL="vo/narration.mp3"', `VO_URL="data:audio/mpeg;base64,${mp3}"`, "audio");

const out = rd("build/offline-head.html") + html + "\n</body></html>";
writeFileSync(join(dir, "klaisud-game-offline.html"), out);
console.log(`klaisud-game-offline.html  ${(out.length / 1024 / 1024).toFixed(2)} MB`);
