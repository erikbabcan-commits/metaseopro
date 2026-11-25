/**
 * replace-hex.js
 *
 * Scans the src directory for .tsx and .ts files and replaces hard‑coded HEX colour
 * literals with Tailwind token class names defined in the design system.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '..', 'src');

const HEX_MAP = {
  '#f7faf8': 'bg-background',
  '#171f1b': 'text-foreground',
  '#ffffff': 'bg-card',
  '#0b4f38': 'bg-primary',
  '#f8fafc': 'text-on-primary',
  '#e8f3ee': 'bg-secondary',
  '#0f172b': 'text-on-secondary',
  '#ecf0ee': 'bg-muted',
  '#59635e': 'text-muted-foreground',
  '#dbefe5': 'bg-accent',
  '#d5ddd9': 'border-border',
  '#cdd7d2': 'border-input',
  '#247a5b': 'ring-ring',
  '#298954': 'bg-success',
  '#cf9b00': 'bg-warning',
  '#e7000b': 'bg-danger',
  '#007cb8': 'bg-info',
  '#10b981': 'bg-mark',
  '#0f1214': 'bg-dark-foreground',
  '#020618': 'bg-dark-background',
  // Additional mappings observed in code
  '#262626': 'bg-dark-background',
  '#1f1f1f': 'bg-dark-background',
  '#fff': 'bg-card',
  '#ccc': 'border-border',
  '#34d399': 'bg-mark',
  '#2563eb': 'bg-info',
  '#3b82f6': 'bg-info'
};
  '#F7FAF8': 'bg-background',
  '#171F1B': 'text-foreground',
  '#FFFFFF': 'bg-card',
  '#0B4F38': 'bg-primary',
  '#F8FAFC': 'text-on-primary',
  '#E8F3EE': 'bg-secondary',
  '#0F172B': 'text-on-secondary',
  '#ECF0EE': 'bg-muted',
  '#59635E': 'text-muted-foreground',
  '#DBEFE5': 'bg-accent',
  '#D5DDD9': 'border-border',
  '#CDD7D2': 'border-input',
  '#247A5B': 'ring-ring',
  '#298954': 'bg-success',
  '#CF9B00': 'bg-warning',
  '#E7000B': 'bg-danger',
  '#007CB8': 'bg-info',
  '#10B981': 'bg-mark',
  '#0F1214': 'bg-dark-foreground',
  '#020618': 'bg-dark-background',
  // Additional mappings observed in code (lowercase variants)
  '#262626': 'bg-dark-background',
  '#1F1F1F': 'bg-dark-background',
  '#262626'.toLowerCase(): 'bg-dark-background',
  '#1f1f1f': 'bg-dark-background',
  '#FFF': 'bg-card',
  '#fff': 'bg-card',
  '#ccc': 'border-border',
  '#CCCCCC': 'border-border',
  '#34d399': 'bg-mark',
  '#2563eb': 'bg-info',
  '#3b82f6': 'bg-info'
};
  '#F7FAF8': 'bg-background',
  '#171F1B': 'text-foreground',
  '#FFFFFF': 'bg-card',
  '#0B4F38': 'bg-primary',
  '#F8FAFC': 'text-on-primary',
  '#E8F3EE': 'bg-secondary',
  '#0F172B': 'text-on-secondary',
  '#ECF0EE': 'bg-muted',
  '#59635E': 'text-muted-foreground',
  '#DBEFE5': 'bg-accent',
  '#D5DDD9': 'border-border',
  '#CDD7D2': 'border-input',
  '#247A5B': 'ring-ring',
  '#298954': 'bg-success',
  '#CF9B00': 'bg-warning',
  '#E7000B': 'bg-danger',
  '#007CB8': 'bg-info',
  '#10B981': 'bg-mark',
  '#0F1214': 'bg-dark-foreground',
  '#020618': 'bg-dark-background',
  // Additional mappings observed in code
  '#262626': 'bg-dark-background',
  '#1F1F1F': 'bg-dark-background',
  '#262626'.toLowerCase(): 'bg-dark-background',
  '#1f1f1f': 'bg-dark-background',
  '#FFF': 'bg-card',
  '#fff': 'bg-card',
  '#ccc': 'border-border',
  '#CCCCCC': 'border-border',
  '#34d399': 'bg-mark',
  '#2563eb': 'bg-info',
  '#3b82f6': 'bg-info'
};
  '#F7FAF8': 'bg-background',
  '#171F1B': 'text-foreground',
  '#FFFFFF': 'bg-card',
  '#0B4F38': 'bg-primary',
  '#F8FAFC': 'text-on-primary',
  '#E8F3EE': 'bg-secondary',
  '#0F172B': 'text-on-secondary',
  '#ECF0EE': 'bg-muted',
  '#59635E': 'text-muted-foreground',
  '#DBEFE5': 'bg-accent',
  '#D5DDD9': 'border-border',
  '#CDD7D2': 'border-input',
  '#247A5B': 'ring-ring',
  '#298954': 'bg-success',
  '#CF9B00': 'bg-warning',
  '#E7000B': 'bg-danger',
  '#007CB8': 'bg-info',
  '#10B981': 'bg-mark',
  '#0F1214': 'bg-dark-foreground',
  '#020618': 'bg-dark-background'
};

function collectFiles(dir, exts, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectFiles(full, exts, list);
    else if (exts.includes(path.extname(e.name))) list.push(full);
  }
  return list;
}

function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [hex, token] of Object.entries(HEX_MAP)) {
    const regex = new RegExp(hex, 'gi');
    if (regex.test(content)) {
      content = content.replace(regex, token);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(file, content, 'utf8');
}

function main() {
  const files = collectFiles(SRC_DIR, ['.tsx', '.ts']);
  console.log(`Scanning ${files.length} files`);
  files.forEach(replaceInFile);
  console.log('Done');
}

main();
