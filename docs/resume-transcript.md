# Resume transcript — source of truth for every metric on the site

`Resume.pdf` at the repo root **has no text layer**. `pdftotext` returns 2 characters and
`pdffonts` shows zero embedded fonts — it is Quartz-generated vector art. It can only be read by
rendering its two pages as images.

This file is that content, transcribed verbatim on 2026-09-20 from the rendered pages, so no
future session has to do it again and no metric ever has to be inferred.

**Rule:** if a claim is not in this file, it does not go on the site. `AGENTS.md` — "Never invent
a number."

---

## Header

**Noel Sebastian** — Senior Frontend Developer
noelsimc69@gmail.com · +61 493 176 360 · Sydney, Australia · noel-sebastian.com
LinkedIn: linkedin.com/in/noel-seban · GitHub: github.com/noelsebastian22 · Medium: medium.com/@noelsimc69

## Summary

> Senior Web Engineer with over 9 years of international experience architecting high-scale
> frontend solutions, specialising in the Angular ecosystem (v20) and Nx monorepos. Works at the
> front of AI-augmented development, using Model Context Protocol (MCP) servers and Figma Code
> Connect to shorten the path from design to production code. Deep experience in
> performance-critical state management (NgRx, NGXS) and accessible enterprise UI, with a record
> of leading technical transformations across Australia, the UK and India. Australian Permanent
> Resident, Masters in Computer Application (Distinction).

## Skills

| Group | Contents |
|---|---|
| Core | Angular (Expert), TypeScript, JavaScript, HTML, SCSS, CSS |
| Architecture | Nx Monorepos, Angular Signals, NgRx (Expert), NGXS, Micro-frontends |
| Testing | Jest, Jasmine, Karma, Unit and integration testing, 90%+ coverage |
| AI tooling | Model Context Protocol (MCP), Figma Code Connect, AI-assisted code review |
| Also | React, Next.js, Node.js, NestJS, D3.js, AG Grid, Bootstrap, Ionic, Git, CI/CD, Husky, commitlint |

## Experience

### Frontend Developer, Winning Group — 09/2025 – Present · Sydney, Australia

- Architected and spearheaded a high-performance frontend for a major e-commerce platform within
  an Nx monorepo, **reducing CI/CD build times by 35%** and **increasing code reuse across teams
  by 50%**.
- Led the migration to Angular v20, using signals and the latest framework features to **improve
  runtime memory efficiency by 20%** and **reduce First Contentful Paint by 400ms**.
- Pioneered AI-augmented development using MCP servers and Figma Code Connect, **accelerating the
  design-to-code workflow by 25%** and **reducing manual UI boilerplate by 40%**.
- Engineered a custom UI library to replace legacy dependencies, **cutting total bundle size by
  60%** and **eliminating $15k/year in technical debt maintenance**.
- Designed and deployed a scratch-built order management system **handling 10,000+ daily
  transactions** with zero critical downtime since launch.
- Maintained a consistent **90%+ Jest coverage** across the entire monorepo.

### Senior Engineer, Direct Line Group — 12/2023 – 06/2025 · Leeds, United Kingdom

- Orchestrated the technical architecture for **5+ Angular repositories**, implementing NgRx state
  management that **reduced client-side API calls by 30%**.
- Optimised CI/CD pipelines, **reducing deployment windows from 45 minutes to 12 minutes** with
  **100% zero-downtime releases**.
- **Mentored a team of 6** junior and mid-level developers, **lifting sprint velocity 20%** within
  the first 6 months.
- Automated development governance with Husky and commitlint, **reducing code review cycles by
  15%** by catching lint and syntax errors pre-commit.

### Senior Angular Developer, SRT Marine Systems PLC — 02/2022 – 12/2023 · Cardiff, United Kingdom

- Solved complex integration challenges for marine control systems, **holding real-time data
  rendering at 60fps** inside Unity iframes.
- Built a shared module library used **across 3 product lines**, **cutting development time for
  new features by 40%**.
- Reached **85% Jest test coverage**, **reducing production bugs by 25% year over year**.

### Senior Engineer, QBurst — 05/2020 – 02/2022 · Kakkanad, India

- Directed full-stack delivery of scalable solutions using Angular and NestJS, managing timelines
  for clients with **budgets exceeding $200k**.
- Developed interactive analytics dashboards with D3.js, letting clients visualise datasets of
  **1M+ rows with sub-second latency**.

### Analyst, Ernst & Young (EY) — 10/2016 – 05/2020 · Kakkanad, India

- Built enterprise reporting dashboards for **Fortune 500 clients**, improving data accessibility
  for **5,000+ internal users**.
- Led a cross-platform mobile application using Ionic for executive-level data presentations.
- Earned **three awards** (Extra Miler, R&R, Exceptional Client Service) for delivering milestones
  **15% ahead of schedule**.

## Education

**Masters in Computer Application, Distinction** — The Oxford College of Engineering, Bangalore,
India · 2011 – 2014

## Awards

| Year | Award |
|---|---|
| 2017 | Extra Miler Award, Ernst & Young |
| 2018 | R&R Award, Ernst & Young |
| 2018 | Exceptional Client Service Award, Ernst & Young |

## Languages

English, Malayalam, Hindi

---

## Attribution table — which metric belongs to which employer

Built because a task inferred three of these wrongly by "domain fit". Check here first.

| Metric | Employer |
|---|---|
| 35% faster CI/CD builds | Winning Group |
| 50% more code reuse | Winning Group |
| 20% runtime memory improvement | **Winning Group** |
| 400ms off First Contentful Paint | Winning Group |
| 25% faster design-to-code workflow (MCP) | Winning Group |
| 40% less manual UI boilerplate (MCP) | Winning Group |
| 60% smaller bundle | Winning Group |
| $15k/year technical debt eliminated | **Winning Group** |
| 10,000+ daily transactions (OMS) | Winning Group |
| 90%+ Jest coverage | Winning Group |
| 5+ Angular repositories | Direct Line Group |
| 30% fewer client-side API calls | Direct Line Group |
| Deploys 45 min → 12 min | Direct Line Group |
| 100% zero-downtime releases | Direct Line Group |
| Mentored 6 developers, +20% sprint velocity | Direct Line Group |
| 15% shorter code review cycles | Direct Line Group |
| 60fps real-time rendering | SRT Marine |
| 3 product lines, 40% faster feature delivery | SRT Marine |
| 85% Jest coverage | SRT Marine |
| 25% YoY production bug reduction | **SRT Marine** |
| $200k+ client budgets | QBurst |
| 1M+ rows, sub-second latency | QBurst |
| Fortune 500 dashboards, 5,000+ internal users | Ernst & Young |
| 3 awards, 15% ahead of schedule | Ernst & Young |

### The 90% vs 85% coverage figures are NOT a contradiction

Both are correct and belong to different employers: **90%+** is Winning Group's monorepo (and the
headline Skills figure), **85%** is SRT Marine. A controller addendum previously called this an
internal contradiction and asked for it to be reconciled. That was wrong — nothing needs
reconciling, and neither number should be changed or dropped.
