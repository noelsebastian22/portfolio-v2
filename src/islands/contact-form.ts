/**
 * A contact form's behaviour. The form works with JS off — a native POST to Formspree, the
 * browser's own constraint messages — so this adds three things on top:
 *
 * 1. **Inline validation messages.** On mount the form turns `noValidate` on, so the island
 *    owns the messages. On submit every field is checked; each invalid one gets
 *    `aria-invalid` and a message in its own element, tied to it by `aria-describedby`, and
 *    focus moves to the first. A field re-checks on `input` and `blur` once it has been
 *    touched — edited and left, or through a submit — never while it is first being filled.
 * 2. **Submitting in place.** To the form's endpoint, `fetch` with the form's `FormData`
 *    and `Accept: application/json`. The status region says sending, then sent or failed.
 *    A failure keeps every field as typed and offers the direct email; a success resets the
 *    form. The status text is the only thing this writes.
 * 3. **A `mailto:` endpoint** (no usable Formspree URL at build time): the fields go into a
 *    `mailto:` URL, which the browser hands to the mail app.
 *
 * Bound by `data-contact-form`, not an id, so `/websites`'s quote form can mount it too.
 * Every field is found by its `name`, and its message element by `data-error-for`.
 * No timers: the status changes on events only.
 */

import { CONTACT_EMAIL, constraintMessage, mailtoHref } from '../lib/contact-form';

type Field = HTMLInputElement | HTMLTextAreaElement;

const STATUS = {
  sending: 'Sending…',
  sent: 'Sent. Thank you — I will reply by email.',
  mailto: 'Opening your email app with the message filled in.',
  failedBefore: 'That did not send, and your message is still here. Try again, or email me at ',
} as const;

export function mountContactForms(): void {
  for (const form of document.querySelectorAll<HTMLFormElement>('form[data-contact-form]')) {
    mountContactForm(form);
  }
}

function mountContactForm(form: HTMLFormElement): void {
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const action = form.getAttribute('action') ?? '';
  // The server already chose (`resolveFormEndpoint`); only its answer is read here.
  const postsByMail = action.startsWith('mailto:');

  // The fields that have a message element are the ones the island checks.
  const fields: Field[] = [];
  for (const element of form.elements) {
    const isTextField = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
    const hasMessage = isTextField && form.querySelector(`[data-error-for="${element.name}"]`) !== null;
    if (isTextField && hasMessage) fields.push(element);
  }

  form.noValidate = true;
  const touched = new Set<Field>();
  const edited = new Set<Field>();
  let sending = false;

  const messageFor = (field: Field): HTMLElement | null =>
    form.querySelector<HTMLElement>(`[data-error-for="${field.name}"]`);

  /** Clears a field's invalid state and its message. */
  function clear(field: Field): void {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    const message = messageFor(field);
    if (message) message.textContent = '';
  }

  /** Checks one field and shows or clears its message. True when the field is valid. */
  function check(field: Field): boolean {
    const valid = field.checkValidity();
    const message = messageFor(field);
    if (valid || !message) {
      clear(field);
      return valid;
    }
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', message.id);
    message.textContent =
      constraintMessage(field.name, field.validity, field.minLength) ?? field.validationMessage;
    return false;
  }

  for (const field of fields) {
    field.addEventListener('input', () => {
      edited.add(field);
      if (touched.has(field)) check(field);
    });
    field.addEventListener('blur', () => {
      if (!edited.has(field) && !touched.has(field)) return;
      touched.add(field);
      check(field);
    });
  }

  function setStatus(text: string, state: 'sending' | 'sent' | 'failed'): void {
    if (!status) return;
    status.dataset.state = state;
    status.textContent = text;
  }

  function showFailure(): void {
    if (!status) return;
    setStatus(STATUS.failedBefore, 'failed');
    const link = document.createElement('a');
    link.href = `mailto:${CONTACT_EMAIL}`;
    link.textContent = CONTACT_EMAIL;
    status.append(link, '.');
  }

  function setSending(on: boolean): void {
    sending = on;
    // aria-disabled rather than disabled: disabling the focused button would drop focus
    // to the page, and a keyboard user would lose their place.
    if (on) submit?.setAttribute('aria-disabled', 'true');
    else submit?.removeAttribute('aria-disabled');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;

    let firstInvalid: Field | null = null;
    for (const field of fields) {
      touched.add(field);
      if (!check(field) && !firstInvalid) firstInvalid = field;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const data = new FormData(form);

    if (postsByMail) {
      setStatus(STATUS.mailto, 'sent');
      window.location.href = mailtoHref({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        message: String(data.get('message') ?? ''),
        lookingFor: data.get('lookingFor') as string | null,
      });
      return;
    }

    setSending(true);
    setStatus(STATUS.sending, 'sending');
    let delivered = false;
    try {
      const response = await fetch(action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      delivered = response.ok;
    } catch {
      delivered = false;
    }
    setSending(false);

    if (!delivered) {
      showFailure();
      return;
    }
    // A fresh form: its empty required fields are invalid, but nobody has touched them.
    form.reset();
    touched.clear();
    edited.clear();
    for (const field of fields) clear(field);
    setStatus(STATUS.sent, 'sent');
  });
}
