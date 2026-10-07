import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import modulePreload from './src/integrations/modulepreload';

export default defineConfig({
  site: 'https://www.noel-sebastian.com',
  output: 'static',
  integrations: [
    sitemap(),
    modulePreload(),
  ],
  build: {
    // Two render-blocking stylesheet round trips (5,341 + 1,806 = 7,147 bytes gzip, two
    // separate responses) become zero: the CSS lands in the HTML response instead. Measured
    // worth it (Task 9.4, three-run Lighthouse medians): render-blocking-insight's count
    // drops 2 → 0, LCP 2,554.5ms → 2,407.0ms (−147.5ms, matching Lighthouse's own ~150ms
    // estimate), FCP 1,434.8ms → 1,358.7ms (−76.1ms), Performance 97 → 98. Total bytes over
    // the wire for HTML+CSS together actually *fall*, 25,257 → 24,920 gzip (−337), because
    // one combined gzip stream beats three separate ones — this is not a size-for-speed
    // trade, it wins on both.
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // `follow` (Ring, Stack, Contact) imports `tip` (every island). Rollup splits
          // them into two chunks because their importer sets differ — but `follow` alone was
          // 262 bytes gzip, never used without `tip`, and under the "candidate for folding"
          // ~1 KB line the Task 9.4 brief draws (Task 8.1 flagged it first). Measured: the
          // merged `tip` chunk is 489 bytes gzip against the two chunks' 262 + 334 = 596
          // before, and the page total drops 61,540 → 61,370 (−170, better than folding
          // saves alone — every other entry chunk also lost a byte or two of Rollup
          // wrapper/boilerplate, the same effect Task 9.2 saw when `/dev/signal` left the
          // module graph), with one fewer request. `timeline` (GSAP, 50.84 KB gzip) is not a
          // candidate: it is already far over the ~1 KB line, and merging it into anything
          // would make every one of its non-GSAP importers (Ring, Stack, Contact, tip) carry
          // GSAP whether they use it or not.
          //
          // Vite's preload helper joins `tip` for the same reason (Phase 12 Task 14): since
          // section 04's script has its own dynamic import (the ring), BaseLayout and Ring
          // share the helper, and Rollup gave it a chunk of its own (650 bytes gzip) — or,
          // while both imported gfx/gate.ts, a gate + helper chunk (1,194). Every page that
          // loads the helper already loads `tip`. Measured on `/`: 64,015 → 63,979 with the
          // ring's gate no longer importing gfx/gate.ts, → 63,859 with this line (gate and
          // helper both folded into `tip` measured 63,874).
          //
          // The emissions bus (Phase 13) joins `tip` too: as its own chunk it was a 173-byte
          // request, and folding it in took `/` from 65,179 to 64,984.
          manualChunks(id) {
            if (/\/src\/lib\/signal\/(?:follow|tip|emissions)\.ts$/.test(id)) return 'tip';
            if (id.includes('vite/preload-helper')) return 'tip';
          },
        },
      },
    },
  },
});
