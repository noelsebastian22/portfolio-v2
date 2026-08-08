import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * The /websites enquiry form.
 *
 * Deliberately NOT the root-domain ContactForm. That one opens by asking
 * "recruiter or client?", which on a page a business owner reached from a cold
 * email is a confusing first question and a small signal that the page was not
 * written for them. Here the first question is the one they can answer without
 * thinking: what kind of site do you need?
 *
 * The project-type and budget fields are also doing qualification work — a
 * "not sure yet" plus no budget is a different reply from "business site,
 * $2,500–4,000".
 */

const schema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  business: z.string().min(2, 'Please enter your business name'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  message: z.string().min(10, 'A sentence or two about the job is plenty'),
});

type FormData = z.infer<typeof schema>;
type Status = 'idle' | 'submitting' | 'success' | 'error';

const DEFAULT_FORMSPREE_ENDPOINT = 'https://formspree.io/f/xpqgynyw';

const PROJECT_TYPES = [
  'Landing page',
  'Brochure site (3–5 pages)',
  'Business site (6–10 pages)',
  'Fixing an existing site',
  'Not sure yet',
] as const;

export default function ClientQuoteForm() {
  const [projectType, setProjectType] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setStatus('submitting');
    const endpoint =
      import.meta.env.PUBLIC_FORMSPREE_ENDPOINT || DEFAULT_FORMSPREE_ENDPOINT;

    const payload = { ...data, projectType: projectType || 'not specified', source: '/websites' };

    if (!endpoint || endpoint.includes('YOUR_FORM_ID')) {
      const subject = `Website enquiry — ${data.business}`;
      const body =
        `Name: ${data.name}\n` +
        `Business: ${data.business}\n` +
        `Email: ${data.email}\n` +
        `Phone: ${data.phone || '—'}\n` +
        `Project type: ${payload.projectType}\n\n` +
        data.message;
      window.location.href = `mailto:noel@noel-sebastian.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setStatus('success');
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const chipBase =
    'cursor-pointer rounded-full border-2 px-4 py-2.5 text-[14px] font-bold transition-all duration-200 font-manrope';
  const chipOn = `${chipBase} bg-accent border-accent text-white`;
  const chipOff = `${chipBase} bg-cream border-ink/[0.18] text-ink hover:border-ink`;

  const fieldClass =
    'w-full rounded-[12px] border-[1.5px] border-ink/[0.18] bg-cream px-4 py-3.5 font-manrope text-[16px] text-ink transition-colors duration-200 focus:border-accent';
  const labelClass =
    'mb-2 block font-mono text-[11px] uppercase tracking-[1px] text-muted-1';

  if (status === 'success') {
    return (
      <div
        style={{ maxWidth: 680, margin: '0 auto' }}
        className="rounded-[24px] border-[1.5px] border-ink/[0.14] bg-white p-7 text-center shadow-[0_24px_48px_rgba(22,21,15,0.07)] sm:p-11"
      >
        <div className="mb-4 text-[48px]">✓</div>
        <h3 className="font-bricolage text-[28px] font-extrabold text-ink" style={{ margin: '0 0 12px' }}>
          Got it — thanks
        </h3>
        <p className="text-[16px] text-ink-secondary" style={{ margin: 0 }}>
          I'll come back to you within a day, usually sooner. If it's urgent, email me directly at{' '}
          <a href="mailto:noel@noel-sebastian.com" className="font-bold text-accent-dark">
            noel@noel-sebastian.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ maxWidth: 680, margin: '0 auto' }}
      className="rounded-[24px] border-[1.5px] border-ink/[0.14] bg-white p-6 shadow-[0_24px_48px_rgba(22,21,15,0.07)] sm:p-10"
    >
      <fieldset className="mb-6 border-0 p-0" style={{ margin: '0 0 24px' }}>
        <legend className="mb-3 p-0 font-mono text-[11px] uppercase tracking-[1.5px] text-muted-1">
          What do you need?
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {PROJECT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={projectType === t}
              onClick={() => setProjectType(projectType === t ? '' : t)}
              className={projectType === t ? chipOn : chipOff}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cq-name" className={labelClass}>Your name</label>
          <input id="cq-name" {...register('name')} placeholder="Jane Smith" className={fieldClass} />
          {errors.name && <p className="mt-1.5 text-[12.5px] text-accent">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="cq-business" className={labelClass}>Business name</label>
          <input id="cq-business" {...register('business')} placeholder="Smith Plumbing" className={fieldClass} />
          {errors.business && <p className="mt-1.5 text-[12.5px] text-accent">{errors.business.message}</p>}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cq-email" className={labelClass}>Email</label>
          <input id="cq-email" type="email" {...register('email')} placeholder="you@business.com.au" className={fieldClass} />
          {errors.email && <p className="mt-1.5 text-[12.5px] text-accent">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="cq-phone" className={labelClass}>
            Phone <span className="normal-case tracking-normal text-muted-3">(optional)</span>
          </label>
          <input id="cq-phone" type="tel" {...register('phone')} placeholder="0400 000 000" className={fieldClass} />
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="cq-message" className={labelClass}>What does the business do?</label>
        <textarea
          id="cq-message"
          rows={4}
          {...register('message')}
          placeholder="A sentence or two about the business, and what you want the site to do. A link to your current site or Facebook page helps."
          className={`${fieldClass} resize-y`}
        />
        {errors.message && <p className="mt-1.5 text-[12.5px] text-accent">{errors.message.message}</p>}
      </div>

      {status === 'error' && (
        <p className="mb-4 text-center text-[14px] text-accent-dark">
          Something went wrong sending that — please email me directly at{' '}
          <a href="mailto:noel@noel-sebastian.com" className="font-bold underline">
            noel@noel-sebastian.com
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-accent px-7 py-[17px] text-[17px] font-bold text-white transition-all duration-200 hover:-translate-y-[3px] hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending…' : 'Get a quote →'}
      </button>

      <p className="mt-4 text-center font-mono text-[12px] text-muted-3">
        No obligation. I'll reply within a day with a price or a question.
      </p>
    </form>
  );
}
