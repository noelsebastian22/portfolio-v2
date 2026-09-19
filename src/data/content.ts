export const nav = [
  { label: 'Home', href: '#top' },
  { label: 'Services', href: '#services' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
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
  Intermediate: '#6d675c',
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

/**
 * The freelance slot in the Work section. This replaced a dashed
 * "Your project could go here" placeholder, which read as "no freelance
 * clients yet" to exactly the visitor it was meant to attract.
 *
 * Keep the claims verifiable. No invented conversion numbers — the credibility
 * here comes from it being a real trading business with a real domain, and the
 * enterprise case studies above already carry the metrics.
 */
export const freelanceCaseStudy = {
  name: 'TopDel Renovation',
  role: 'Custom joinery business site · Sydney',
  site: 'https://topdelrenovation.com.au/',
  tags: ['Astro', 'Sharp pipeline', 'SEO', 'WCAG 2.1 AA'],
  problem:
    'A custom joinery maker with genuinely premium work and no site to prove it — homeowners comparing makers had nothing to judge the craft on before ringing.',
  approach:
    'Built a photography-led Astro site around the completed-project gallery, with every image run through a Sharp responsive pipeline, LocalBusiness and FAQ schema, and a quote form as the low-friction next step.',
  result:
    'Live on the client’s own domain: a two-page static build with inlined critical CSS, responsive WebP throughout, and the gallery — not the copy — doing the selling.',
};

export const galleryProjects = [
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
    img: 'ezytrack.jpg',
    title: 'Ezytrack',
    site: 'https://ezytrack.noel-sebastian.com/',
    desc: 'Market-leading GPS fleet-tracking business site — real-time vehicle visibility, route history, geofencing and dashcam integration for Australian fleets.',
    tagline: 'Astro · Tailwind v4 · TypeScript',
  },
  {
    slug: 'plumber',
    img: 'plumping.png',
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
