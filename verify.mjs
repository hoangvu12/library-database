/**
 * Verifies fingerprints against real minified CDN builds.
 * Follows jsdelivr re-exports to get actual library code.
 */
import { readFileSync } from 'fs';

const db = JSON.parse(readFileSync('./fingerprints.json', 'utf8'));
const BASE = 'https://cdn.jsdelivr.net';

async function fetchWithReexports(url, depth = 0, seen = new Set()) {
  if (depth > 3 || seen.has(url)) return '';
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

// Libraries to test — name maps to CDN entry point
const LIBS_TO_TEST = [
  'zustand', 'zustand/shallow', 'zustand/vanilla', 'zustand/traditional',
  'zustand/middleware', 'zustand/middleware/immer',
  'jotai', 'jotai/utils', 'jotai/vanilla',
  'valtio', 'immer', 'react', 'react-dom', 'react/jsx-runtime',
  'framer-motion', 'motion',
  '@reduxjs/toolkit', 'react-redux',
  '@tanstack/react-query', 'swr', 'react-hook-form', 'zod',
  '@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-popover',
  '@radix-ui/react-tooltip', '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-accordion',
  '@radix-ui/react-checkbox', '@radix-ui/react-switch', '@radix-ui/react-scroll-area',
  'cmdk', 'vaul', 'sonner', 'tailwind-merge', 'class-variance-authority', 'clsx',
  'lucide-react', '@floating-ui/react', 'react-router-dom',
  '@dnd-kit/core', 'recharts', 'react-intersection-observer',
  'lenis', 'gsap', '@react-spring/web',
  'react-error-boundary', 'axios', 'react-dropzone', 'react-hotkeys-hook',
  '@use-gesture/react', 'react-markdown', 'input-otp',
  'styled-components', '@emotion/styled',
  // New batch
  'classnames', 'react-transition-group', 'lottie-web',
  '@popperjs/core', 'react-popper', 'react-remove-scroll',
  'aria-hidden', 'react-focus-lock',
  'downshift', 'react-number-format', 'react-datepicker',
  'react-dnd', 'react-dnd-html5-backend',
  'react-modal', 'react-tooltip', 'react-colorful',
  'react-slick', '@sentry/react', 'posthog-js',
  '@stripe/stripe-js', '@stripe/react-stripe-js',
  'react-bootstrap', 'nanoid', 'uuid',
  'react-is', '@tanstack/react-form', 'react-color',
  'react-wrap-balancer', 'react-medium-image-zoom',
  '@radix-ui/react-toolbar', 'react-image-gallery',
  '@clerk/clerk-react', 'react-scroll', 'react-countup',
];

function testFingerprint(fp, code) {
  const patterns = fp.patterns.map(p => new RegExp(p));
  const anyOf = fp.anyOf?.map(p => new RegExp(p));
  const noneOf = fp.noneOf?.map(p => new RegExp(p));

  const patternResults = patterns.map(re => ({ pattern: re.source, match: re.test(code) }));
  const allPatternsMatch = patternResults.every(r => r.match);
  const anyOfResults = anyOf?.map(re => ({ pattern: re.source, match: re.test(code) }));
  const anyOfMatch = !anyOf || anyOf.some(re => re.test(code));
  const noneOfResults = noneOf?.map(re => ({ pattern: re.source, match: re.test(code) }));
  const noneOfPass = !noneOf || !noneOf.some(re => re.test(code));

  return { overallMatch: allPatternsMatch && anyOfMatch && noneOfPass, patternResults, anyOfResults, noneOfResults };
}

async function main() {
  const results = {};
  console.log(`Fetching ${LIBS_TO_TEST.length} libraries (with re-export resolution)...\n`);

  for (const libName of LIBS_TO_TEST) {
    const url = `https://cdn.jsdelivr.net/npm/${libName}/+esm`;
    const code = await fetchWithReexports(url);

    if (!code || code.length < 100) {
      console.log(`  SKIP  ${libName} — could not fetch (${code.length} chars)`);
      continue;
    }

    const fps = db.fingerprints.filter(fp => fp.name === libName);
    if (fps.length === 0) {
      console.log(`  SKIP  ${libName} — no fingerprints in DB`);
      continue;
    }

    let anyMatch = false;
    for (const fp of fps) {
      const result = testFingerprint(fp, code);
      const status = result.overallMatch ? '  PASS' : '  FAIL';
      if (result.overallMatch) anyMatch = true;

      console.log(`${status}  ${libName} (${fp.import.slice(0, 55)}...)`);

      if (!result.overallMatch) {
        for (const r of result.patternResults) {
          if (!r.match) console.log(`         patterns MISS: ${r.pattern}`);
        }
        if (result.anyOfResults && !result.anyOfResults.some(r => r.match)) {
          console.log(`         anyOf ALL MISS: ${result.anyOfResults.map(r => r.pattern).join(', ')}`);
        }
        if (result.noneOfResults) {
          for (const r of result.noneOfResults) {
            if (r.match) console.log(`         noneOf HIT (bad): ${r.pattern}`);
          }
        }
      }
    }

    // Check false positives
    const falsePositives = new Set();
    for (const fp of db.fingerprints) {
      if (fp.name === libName) continue;
      if (testFingerprint(fp, code).overallMatch) falsePositives.add(fp.name);
    }
    if (falsePositives.size > 0) {
      console.log(`         FALSE POS: ${[...falsePositives].join(', ')}`);
    }

    results[libName] = { anyMatch, codeLength: code.length, falsePositives: [...falsePositives] };
  }

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r.anyMatch).length;
  const failed = Object.values(results).filter(r => !r.anyMatch).length;
  const withFP = Object.values(results).filter(r => r.falsePositives?.length > 0).length;

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Libraries tested: ${total}`);
  console.log(`Matched:          ${passed}`);
  console.log(`Failed:           ${failed}`);
  console.log(`False positives:  ${withFP}`);
}

main();
