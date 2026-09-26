/**
 * The contact form's pure parts: where it posts, what a `mailto:` fallback says, and the
 * words for each broken constraint. Shared by `Contact.astro` (the endpoint, at build time)
 * and `islands/contact-form.ts` (everything else, in the browser).
 *
 * Pure module: no DOM, no `import.meta.env`. The caller hands the configured value in.
 */

export const CONTACT_EMAIL = 'noel@noel-sebastian.com';

/**
 * The live form. Public by nature: it is the `action` of a form anyone can view-source.
 * Production sets no `PUBLIC_FORMSPREE_ENDPOINT`, so this is what ships (Decisions,
 * 2026-09-26): a `mailto:` fallback whenever the variable is unset would turn the live
 * form off.
 */
export const LIVE_FORMSPREE_ENDPOINT = 'https://formspree.io/f/xpqgynyw';

/** An `https://formspree.io/f/<id>` URL whose id is not the `.env.example` placeholder. */
export function isFormspreeEndpoint(value: string | null | undefined): boolean {
  if (!value || value.includes('YOUR_FORM_ID')) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const hasFormPath = /^\/f\/[A-Za-z0-9]+\/?$/.test(url.pathname);
  return url.protocol === 'https:' && url.hostname === 'formspree.io' && hasFormPath;
}

/**
 * The form's `action`: the configured endpoint, else the live one; and only if that is not
 * a usable Formspree URL (a placeholder, a typo), `mailto:` the direct address.
 */
export function resolveFormEndpoint(configured: string | null | undefined): string {
  const candidate = configured?.trim() || LIVE_FORMSPREE_ENDPOINT;
  return isFormspreeEndpoint(candidate) ? candidate : `mailto:${CONTACT_EMAIL}`;
}

/** The radio group's values, as Formspree receives them in `lookingFor`. */
export type LookingFor = 'role' | 'project';

export interface Enquiry {
  name: string;
  email: string;
  message: string;
  lookingFor?: string | null;
}

const LOOKING_FOR_LABEL: Record<LookingFor, string> = {
  role: 'A role',
  project: 'A project',
};

function lookingForLabel(value: string | null | undefined): string | null {
  return value === 'role' || value === 'project' ? LOOKING_FOR_LABEL[value] : null;
}

/**
 * A `mailto:` URL carrying the enquiry: the subject names the role/project choice and the
 * body holds every field, as the old React form's fallback did.
 */
export function mailtoHref(enquiry: Enquiry, to: string = CONTACT_EMAIL): string {
  const choice = lookingForLabel(enquiry.lookingFor);
  const subject = `Portfolio enquiry — ${choice ?? 'general'}`;
  const body = [
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Looking for: ${choice ?? 'not specified'}`,
    '',
    enquiry.message,
  ].join('\n');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The constraint failures the form's fields can have; the rest of `ValidityState`. */
export type Broken = Pick<ValidityState, 'valueMissing' | 'typeMismatch' | 'tooShort'>;

/** Field names the messages know about. Any other field gets the browser's own message. */
export type FieldName = 'name' | 'email' | 'message';

const MISSING: Record<FieldName, string> = {
  name: 'Enter your name.',
  email: 'Enter your email address.',
  message: 'Write a message.',
};

const TOO_SHORT_NOUN: Record<FieldName, string> = {
  name: 'Your name',
  email: 'Your email address',
  message: 'Your message',
};

/**
 * The message for a field's first broken constraint, or `null` when none is broken. The
 * minimum comes from the field's own `minlength`, so the HTML stays the one place it is set.
 */
export function constraintMessage(field: string, broken: Broken, minLength: number): string | null {
  const known = field === 'name' || field === 'email' || field === 'message';
  if (!known) return null;
  if (broken.valueMissing) return MISSING[field];
  if (broken.typeMismatch) return 'Enter an email address like name@company.com.';
  if (broken.tooShort) return `${TOO_SHORT_NOUN[field]} needs at least ${minLength} characters.`;
  return null;
}
