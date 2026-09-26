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
});
