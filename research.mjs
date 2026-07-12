/**
 * Fetch and analyze new libraries to find minification-proof fingerprint patterns.
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

const LIBS = [
  // Classname / styling
  'classnames',
  // Transition / Animation
  'react-transition-group', 'lottie-react', 'lottie-web',
  // Positioning
  '@popperjs/core', 'react-popper',
  'react-remove-scroll', 'aria-hidden', 'react-focus-lock', 'focus-trap-react',
  // Forms
  'downshift', 'react-number-format', 'react-datepicker', 'react-phone-number-input',
  // DnD
  'react-dnd', 'react-dnd-html5-backend',
  // Modals / overlays
  'react-modal', 'react-tooltip', 'react-colorful',
  // Carousel
  'react-slick',
  // Monitoring / analytics
  '@sentry/react', 'posthog-js', '@vercel/analytics', '@vercel/speed-insights',
  // Payments
  '@stripe/stripe-js', '@stripe/react-stripe-js',
  // UI framework
  'react-bootstrap',
  // Code highlighting
  'shiki',
  // Utilities
  'nanoid', 'uuid', 'lodash', 'copy-to-clipboard',
  'prop-types', 'react-is',
  // Misc popular
  'react-hook-form', // already have, skip
  '@tanstack/react-form',
  'react-image-crop', 'react-avatar-editor',
  'react-color',
  'react-table', // old version
  'react-spring-bottom-sheet',
  'react-wrap-balancer',
  '@radix-ui/react-toolbar',
  'react-medium-image-zoom',
  'next-safe-action',
  'usehooks-ts',
];

async function main() {
  for (const lib of LIBS) {
    const url = `https://cdn.jsdelivr.net/npm/${lib}/+esm`;
    const code = await fetchWithReexports(url);
    if (!code || code.length < 50) {
      console.log(`\n=== ${lib} === SKIP (${code.length} chars)`);
      continue;
    }
    console.log(`\n=== ${lib} === (${code.length} chars)`);
    // Show first 1500 chars
    console.log(code.slice(0, 1500));
    console.log('--- END ---');
  }
}
main();
