/**
 * Fetch libraries and extract potential fingerprint signals:
 * - String literals (error messages, data-* attributes, CSS props)
 * - Display names, class prefixes
 * - Exported symbol names
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
  const signals = {};
  // String literals with descriptive content
  const strings = [...code.matchAll(/["']((?:data-|aria-|--)[a-z][\w-]*|[A-Z][a-zA-Z]+(?:Warning|Error|Provider|Context|Root)|(?:react-|@)[a-z/.-]+)["']/g)];
  signals.strings = [...new Set(strings.map(m => m[1]))].slice(0, 20);
  // Display names
  const displayNames = [...code.matchAll(/displayName\s*=\s*["']([^"']+)["']/g)];
  signals.displayNames = [...new Set(displayNames.map(m => m[1]))];
  // CSS class prefixes
  const cssClasses = [...code.matchAll(/["']([\w]+-[\w-]+)["']/g)];
  const classPrefixes = {};
  for (const m of cssClasses) {
    const prefix = m[1].split('-')[0];
    classPrefixes[prefix] = (classPrefixes[prefix] || 0) + 1;
  }
  signals.cssClassPrefixes = Object.entries(classPrefixes)
    .filter(([, c]) => c > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([p, c]) => `${p}- (${c}x)`);
  // Export names
  const exports = [...code.matchAll(/export\{([^}]+)\}/g)];
  signals.exports = exports.flatMap(m =>
    m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop().trim())
  ).filter(Boolean).slice(0, 15);
  // Error messages
  const errors = [...code.matchAll(/(?:Error|throw|warn|console\.\w+)\s*\(\s*["']([^"']{10,80})["']/g)];
  signals.errorMessages = [...new Set(errors.map(m => m[1]))].slice(0, 10);
  // Unique property names (object keys with 3+ uses)
  const props = [...code.matchAll(/(\w{4,})\s*:/g)];
  const propCounts = {};
  for (const m of props) propCounts[m[1]] = (propCounts[m[1]] || 0) + 1;
  signals.frequentProps = Object.entries(propCounts)
    .filter(([k, c]) => c > 2 && !/^(function|return|typeof|undefined|length|value|type|name|children|style|className|props|state|this|null|true|false|default|exports|module|require|window|document|Object|Array|String|Number|Math|Date|Error|Symbol|Promise|Proxy|Reflect|Map|Set|WeakMap|WeakSet)$/.test(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([p, c]) => `${p} (${c}x)`);

  return signals;
}

const LIBS = [
  'classnames', 'react-transition-group', 'lottie-web',
  '@popperjs/core', 'react-popper',
  'react-remove-scroll', 'aria-hidden', 'react-focus-lock',
  'downshift', 'react-number-format', 'react-datepicker',
  'react-dnd', 'react-dnd-html5-backend',
  'react-modal', 'react-tooltip', 'react-colorful',
  'react-slick',
  '@sentry/react', 'posthog-js',
  '@stripe/stripe-js', '@stripe/react-stripe-js',
  'react-bootstrap',
  'nanoid', 'uuid', 'prop-types', 'react-is',
  '@tanstack/react-form',
  'react-color', 'react-wrap-balancer',
  'react-medium-image-zoom',
  '@radix-ui/react-toolbar',
  'copy-to-clipboard',
  'react-lazy-load-image-component',
  'react-image-gallery',
  '@headlessui/tailwindcss',
  'react-countup',
  '@clerk/clerk-react',
  'embla-carousel-autoplay',
  'react-scroll',
  'framer-motion-3d',
];

async function main() {
  for (const lib of LIBS) {
    const url = `https://cdn.jsdelivr.net/npm/${lib}/+esm`;
    const code = await fetchWithReexports(url);
    if (!code || code.length < 100) {
      console.log(`\n=== ${lib} === SKIP (${code.length} chars)`);
      continue;
    }
    console.log(`\n=== ${lib} === (${code.length} chars)`);
    const signals = extractSignals(code);
    if (signals.displayNames.length) console.log('  displayNames:', signals.displayNames.join(', '));
    if (signals.exports.length) console.log('  exports:', signals.exports.join(', '));
    if (signals.strings.length) console.log('  strings:', signals.strings.join(', '));
    if (signals.cssClassPrefixes.length) console.log('  cssPrefixes:', signals.cssClassPrefixes.join(', '));
    if (signals.errorMessages.length) console.log('  errors:', signals.errorMessages.join(' | '));
    if (signals.frequentProps.length) console.log('  props:', signals.frequentProps.join(', '));
  }
}
main();
