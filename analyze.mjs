/**
 * Fetch and dump library sources so we can find real patterns.
 */
const LIBS = {
  'zustand-esm': 'https://cdn.jsdelivr.net/npm/zustand/+esm',
  'zustand-vanilla': 'https://cdn.jsdelivr.net/npm/zustand@5/dist/esm/vanilla.mjs',
  'zustand-shallow': 'https://cdn.jsdelivr.net/npm/zustand@5/dist/esm/shallow.mjs',
  'zustand-traditional': 'https://cdn.jsdelivr.net/npm/zustand@5/dist/esm/traditional.mjs',
  'zustand-middleware': 'https://cdn.jsdelivr.net/npm/zustand@5/dist/esm/middleware.mjs',
  'zustand-middleware-immer': 'https://cdn.jsdelivr.net/npm/zustand@5/dist/esm/middleware/immer.mjs',
  'jotai-esm': 'https://cdn.jsdelivr.net/npm/jotai/+esm',
  'jotai-vanilla': 'https://cdn.jsdelivr.net/npm/jotai@2/dist/esm/vanilla.mjs',
  'jotai-utils': 'https://cdn.jsdelivr.net/npm/jotai@2/dist/esm/vanilla/utils.mjs',
  'valtio': 'https://cdn.jsdelivr.net/npm/valtio/+esm',
  'react-esm': 'https://cdn.jsdelivr.net/npm/react/+esm',
  'react-cjs': 'https://cdn.jsdelivr.net/npm/react@19/cjs/react.production.js',
  'react-dom-esm': 'https://cdn.jsdelivr.net/npm/react-dom/+esm',
  'react-dom-cjs': 'https://cdn.jsdelivr.net/npm/react-dom@19/cjs/react-dom.production.js',
  'redux-toolkit': 'https://cdn.jsdelivr.net/npm/@reduxjs/toolkit/+esm',
  'gsap': 'https://cdn.jsdelivr.net/npm/gsap/+esm',
  'react-spring-web': 'https://cdn.jsdelivr.net/npm/@react-spring/web/+esm',
  'react-router-dom': 'https://cdn.jsdelivr.net/npm/react-router-dom/+esm',
  'clsx': 'https://cdn.jsdelivr.net/npm/clsx/+esm',
  'lucide-react': 'https://cdn.jsdelivr.net/npm/lucide-react/+esm',
  'styled-components': 'https://cdn.jsdelivr.net/npm/styled-components/+esm',
  'use-gesture-react': 'https://cdn.jsdelivr.net/npm/@use-gesture/react/+esm',
  'motion': 'https://cdn.jsdelivr.net/npm/motion/+esm',
  'framer-motion': 'https://cdn.jsdelivr.net/npm/framer-motion/+esm',
  'radix-dialog': 'https://cdn.jsdelivr.net/npm/@radix-ui/react-dialog/+esm',
  'radix-tabs': 'https://cdn.jsdelivr.net/npm/@radix-ui/react-tabs/+esm',
};

async function main() {
  for (const [name, url] of Object.entries(LIBS)) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) { console.log(`\n=== ${name} === FETCH FAILED ${res.status}`); continue; }
      const code = await res.text();
      console.log(`\n=== ${name} === (${code.length} chars, url: ${url})`);
      // Print first 3000 chars
      console.log(code.slice(0, 3000));
      console.log('--- END PREVIEW ---');
    } catch (e) {
      console.log(`\n=== ${name} === ERROR: ${e.message}`);
    }
  }
}
main();
