# Build-only fonts for the OG image

These are **static** TTFs, not the site's variable WOFF2s. sharp 0.33.5's renderer
(librsvg 2.58 / Pango 1.54) cannot select a named instance out of a variable font — tested
2026-09-26 (see `task-9.3-brief.md`): pointing `FONTCONFIG_FILE` at `public/fonts` and asking
for `font-family="Archivo"` / `"JetBrains Mono"` fell back to a generic sans on every glyph,
with Pango's own warning naming the font it couldn't load. Static instances sidestep the
variable-instance selection Pango was failing at.

Never placed under `public/` — these must not ship to visitors or reach `dist/`.

`scripts/og-image.mjs` does **not** hand these to sharp's SVG text renderer. A scoped
`FONTCONFIG_FILE` was the original plan (still the right one on Linux), but on this build of
sharp/libvips, Pango only has a CoreText backend compiled in — no environment variable
reaches it, and forcing the fontconfig backend segfaults the process. See the header comment
in `scripts/og-image.mjs` for the full finding. Instead, `opentype.js` reads these TTFs
directly and turns each line of copy into actual glyph outlines (plain SVG `<path>` data),
so sharp only ever rasterises geometry — nothing here depends on the host's font-matching
stack at all.

## Archivo

Source: [Omnibus-Type/Archivo](https://github.com/Omnibus-Type/Archivo), commit
`211127690e8ff106c36c935f7e5e697114cff103` (`master`, 2026-09-02). This is the family's own
upstream repo — the one Google Fonts' `google/fonts` mirror builds from — and it carries the
static instances that `ofl/archivo/` on `google/fonts` does not (that mirror only ships the
variable `Archivo[wdth,wght].ttf`).

- `fonts/ttf/ArchivoExpanded-ExtraBold.ttf` → `archivo/ArchivoExpanded-ExtraBold.ttf`
  Confirmed via the font's own `name` table: family "Archivo Expanded ExtraBold", OS/2
  `usWeightClass` 800, `usWidthClass` 7 (Expanded) — the exact cut the site's CSS reaches
  for at `font-weight: 800`, `font-stretch: 125%`.
- `fonts/ttf/Archivo-Regular.ttf` → `archivo/Archivo-Regular.ttf`
  Family "Archivo", weight 400, width 100% (Normal).

Fetched from:
```
https://raw.githubusercontent.com/Omnibus-Type/Archivo/211127690e8ff106c36c935f7e5e697114cff103/fonts/ttf/ArchivoExpanded-ExtraBold.ttf
https://raw.githubusercontent.com/Omnibus-Type/Archivo/211127690e8ff106c36c935f7e5e697114cff103/fonts/ttf/Archivo-Regular.ttf
https://raw.githubusercontent.com/Omnibus-Type/Archivo/211127690e8ff106c36c935f7e5e697114cff103/OFL.txt
```

Licence: SIL Open Font License 1.1, `archivo/OFL.txt` (repo root, same commit).

## JetBrains Mono

Source: [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono), release
[`v2.304`](https://github.com/JetBrains/JetBrainsMono/releases/tag/v2.304) —
`JetBrainsMono-2.304.zip`.

- `fonts/ttf/JetBrainsMono-Regular.ttf` → `jetbrains-mono/JetBrainsMono-Regular.ttf`
  Family "JetBrains Mono", weight 400.

Fetched from:
```
https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip
```
(`fonts/ttf/JetBrainsMono-Regular.ttf` and `OFL.txt` extracted from the zip.)

Licence: SIL Open Font License 1.1, `jetbrains-mono/OFL.txt` (from the same release zip).
