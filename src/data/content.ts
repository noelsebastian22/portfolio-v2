export const nav = [
  { label: 'Home', href: '#top' },
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Services', href: '#services' },
  { label: 'Contact', href: '#contact' },
];

export const heroChips = ['9+ years', 'Angular v20', 'Nx · NgRx', 'Available for freelance'];

export const marqueeItems = [
  'Angular v20', 'TypeScript', 'NgRx', 'Nx Monorepos', 'RxJS',
  'SCSS', 'NestJS', 'Astro', 'Nuxt', 'Next.js', 'Signals', 'Jest',
];

export const aboutCols = [
  {
    title: 'What I build',
    items: ['Enterprise frontends', 'Business websites', 'Landing pages', 'SPAs & web apps'],
  },
  {
    title: 'Core stack',
    items: ['Angular v20', 'NgRx · NGXS', 'Nx Monorepos', 'TypeScript · RxJS'],
  },
  {
    title: 'Also works in',
    items: ['React · Next.js', 'Astro · Nuxt', 'NestJS · Node', 'A11y · Testing'],
  },
];

type Level = 'Expert' | 'Advanced' | 'Intermediate' | 'Freelance';

export const levelColor: Record<Level, string> = {
  Expert: '#FF4B54',
  Advanced: '#16150F',
  Intermediate: '#9a968b',
  Freelance: '#b98700',
};

export const skillGroups = [
  {
    no: '01',
    name: 'Frontend',
    items: [
      { n: 'Angular', l: 'Expert' as Level },
      { n: 'TypeScript', l: 'Expert' as Level },
      { n: 'JavaScript', l: 'Expert' as Level },
      { n: 'HTML · SCSS · CSS', l: 'Expert' as Level },
    ],
  },
  {
    no: '02',
    name: 'State & Data',
    items: [
      { n: 'NgRx', l: 'Expert' as Level },
      { n: 'RxJS', l: 'Advanced' as Level },
      { n: 'D3.js', l: 'Advanced' as Level },
      { n: 'AG Grid', l: 'Intermediate' as Level },
    ],
  },
  {
    no: '03',
    name: 'Tooling & Testing',
    items: [
      { n: 'Nx Monorepos', l: 'Expert' as Level },
      { n: 'Jest', l: 'Advanced' as Level },
      { n: 'Karma · Jasmine', l: 'Advanced' as Level },
      { n: 'Git · Husky', l: 'Advanced' as Level },
    ],
  },
  {
    no: '04',
    name: 'Beyond Angular',
    items: [
      { n: 'React', l: 'Intermediate' as Level },
      { n: 'Next.js', l: 'Intermediate' as Level },
      { n: 'Astro · Nuxt', l: 'Freelance' as Level },
      { n: 'NestJS · Node', l: 'Intermediate' as Level },
    ],
  },
];

export const processSteps = [
  {
    no: '01',
    title: 'Discover',
    body: 'I start with your brief, users and goals — mapping requirements before a line of code.',
  },
  {
    no: '02',
    title: 'Architect',
    body: 'I plan structure, state and performance budgets so the build scales instead of buckling.',
  },
  {
    no: '03',
    title: 'Build',
    body: 'Clean, tested, accessible components shipped in small, reviewable increments.',
  },
  {
    no: '04',
    title: 'Ship',
    body: 'CI/CD, zero-downtime releases and monitoring so it stays fast long after launch.',
  },
];

