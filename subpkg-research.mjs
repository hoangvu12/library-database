/**
 * Fetch subpackages for libraries that have them.
 * Extract fingerprint signals.
 */
const BASE = 'https://cdn.jsdelivr.net';

async function fetchWithReexports(url, depth = 0, seen = new Set()) {
  if (depth > 2 || seen.has(url)) return '';
  seen.add(url);
  try {
    const fullUrl = url.startsWith('http') ? url : BASE + url;
    const res = await fetch(fullUrl, { redirect: 'follow' });
    if (!res.ok) return '';
    const code = await res.text();
    const reExports = [...code.matchAll(/(?:export\s*\*\s*from|from)\s*"(\/npm\/[^"]+)"/g)];
    let combined = code;
    for (const [, path] of reExports) {
      combined += '\n' + await fetchWithReexports(path, depth + 1, seen);
    }
    return combined;
  } catch { return ''; }
}

function extractSignals(code) {
  const displayNames = [...code.matchAll(/displayName\s*=\s*["']([^"']+)["']/g)].map(m => m[1]);
  const exports_ = [...code.matchAll(/export\{([^}]+)\}/g)]
    .flatMap(m => m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop().trim()))
    .filter(Boolean).slice(0, 20);
  const strings = [...new Set([...code.matchAll(/["']((?:data-|aria-|--)[a-z][\w-]*|[A-Z]\w+(?:Warning|Error|Provider|Context))["']/g)].map(m => m[1]))].slice(0, 15);
  const errors = [...new Set([...code.matchAll(/(?:Error|throw|warn)\s*\(\s*["']([^"']{10,80})["']/g)].map(m => m[1]))].slice(0, 8);
  return { exports_, displayNames, strings, errors, len: code.length };
}

const SUBPKGS = [
  // valtio subpackages
  'valtio/vanilla', 'valtio/utils',
  // @emotion subpackages
  '@emotion/react', '@emotion/css',
  // @tanstack subpackages
  '@tanstack/react-query-devtools', '@tanstack/query-core',
  // @dnd-kit subpackages
  '@dnd-kit/utilities',
  // @floating-ui subpackages
  '@floating-ui/dom', '@floating-ui/react-dom',
  // date-fns subpackages (they're function-level, but locale is common)
  'date-fns/locale',
  // @mui subpackages
  '@mui/icons-material', '@mui/lab', '@mui/x-date-pickers',
  // @mantine subpackages
  '@mantine/hooks', '@mantine/form', '@mantine/notifications',
  // @chakra-ui subpackages
  '@chakra-ui/icons',
  // firebase subpackages
  'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions',
  // @supabase subpackages
  '@supabase/ssr', '@supabase/auth-helpers-react',
  // gsap plugins
  'gsap/ScrollTrigger', 'gsap/Flip', 'gsap/Draggable',
  // motion subpackages
  'motion/react', 'motion/dom',
  // @react-spring subpackages
  '@react-spring/three',
  // lenis subpackages
  'lenis/react',
  // xstate subpackages
  '@xstate/react',
  // @clerk subpackages
  '@clerk/themes',
  // @stripe subpackages
  '@stripe/stripe-js/pure',
  // react-aria subpackages
  '@react-aria/focus', '@react-aria/interactions', '@react-aria/utils',
  'react-aria-components',
  // i18next subpackages
  'i18next-browser-languagedetector', 'i18next-http-backend',
  // swr subpackages
  'swr/infinite', 'swr/mutation',
  // react-router subpackages (v7)
  'react-router',
  // next.js specific
  'next-safe-action',
  // @trpc subpackages
  '@trpc/server',
  // recharts subpackages (none, but sanity check)
  // embla subpackages
  'embla-carousel-auto-scroll', 'embla-carousel-class-names',
  // react-hook-form devtools
  '@hookform/devtools',
];

async function main() {
  for (const pkg of SUBPKGS) {
    const url = `https://cdn.jsdelivr.net/npm/${pkg}/+esm`;
    const code = await fetchWithReexports(url);
    if (!code || code.length < 50) {
      console.log(`\n=== ${pkg} === SKIP (${code.length} chars)`);
      continue;
    }
    const s = extractSignals(code);
    console.log(`\n=== ${pkg} === (${s.len} chars)`);
    if (s.exports_.length) console.log('  exports:', s.exports_.join(', '));
    if (s.displayNames.length) console.log('  displayNames:', s.displayNames.join(', '));
    if (s.strings.length) console.log('  strings:', s.strings.join(', '));
    if (s.errors.length) console.log('  errors:', s.errors.join(' | '));
    // Show first 600 chars of actual code (skip header)
    const codeStart = code.indexOf('*/');
    if (codeStart > 0) console.log('  code:', code.slice(codeStart + 2, codeStart + 602).trim().slice(0, 500));
  }
}
main();
