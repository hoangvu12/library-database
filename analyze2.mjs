/**
 * Fetch real library code by following jsdelivr re-exports.
 * When +esm returns `export*from"/npm/foo@1.2.3/bar/+esm"`, fetch that too.
 */
const BASE = 'https://cdn.jsdelivr.net';

async function fetchWithReexports(url, depth = 0, seen = new Set()) {
  if (depth > 3 || seen.has(url)) return '';
  seen.add(url);
  try {
    const fullUrl = url.startsWith('http') ? url : BASE + url;
    const res = await fetch(fullUrl, { redirect: 'follow' });
    if (!res.ok) return '';
    const code = await res.text();
    // Find re-exports like: export*from"/npm/zustand@5.0.11/vanilla/+esm"
    const reExports = [...code.matchAll(/(?:export\s*\*\s*from|from)\s*"(\/npm\/[^"]+)"/g)];
    let combined = code;
    for (const [, path] of reExports) {
      combined += '\n' + await fetchWithReexports(path, depth + 1, seen);
    }
    return combined;
  } catch { return ''; }
}

const LIBS = [
  'zustand', 'zustand/shallow', 'zustand/vanilla', 'zustand/traditional',
  'zustand/middleware', 'zustand/middleware/immer',
  'jotai', 'jotai/utils', 'jotai/vanilla',
  'valtio', 'react', 'react-dom',
  '@reduxjs/toolkit', 'gsap', '@react-spring/web',
  'react-router-dom', 'clsx', 'lucide-react',
  'styled-components', '@use-gesture/react', 'motion',
  'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-tabs',
];

async function main() {
  for (const lib of LIBS) {
    const url = `https://cdn.jsdelivr.net/npm/${lib}/+esm`;
    const code = await fetchWithReexports(url);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${lib} (${code.length} chars total)`);
    console.log(`${'='.repeat(60)}`);
    // Print first 2000 chars of combined code
    console.log(code.slice(0, 2000));
    console.log('...');
  }
}
main();
