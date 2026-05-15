'use client';

import { useEffect, useState } from 'react';

// ─── Country dial codes ────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'DE', flag: '🇩🇪', dial: '+49',  label: 'Deutschland' },
  { code: 'AT', flag: '🇦🇹', dial: '+43',  label: 'Österreich' },
  { code: 'CH', flag: '🇨🇭', dial: '+41',  label: 'Schweiz' },
  { code: 'GB', flag: '🇬🇧', dial: '+44',  label: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', dial: '+1',   label: 'United States' },
  { code: 'FR', flag: '🇫🇷', dial: '+33',  label: 'France' },
  { code: 'IT', flag: '🇮🇹', dial: '+39',  label: 'Italy' },
  { code: 'ES', flag: '🇪🇸', dial: '+34',  label: 'Spain' },
  { code: 'NL', flag: '🇳🇱', dial: '+31',  label: 'Netherlands' },
  { code: 'PT', flag: '🇵🇹', dial: '+351', label: 'Portugal' },
  { code: 'PL', flag: '🇵🇱', dial: '+48',  label: 'Poland' },
  { code: 'TR', flag: '🇹🇷', dial: '+90',  label: 'Turkey' },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnimationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnimationSheet({ isOpen, onClose, endpoint }: AnimationSheetProps) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [dialCode, setDialCode] = useState('+49');
  const [phone,    setPhone]    = useState('');
  const [status,   setStatus]   = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return;

    try {
      setStatus('submitting');
      const fullPhone = phone.trim() ? `${dialCode} ${phone.trim()}` : undefined;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          name:  name.trim() || undefined,
          phone: fullPhone,
        }),
      });
      if (!res.ok) { setStatus('error'); return; }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  const inputClass =
    'h-11 w-full rounded-xl border border-[#853953]/30 bg-[#F3F4F4]/5 px-4 text-sm text-[#F3F4F4] placeholder-[#F3F4F4]/25 outline-none transition focus:border-[#853953] focus:bg-[#F3F4F4]/8';

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Zugang anfordern"
        className={`fixed bottom-0 left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 rounded-t-3xl
          border border-b-0 border-[#853953]/25 bg-[#2C2C2C] shadow-2xl
          sm:w-[420px]
          transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-2 pt-4">
          <div className="h-1 w-10 rounded-full bg-[#F3F4F4]/20" />
        </div>

        <div className="px-6 pb-10 pt-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#F3F4F4]">Zugang anfordern</h2>
              <p className="mt-1 text-sm text-[#F3F4F4]/40">Wir melden uns innerhalb von 24 Stunden.</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Schließen"
              className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#853953]/30 text-[#F3F4F4]/40 transition hover:border-[#853953] hover:text-[#F3F4F4]"
            >
              ✕
            </button>
          </div>

          {status === 'success' ? (
            <div className="rounded-2xl border border-[#853953]/30 bg-[#853953]/10 p-6 text-center">
              <div className="text-2xl mb-2">✓</div>
              <div className="font-semibold text-[#853953]">Danke! Wir melden uns bald.</div>
              <p className="mt-1 text-sm text-[#F3F4F4]/40">Wir prüfen deine Anfrage und kommen auf dich zu.</p>
            </div>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={onSubmit}>
              {/* Name */}
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-[#F3F4F4]/50">Name</div>
                <input
                  className={inputClass}
                  placeholder="Max Mustermann"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  autoComplete="name"
                />
              </label>

              {/* Email */}
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-[#F3F4F4]/50">E-Mail <span className="text-[#853953]">*</span></div>
                <input
                  className={inputClass}
                  placeholder="max@firma.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>

              {/* Phone */}
              <div>
                <div className="mb-1.5 text-xs font-medium text-[#F3F4F4]/50">Telefon</div>
                <div className="flex gap-2">
                  {/* Country selector */}
                  <div className="relative flex-shrink-0">
                    <select
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="h-11 appearance-none rounded-xl border border-[#853953]/30 bg-[#F3F4F4]/5 pl-3 pr-7 text-sm text-[#F3F4F4] outline-none transition focus:border-[#853953] cursor-pointer"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.dial} className="bg-[#2C2C2C] text-[#F3F4F4]">
                          {c.flag} {c.dial}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#F3F4F4]/30 text-xs">▾</span>
                  </div>

                  {/* Number input */}
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder="1234 567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    autoComplete="tel-national"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting' || !email.trim()}
                className="mt-2 h-12 w-full rounded-full text-sm font-semibold tracking-wide text-[#F3F4F4] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #612D53, #853953)' }}
              >
                {status === 'submitting' ? 'Wird gesendet…' : 'Zugang anfordern →'}
              </button>

              {status === 'error' && (
                <div className="text-center text-sm text-red-400">
                  Etwas ist schiefgelaufen. Bitte versuche es erneut.
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
