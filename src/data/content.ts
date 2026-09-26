import { yearsElapsed } from '../lib/career';
import type { CaseStudyDiagram } from '../lib/diagrams/types';

/** In page order. Home is the brand mark's job: it already links to `#top`. */
export const nav = [
  { label: 'Work', href: '#work' },
  { label: 'Shipped', href: '#ring' },
  { label: 'Stack', href: '#stack' },
  { label: 'Contact', href: '#contact' },
];

export type EmissionState = 'live' | 'shipped' | 'historical';

export interface TimelineEntry {
  from: string;          // 'YYYY-MM'
  to: string | null;     // null = present
  role: string;
  company: string;
  city: string;
  country: string;
  state: EmissionState;
}

export const timeline: TimelineEntry[] = [
  { from: '2016-10', to: '2020-05', role: 'Analyst',                   company: 'Ernst & Young',           city: 'Kakkanad', country: 'India',     state: 'historical' },
  { from: '2020-05', to: '2022-02', role: 'Senior Engineer',           company: 'QBurst',                  city: 'Kakkanad', country: 'India',     state: 'historical' },
  { from: '2022-02', to: '2023-12', role: 'Senior Angular Developer',  company: 'SRT Marine Systems PLC',  city: 'Cardiff',  country: 'UK',        state: 'historical' },
  { from: '2023-12', to: '2025-06', role: 'Senior Engineer',           company: 'Direct Line Group',       city: 'Leeds',    country: 'UK',        state: 'historical' },
  { from: '2025-09', to: null,      role: 'Frontend Developer',        company: 'Winning Group',           city: 'Sydney',   country: 'Australia', state: 'live' },
];

export const status = {
  city: 'Sydney',
  timezone: 'Australia/Sydney',
  workRights: 'Australian Permanent Resident',
  availability: 'Open to senior frontend roles',
} as const;

/**
 * Section 05's operator chain — the resume's Skills table, group for group and in its order
 * (docs/resume-transcript.md → "Skills"; tests/skill-groups.test.ts holds the two together).
 * No proficiency labels: §9.05 drops them, and the resume's "(Expert)" is one.
 *
 * `op` is the group's identifier in the `pipe(…)` form. A user-defined operator composed in
 * `pipe()` is honest RxJS; one that shadows a real operator (`map`, `filter`, `share`…) is
 * not, and the test checks that none does.
 */
export interface SkillGroup {
  /** The resume's own name for the group. */
  name: string;
  /** camelCase identifier, rendered as `op()` in the chain. */
  op: string;
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    name: 'Core',
    op: 'core',
    items: ['Angular', 'TypeScript', 'JavaScript', 'HTML', 'SCSS', 'CSS'],
  },
  {
    name: 'Architecture',
    op: 'architecture',
    items: ['Nx Monorepos', 'Angular Signals', 'NgRx', 'NGXS', 'Micro-frontends'],
  },
  {
    name: 'Testing',
    op: 'testing',
    items: ['Jest', 'Jasmine', 'Karma', 'Unit and integration testing', '90%+ coverage'],
  },
  {
    name: 'AI tooling',
    op: 'aiTooling',
    items: ['Model Context Protocol (MCP)', 'Figma Code Connect', 'AI-assisted code review'],
  },
  {
    name: 'Also',
    op: 'also',
    items: [
      'React', 'Next.js', 'Node.js', 'NestJS', 'D3.js', 'AG Grid',
      'Bootstrap', 'Ionic', 'Git', 'CI/CD', 'Husky', 'commitlint',
    ],
  },
];

