import { describe, it, expect } from 'vitest';
import {
  CONTACT_EMAIL,
  LIVE_FORMSPREE_ENDPOINT,
  constraintMessage,
  isFormspreeEndpoint,
  mailtoHref,
  resolveFormEndpoint,
} from '../src/lib/contact-form';

const NONE = { valueMissing: false, typeMismatch: false, tooShort: false };

describe('resolveFormEndpoint — the form action, decided at build time', () => {
  it('ships the live form when the variable is unset or empty', () => {
    expect(resolveFormEndpoint(undefined)).toBe(LIVE_FORMSPREE_ENDPOINT);
    expect(resolveFormEndpoint(null)).toBe(LIVE_FORMSPREE_ENDPOINT);
    expect(resolveFormEndpoint('')).toBe(LIVE_FORMSPREE_ENDPOINT);
    expect(resolveFormEndpoint('   ')).toBe(LIVE_FORMSPREE_ENDPOINT);
  });

  it('uses a configured Formspree form', () => {
    expect(resolveFormEndpoint('https://formspree.io/f/abc123XYZ')).toBe('https://formspree.io/f/abc123XYZ');
    expect(resolveFormEndpoint(' https://formspree.io/f/abc123 ')).toBe('https://formspree.io/f/abc123');
  });

  it('falls back to mailto: only for a value that is set but unusable', () => {
    const mailto = `mailto:${CONTACT_EMAIL}`;
    expect(resolveFormEndpoint('https://formspree.io/f/YOUR_FORM_ID')).toBe(mailto);
    expect(resolveFormEndpoint('http://formspree.io/f/abc123')).toBe(mailto);
    expect(resolveFormEndpoint('https://formspree.io.evil.example/f/abc123')).toBe(mailto);
    expect(resolveFormEndpoint('https://formspree.io/abc123')).toBe(mailto);
    expect(resolveFormEndpoint('not a url')).toBe(mailto);
  });

  it('holds the live default to its own rule', () => {
    expect(isFormspreeEndpoint(LIVE_FORMSPREE_ENDPOINT)).toBe(true);
  });
});

describe('mailtoHref — the fallback enquiry', () => {
  const enquiry = { name: 'Ada', email: 'ada@example.com', message: 'Line one\nLine two & more' };

  function parse(href: string) {
    const [address, query] = href.replace(/^mailto:/, '').split('?');
    const params = new URLSearchParams(query);
    return { address, subject: params.get('subject'), body: params.get('body') };
  }

  it('names the choice in the subject and carries every field in the body', () => {
    const { address, subject, body } = parse(mailtoHref({ ...enquiry, lookingFor: 'role' }));
    expect(address).toBe(CONTACT_EMAIL);
    expect(subject).toBe('Portfolio enquiry — A role');
    expect(body).toBe('Name: Ada\nEmail: ada@example.com\nLooking for: A role\n\nLine one\nLine two & more');
  });

  it('reads no choice, or an unknown one, as unspecified', () => {
    for (const lookingFor of [undefined, null, '', 'recruiter']) {
      const { subject, body } = parse(mailtoHref({ ...enquiry, lookingFor }));
      expect(subject).toBe('Portfolio enquiry — general');
      expect(body).toContain('Looking for: not specified');
    }
    expect(parse(mailtoHref({ ...enquiry, lookingFor: 'project' })).subject).toBe('Portfolio enquiry — A project');
  });

  it('encodes with %20, not +, so mail clients do not show plus signs', () => {
    const href = mailtoHref(enquiry);
    expect(href).not.toContain('+');
    expect(href).toContain('%20');
  });
});

describe('constraintMessage — the words for a broken constraint', () => {
  it('says what is missing, per field', () => {
    expect(constraintMessage('name', { ...NONE, valueMissing: true }, 2)).toBe('Enter your name.');
    expect(constraintMessage('email', { ...NONE, valueMissing: true }, 0)).toBe('Enter your email address.');
    expect(constraintMessage('message', { ...NONE, valueMissing: true }, 10)).toBe('Write a message.');
  });

  it('takes the minimum from the field, not from a second copy', () => {
    expect(constraintMessage('name', { ...NONE, tooShort: true }, 2)).toBe('Your name needs at least 2 characters.');
    expect(constraintMessage('message', { ...NONE, tooShort: true }, 10)).toBe('Your message needs at least 10 characters.');
  });

  it('explains a malformed email', () => {
    expect(constraintMessage('email', { ...NONE, typeMismatch: true }, 0)).toMatch(/email address/);
  });

  it('has nothing to say for a valid field or an unknown one', () => {
    expect(constraintMessage('name', NONE, 2)).toBeNull();
    expect(constraintMessage('phone', { ...NONE, valueMissing: true }, 0)).toBeNull();
  });
});
