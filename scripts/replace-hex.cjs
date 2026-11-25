/**
 * replace-hex.cjs
 *
 * Scans the src directory for .tsx and .ts files and replaces hard‑coded HEX colour
 * literals with Tailwind token class names defined in the design system.
 */
const fs = require("fs");
const path = require("path");

// Directory to scan (project root src folder)
const SRC_DIR = path.resolve(__dirname, "..", "src");

// Mapping from hex (lowercase) to Tailwind class names
const HEX_MAP = {
  "#f7faf8": "bg-background",
  "#171f1b": "text-foreground",
  "#ffffff": "bg-card",
  "#0b4f38": "bg-primary",
  "#f8fafc": "text-on-primary",
  "#e8f3ee": "bg-secondary",
  "#0f172b": "text-on-secondary",
  "#ecf0ee": "bg-muted",
  "#59635e": "text-muted-foreground",
  "#dbefe5": "bg-accent",
  "#d5ddd9": "border-border",
  "#cdd7d2": "border-input",
  "#247a5b": "ring-ring",
  "#298954": "bg-success",
  "#cf9b00": "bg-warning",
  "#e7000b": "bg-danger",
  "#007cb8": "bg-info",
  "#10b981": "bg-mark",
  "#0f1214": "bg-dark-foreground",
  "#020618": "bg-dark-background",
  // Additional mappings observed in code
  "#262626": "bg-dark-background",
  "#1f1f1f": "bg-dark-background",
  "#fff": "bg-card",
  "#ccc": "border-border",
  "#34d399": "bg-mark",
  "#2563eb": "bg-info",
  "#3b82f6": "bg-info",
};

function collectFiles(dir, exts, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      collectFiles(full, exts, list);
    } else if (exts.includes(path.extname(e.name))) {
      list.push(full);
    }
  }
  return list;
}

function replaceInFile(file) {
  let content = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [hex, token] of Object.entries(HEX_MAP)) {
    const regex = new RegExp(hex, "gi");
    if (regex.test(content)) {
      content = content.replace(regex, token);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`Updated ${file}`);
  }
}

function main() {
  const files = collectFiles(SRC_DIR, [".tsx", ".ts"]);
  console.log(`Scanning ${files.length} files for HEX literals...`);
  files.forEach(replaceInFile);
  console.log("Replacement complete.");
}

main();