export const caseStudies: Array<{
  name: string;
  role: string;
  tags: string[];
  problem: string;
  approach: string;
  result: string;
  /** Feeds `src/lib/diagrams/*.ts` — see that module's doc comment for the honesty rule. */
  diagram: CaseStudyDiagram;
}> = [
  {
    name: 'Winning Group',
    role: 'E-commerce frontend at scale',
    tags: ['Angular v20', 'Nx', 'Signals'],
    problem: 'A legacy e-commerce frontend with slow builds and code duplicated across teams.',
    approach:
      'Architected an Nx monorepo, led the industry-first migration to Angular v20 with signals, pioneered AI-augmented development with MCP servers and Figma Code Connect, and built a custom UI library to replace legacy dependencies.',
    result:
      '35% faster CI/CD, 50% more code reuse, 60% smaller bundle, 400ms off First Contentful Paint, a 20% improvement in runtime memory efficiency, $15k/year in technical debt eliminated, a 25% faster design-to-code workflow with 40% less manual UI boilerplate, and a 10,000+ daily transaction order management system with zero critical downtime.',
    diagram: { kind: 'bundle', reductionPercent: 60 },
  },
  {
    name: 'Direct Line Group',
    role: 'State architecture across 5+ apps',
    tags: ['NgRx', 'CI/CD', 'Architecture'],
    problem: 'Fragmented Angular repositories with redundant API calls and slow, risky deployments.',
    approach:
      'Standardised NgRx state management across 5+ repos and hardened CI/CD with automated governance and pre-commit checks.',
    result:
      '30% fewer client-side API calls, deploys cut from 45 to 12 minutes, 100% zero-downtime releases, mentored 6 junior and mid-level developers to lift sprint velocity 20%, and shortened code review cycles by 15%.',
    diagram: {
      kind: 'repos',
      repoCount: 5,
      repoLabel: '5+',
      deployStartMinutes: 45,
      deployEndMinutes: 12,
    },
  },
  {
    name: 'SRT Marine',
    role: 'Real-time marine control UI',
    tags: ['Real-time', 'Performance', 'Angular'],
    problem: 'Marine control systems needed real-time data rendering without dropping frames.',
    approach:
      'Solved complex Unity iframe integration and built a shared module library used across three product lines.',
    result:
      'Steady 60fps real-time rendering, 40% faster feature delivery, 85% test coverage, and a 25% year-over-year reduction in production bugs.',
    diagram: { kind: 'frametime', fps: 60 },
  },
  {
    name: 'QBurst',
    role: 'Analytics dashboards',
    tags: ['D3.js', 'NestJS', 'Full-stack'],
    problem: 'Clients needed to explore million-row datasets interactively.',
    approach:
      'Built D3.js analytic dashboards on an Angular + NestJS stack for projects with $200k+ budgets.',
    result: '1M+ rows visualised with sub-second latency, giving clients real-time insight.',
    diagram: { kind: 'scatter', pointCount: 1_000_000 },
  },
];

/**
 * Section 04's cards, in ring order: the shipped freelance sites, and Daybook, Noel's own
 * product. `slug` keys the card's capture in `src/data/ring-captures.json`, which
 * `scripts/optimise-gallery.mjs` writes; `site` is the live URL each card links to.
 */
export const ringProjects = [
  {
    slug: 'daybook',
    title: 'Daybook',
    site: 'https://daybook.noel-sebastian.com/',
    repo: 'https://github.com/noelsebastian22/daybook',
    desc: 'My own product — a task app built on one page a day: anything left unfinished moves to tomorrow wearing a badge that counts the days it has followed you. Typing a task in plain English sets its date, time and category.',
    tagline: 'Angular 22 · Supabase · PWA',
  },
  {
    slug: 'ezytrack',
    title: 'Ezytrack',
    site: 'https://ezytrack.noel-sebastian.com/',
    desc: 'Market-leading GPS fleet-tracking business site — real-time vehicle visibility, route history, geofencing and dashcam integration for Australian fleets.',
    tagline: 'Astro · Tailwind v4 · TypeScript',
  },
  {
    slug: 'plumber',
    title: 'PLUMBER.',
    site: 'https://plumber.noel-sebastian.com/',
    desc: 'Single-page marketing site for a New York-based plumbing & handyman company — conversion-focused layout built to turn renovation-planning homeowners into booked appointments.',
    tagline: 'Astro · Tailwind v4 · TypeScript',
  },
  {
    slug: 'topdel-renovations',
    title: 'Topdel Renovations',
    site: 'https://topdelrenovation.com.au/',
    desc: 'Business site for an Australian renovation & construction company — project galleries and service pages built to convert homeowners into qualified leads.',
    tagline: 'Renovations · Construction · Australia',
  },
  {
    slug: 'laserclinic',
    title: 'Menzone',
    site: 'https://laserclinic.noel-sebastian.com/',
    desc: 'Private male waxing and laser hair removal studio in Chippendale — full published price list, before-and-after comparison sliders and online booking built to get first-timers over the line.',
    tagline: 'Astro · Tailwind v4 · TypeScript',
  },
];

export const stats = [
  { n: `${yearsElapsed()}+`, l: 'Years experience' },
  { n: '3', l: 'Countries delivered' },
  { n: '90%+', l: 'Test coverage' },
  { n: '35%', l: 'Faster builds' },
];

export const socials = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/noel-seban' },
  { label: 'GitHub', href: 'https://github.com/noelsebastian22' },
  { label: 'Medium', href: 'https://medium.com/@noelsimc69' },
];