export const caseStudies = [
  {
    name: 'Winning Group',
    role: 'E-commerce frontend at scale',
    tags: ['Angular v20', 'Nx', 'Signals'],
    problem: 'A legacy e-commerce frontend with slow builds and code duplicated across teams.',
    approach:
      'Architected an Nx monorepo, led the industry-first migration to Angular v20 with signals, and built a custom UI library to replace legacy dependencies.',
    result:
      '35% faster CI/CD, 50% more code reuse, 60% smaller bundle and 400ms off First Contentful Paint.',
  },
  {
    name: 'Direct Line Group',
    role: 'State architecture across 5+ apps',
    tags: ['NgRx', 'CI/CD', 'Architecture'],
    problem: 'Fragmented Angular repositories with redundant API calls and slow, risky deployments.',
    approach:
      'Standardised NgRx state management across 5+ repos and hardened CI/CD with automated governance and pre-commit checks.',
    result:
      '30% fewer client-side API calls, deploys cut from 45 to 12 minutes, and 100% zero-downtime releases.',
  },
  {
    name: 'SRT Marine',
    role: 'Real-time marine control UI',
    tags: ['Real-time', 'Performance', 'Angular'],
    problem: 'Marine control systems needed real-time data rendering without dropping frames.',
    approach:
      'Solved complex Unity iframe integration and built a shared module library used across three product lines.',
    result: 'Steady 60fps real-time rendering, 40% faster feature delivery and 85% test coverage.',
  },
  {
    name: 'QBurst',
    role: 'Analytics dashboards',
    tags: ['D3.js', 'NestJS', 'Full-stack'],
    problem: 'Clients needed to explore million-row datasets interactively.',
    approach:
      'Built D3.js analytic dashboards on an Angular + NestJS stack for projects with $200k+ budgets.',
    result: '1M+ rows visualised with sub-second latency, giving clients real-time insight.',
  },
];

export const galleryProjects = [
  {
    slug: 'winning',
    title: 'Winning Group',
    site: 'https://www.winning.com.au',
    desc: 'High-performance e-commerce frontend in an Nx monorepo — I led the Angular v20 migration and built a custom UI library.',
    tagline: 'Angular v20 · Nx · Signals · TypeScript',
  },
  {
    slug: 'directline',
    title: 'Direct Line Group',
    site: 'https://www.directlinegroup.co.uk',
    desc: 'Standardised NgRx state across 5+ Angular repos and hardened CI/CD for fast, zero-downtime releases.',
    tagline: 'Angular · NgRx · CI/CD',
  },
  {
    slug: 'srtmarine',
    title: 'SRT Marine',
    site: 'https://www.srt-marine.com',
    desc: 'Real-time marine control UI rendering live data at 60fps, with a shared module library across product lines.',
    tagline: 'Angular · Real-time · 60fps',
  },
  {
    slug: 'qburst',
    title: 'QBurst',
    site: 'https://www.qburst.com',
    desc: 'Interactive D3.js analytics dashboards on Angular + NestJS — 1M+ rows visualised with sub-second latency.',
    tagline: 'Angular · D3.js · NestJS',
  },
];

export const stats = [
  { n: '9+', l: 'Years experience' },
  { n: '3', l: 'Countries delivered' },
  { n: '90%+', l: 'Test coverage' },
  { n: '35%', l: 'Faster builds' },
];

export const services = [
  {
    no: '01',
    title: 'Business Websites',
    body: 'Fast, SEO-ready sites that make small businesses and tradies look established — and bring in enquiries.',
  },
  {
    no: '02',
    title: 'Landing Pages',
    body: 'High-converting single pages for campaigns, launches and lead generation.',
  },
  {
    no: '03',
    title: 'Web Apps & SPAs',
    body: 'Angular and React single-page apps and dashboards with real logic behind them.',
  },
  {
    no: '04',
    title: 'Component & Angular Work',
    body: 'Design-system components, Angular consulting, migrations and performance rescues.',
  },
];

export const testimonials = [
  {
    quote:
      'Add a real client testimonial here — this card is ready to fill in as freelance work grows.',
    name: 'Your client',
    role: 'Add title · company',
  },
  {
    quote:
      'A short quote about reliability, communication or results works best in this spot.',
    name: 'Your client',
    role: 'Add title · company',
  },
  {
    quote:
      'Two to three sentences from a happy client — replace this placeholder when you have it.',
    name: 'Your client',
    role: 'Add title · company',
  },
];

export const socials = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/noel-seban' },
  { label: 'GitHub', href: 'https://github.com/noelsebastian22' },
  { label: 'Medium', href: 'https://medium.com/@noelsimc69' },
];
