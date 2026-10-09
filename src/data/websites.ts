/**
 * Content for /websites — the client-facing page.
 *
 * WHY THIS PAGE EXISTS
 * The root domain runs two pitches at once. Its H1 says "Senior Web Engineer &
 * Angular Specialist", the hero leads with Nx and NgRx, and the contact form
 * opens by asking recruiter-or-client. That is excellent for a hiring manager
 * and actively wrong for a cafe owner who wants a $1,500 brochure site — they
 * land on enterprise vocabulary and have to scroll three sections before
 * reaching anything they recognise.
 *
 * So: no Angular, no Nx, no NgRx, no recruiter toggle, no years-of-experience
 * framing. Plain English, the work, the price, the next step. This is the URL
 * that goes on Upwork, in cold emails and on the Google Business profile.
 *
 * Everything here must stay true. No invented client counts, no fake reviews,
 * no "trusted by 50+ businesses".
 */

export const websitesNav = [
  { label: 'What I build', href: '#what' },
  { label: 'Recent work', href: '#work' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'How it works', href: '#process' },
  { label: 'FAQ', href: '#faq' },
];

export const websitesHero = {
  eyebrow: 'Web developer · Blue Mountains, NSW',
  headline: 'A website that actually brings you work',
  sub: 'I build fast, mobile-first websites for trade and service businesses — the kind that load in under a second, show up on Google, and turn a visitor into a phone call. Fixed price, agreed before I start.',
  primaryCta: { label: 'Get a quote', href: '#contact' },
  secondaryCta: { label: 'See recent work', href: '#work' },
  /** Short, checkable facts. Nothing here should require you to trust me. */
  facts: [
    'Fixed price, quoted up front',
    'Built to load fast on mobile data',
    'You own the domain and the site',
  ],
};

export const websitesWhat = {
  title: 'What you get',
  intro:
    'Every site I build ships with the same foundations. These are not upsells — they are the reason a site earns its keep instead of sitting there.',
  items: [
    {
      no: '01',
      title: 'Works on a phone first',
      body: 'Most of your customers will find you on a phone, often on patchy data. The site is built for that case first and the desktop layout follows, not the other way round.',
    },
    {
      no: '02',
      title: 'Loads in about a second',
      body: 'Static pages, images compressed and resized properly, no page-builder bloat. Slow sites lose people before they ever see what you do.',
    },
    {
      no: '03',
      title: 'Set up to be found',
      body: 'Proper page titles and descriptions, a sitemap, and the business schema Google uses for local results. Wired up to Google Search Console so you can see what people search for.',
    },
    {
      no: '04',
      title: 'An enquiry form that reaches you',
      body: 'Form submissions land in your inbox, with your phone number clickable on every screen. No customer portal to log into, no third-party app to check.',
    },
    {
      no: '05',
      title: 'Readable by everyone',
      body: 'Built to WCAG 2.1 AA — real colour contrast, keyboard navigation, sensible alt text. It is also what search engines read.',
    },
    {
      no: '06',
      title: 'Yours, not rented',
      body: 'The domain is registered in your name and the site is yours. No monthly platform fee, no being locked out if you stop paying someone.',
    },
  ],
};

export const websitesPricing = {
  title: 'Pricing',
  intro:
    'Fixed price agreed before anything starts, so you know the number on day one. Timelines are honest ones — I build these alongside a full-time job, and I would rather quote three weeks and finish in two.',
  tiers: [
    {
      name: 'Landing page',
      price: '$500 – $900',
      timeline: 'About a week',
      summary: 'One page that does one job: get the phone to ring.',
      includes: [
        'Single scrolling page',
        'Services, gallery, enquiry form',
        'Click-to-call and Google Maps',
        'Domain and hosting set up',
      ],
      featured: false,
    },
    {
      name: 'Brochure site',
      price: '$1,200 – $2,000',
      timeline: '2 – 3 weeks',
      summary: 'Three to five pages. The usual choice for a trade or service business.',
      includes: [
        'Home, services, gallery, about, contact',
        'Everything in the landing page tier',
        'Local business schema for Google',
        'Search Console and analytics set up',
      ],
      featured: true,
    },
    {
      name: 'Business site',
      price: '$2,500 – $4,000',
      timeline: '4 – 6 weeks',
      summary: 'Six to ten pages, for a business with several services or locations.',
      includes: [
        'A page per service or location',
        'Everything in the brochure tier',
        'Content structured for search',
        'Optional CMS so you can edit it yourself',
      ],
      featured: false,
    },
  ],
  addOns: [
    { label: 'SEO audit and fixes on an existing site', price: '$450 – $800' },
    { label: 'CMS so you can edit the content yourself', price: '+$400 – $700' },
    { label: 'Rush delivery', price: '+25%' },
  ],
  note:
    'Web apps, booking systems and anything with logins are quoted separately — send me the details and I will tell you honestly whether I am the right person for it.',
};

