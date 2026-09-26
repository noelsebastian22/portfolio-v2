import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.noel-sebastian.com',
  output: 'static',
  integrations: [sitemap()],
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
          manualChunks(id) {
            if (/\/src\/lib\/signal\/(?:follow|tip)\.ts$/.test(id)) return 'tip';
          },
        },
      },
    },
  },
});
