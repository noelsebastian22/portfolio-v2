import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type FormData = z.infer<typeof schema>;

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm() {
  const [lookingFor, setLookingFor] = useState<'role' | 'project' | ''>('');
  const [status, setStatus] = useState<Status>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setStatus('submitting');
    const endpoint = import.meta.env.PUBLIC_FORMSPREE_ENDPOINT;

    if (!endpoint || endpoint.includes('YOUR_FORM_ID')) {
      // Fallback to mailto if Formspree isn't configured
      const subject = `Portfolio enquiry — ${lookingFor === 'role' ? 'A role (recruiter)' : lookingFor === 'project' ? 'A project (client)' : 'general'}`;
      const body = `Name: ${data.name}\nEmail: ${data.email}\nLooking for: ${lookingFor || 'not specified'}\n\n${data.message}`;
      window.location.href = `mailto:noelsimc69@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setStatus('success');
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, lookingFor }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  const pillBase =
    'flex-1 cursor-pointer rounded-[12px] border-2 py-3.5 px-4 text-[15px] font-bold text-center transition-all duration-200 font-manrope';
  const pillOn = `${pillBase} bg-accent border-accent text-white`;
  const pillOff = `${pillBase} bg-cream border-ink/[0.18] text-ink hover:border-ink`;

  if (status === 'success') {
    return (
      <div
        style={{ maxWidth: 680, margin: '0 auto' }}
        className="rounded-[24px] border-[1.5px] border-ink/[0.14] bg-white p-11 text-center shadow-[0_24px_48px_rgba(22,21,15,0.07)]"
      >
        <div className="mb-4 text-[48px]">✓</div>
        <h3 className="font-bricolage text-[28px] font-extrabold text-ink" style={{ margin: '0 0 12px' }}>
          Message sent!
        </h3>
        <p className="text-[16px] text-ink-secondary" style={{ margin: 0 }}>
          Thanks for reaching out — I'll get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(28px,4vw,44px)' }}
      className="rounded-[24px] border-[1.5px] border-ink/[0.14] bg-white shadow-[0_24px_48px_rgba(22,21,15,0.07)]"
    >
      {/* Role / project toggle */}
      <div className="mb-6">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[1.5px] text-muted-1">
          I'm looking for…
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setLookingFor('role')} className={lookingFor === 'role' ? pillOn : pillOff}>
            👔 A role (recruiter)
          </button>
          <button type="button" onClick={() => setLookingFor('project')} className={lookingFor === 'project' ? pillOn : pillOff}>
            🛠 A project (client)
          </button>
        </div>
      </div>

      {/* Name + Email */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[1px] text-muted-1">
            Name
          </label>
          <input
            {...register('name')}
            placeholder="Your name"
            className="w-full rounded-[12px] border-[1.5px] border-ink/[0.18] bg-cream px-4 py-3.5 font-manrope text-[16px] text-ink transition-colors duration-200 focus:border-accent"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          />
          {errors.name && (
            <p className="mt-1.5 text-[12.5px] text-accent">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[1px] text-muted-1">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@company.com"
            className="w-full rounded-[12px] border-[1.5px] border-ink/[0.18] bg-cream px-4 py-3.5 font-manrope text-[16px] text-ink transition-colors duration-200 focus:border-accent"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          />
          {errors.email && (
            <p className="mt-1.5 text-[12.5px] text-accent">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="mb-6">
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[1px] text-muted-1">
          Message
        </label>
        <textarea
          {...register('message')}
          rows={4}
          placeholder="Tell me about the role or project…"
          className="w-full resize-y rounded-[12px] border-[1.5px] border-ink/[0.18] bg-cream px-4 py-3.5 font-manrope text-[16px] text-ink transition-colors duration-200 focus:border-accent"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        />
        {errors.message && (
          <p className="mt-1.5 text-[12.5px] text-accent">{errors.message.message}</p>
        )}
      </div>

      {status === 'error' && (
        <p className="mb-4 text-center text-[14px] text-accent">
          Something went wrong — please try emailing me directly at{' '}
          <a href="mailto:noelsimc69@gmail.com" className="font-bold underline">
            noelsimc69@gmail.com
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-accent px-7 py-[17px] text-[17px] font-bold text-white transition-all duration-200 hover:-translate-y-[3px] hover:bg-ink disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending…' : 'Send message →'}
      </button>
    </form>
  );
}
