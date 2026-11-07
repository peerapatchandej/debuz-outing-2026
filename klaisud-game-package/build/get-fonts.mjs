// Re-download the game fonts from Google Fonts into ../fonts and rewrite fonts/fonts.css with local file names.
//   node build/get-fonts.mjs
// Only needed if the fonts folder is lost. Keeps the thai + latin subsets; identical files
// (variable fonts such as Anuphan) are stored once with a weight range.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "fonts");
const CSS_URL = "https://fonts.googleapis.com/css2?family=Mitr:wght@400;500;600&family=Anuphan:wght@400;500;600&family=Chakra+Petch:wght@600;700&display=swap";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const KEEP = new Set(["thai", "latin"]);

await mkdir(out, { recursive: true });
const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();
const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
const faces = new Map();
let m;
while ((m = re.exec(css))) {
  const [, subset, block] = m;
  if (!KEEP.has(subset)) continue;
  const fam = /font-family:\s*'([^']+)'/.exec(block)[1];
  const wt = +/font-weight:\s*(\d+)/.exec(block)[1];
  const url = /url\((https:[^)]+)\)/.exec(block)[1];
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const key = `${fam}|${subset}|${createHash("sha1").update(buf).digest("hex")}`;
  if (faces.has(key)) { faces.get(key).wts.push(wt); continue; }
  faces.set(key, { fam, subset, block, url, buf, wts: [wt] });
}
const kept = [];
let total = 0;
for (const f of faces.values()) {
  const lo = Math.min(...f.wts), hi = Math.max(...f.wts), w = lo === hi ? `${lo}` : `${lo} ${hi}`;
  const name = `${f.fam.replace(/\s+/g, "")}-${w.replace(" ", "-")}-${f.subset}.woff2`;
  await writeFile(join(out, name), f.buf);
  total += f.buf.length;
  kept.push(`/* ${f.subset} */\n` + f.block.replace(f.url, name).replace(/font-weight:\s*\d+/, `font-weight: ${w}`));
}
await writeFile(join(out, "fonts.css"), kept.join("\n") + "\n");
console.log(`${kept.length} font files, ${(total / 1024).toFixed(0)} KB -> ${out}`);