export const websitesProcess = [
  {
    no: '01',
    title: 'Tell me what you do',
    body: 'A phone call or a few emails. What the business does, who you want ringing you, and what your current site (if any) is failing at.',
  },
  {
    no: '02',
    title: 'You get a fixed price',
    body: 'A written scope and one number. If it changes later, it changes because you asked for something new — not because I under-quoted.',
  },
  {
    no: '03',
    title: 'You see it before it goes live',
    body: 'I build it on a preview link you can open on your own phone and send to whoever you want. Two rounds of changes are included.',
  },
  {
    no: '04',
    title: 'It goes live in your name',
    body: 'Domain, hosting, email forwarding, Google Search Console. All registered to you, with the logins handed over.',
  },
];

export const websitesFaq = [
  {
    q: 'Do I need to have a domain already?',
    a: 'No. If you have one I will move it across; if you do not, I will register one in your name and set it up. You own it either way — that matters if we ever part ways.',
  },
  {
    q: 'What does it cost to keep running?',
    a: 'Hosting for a site this size is free to a few dollars a month, and a .com.au domain is roughly $20–30 a year. There is no monthly fee to me unless you specifically want an ongoing arrangement.',
  },
  {
    q: 'Can I update the content myself?',
    a: 'Text and photo changes are usually quicker for you to send me than to do yourself, and small ones are no charge in the first few months. If you would rather have full control, I can add a CMS — that is the add-on price above.',
  },
  {
    q: 'How long does it really take?',
    a: 'The ranges above are what I quote, and I build these alongside a full-time job so they are padded on purpose. If a job runs long you will hear it from me before the deadline, not after it.',
  },
  {
    q: 'What if I already have a website?',
    a: 'Send me the link. Sometimes the honest answer is that yours is fine and you need an SEO fix rather than a rebuild, and I will tell you that rather than sell you a new site.',
  },
  {
    q: 'Where are you based?',
    a: 'The Blue Mountains, NSW. I work with businesses anywhere in Australia — most of it happens over the phone and email regardless — but I am happy to meet in person if you are local.',
  },
];

/** Live builds. `concept` marks a self-directed piece so nothing overstates itself. */
export const websitesWork = [
  {
    title: 'TopDel Renovation',
    kind: 'Client site · Sydney',
    concept: false,
    site: 'https://topdelrenovation.com.au/',
    img: '/images/gallery/topdel-renovations-card.webp',
    desc: 'Custom joinery and renovations. A photography-led site where the completed-project gallery does the selling, and the quote form is one tap from anywhere on the page.',
  },
  {
    title: 'PLUMBER.',
    kind: 'Concept build · Trades',
    concept: true,
    site: 'https://plumber.noel-sebastian.com/',
    img: '/images/gallery/plumping-card.webp',
    desc: 'A single-page site for a plumbing and handyman business, laid out end to end around one action: booking the job.',
  },
  {
    title: 'Menzone',
    kind: 'Concept build · Chippendale',
    concept: true,
    site: 'https://laserclinic.noel-sebastian.com/',
    img: '/images/gallery/laserclinic-card.webp',
    desc: 'A one-room male waxing and laser studio. Every price published up front, before-and-after sliders you drag to compare, and a booking link on every screen so nobody has to ring and explain what they want.',
  },
];
