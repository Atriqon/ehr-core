'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const inputClass =
  'flex h-11 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-50';

// Only accept same-origin absolute paths. Reject protocol-relative URLs
// (`//evil.com`, `/\evil.com`) that browsers treat as cross-origin, and any
// path that doesn't start with a single `/`. Prevents open-redirect phishing
// via crafted `/login?redirect=...` links.
function safeRedirectTarget(raw: string | null): string {
  const FALLBACK = '/';
  if (!raw) return FALLBACK;
  if (raw.length > 512) return FALLBACK;
  if (!raw.startsWith('/')) return FALLBACK;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return FALLBACK;
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = submitting || pending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Re-entry guard: prevents double-submit while the request is in flight
    // (the `disabled` attr alone is not enough because state updates are async
    // and rapid Enter-key presses can race).
    if (busy) return;

    setError(null);
    setSubmitting(true);

    let res: Response;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      // Network failure (offline, DNS, server unreachable, CORS, adblocker).
      // Must be caught here; otherwise the promise rejection is silent and the
      // user sees no feedback. `res` is never assigned on this path.
      setError('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
      setSubmitting(false);
      return;
    }

    let payload: { success: boolean; error?: string } = { success: false };
    try {
      payload = await res.json();
    } catch {
      // Malformed body; keep payload as the default failure shape and rely on
      // res.ok / generic error below.
    }

    if (!res.ok || !payload.success) {
      setError(payload.error ?? 'No se pudo iniciar sesión');
      setSubmitting(false);
      return;
    }

    // Success: leave `submitting` true until the client-side navigation
    // completes so the form cannot be resubmitted in the brief window before
    // the page unmounts.
    const target = safeRedirectTarget(searchParams.get('redirect'));
    startTransition(() => {
      router.replace(target);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          disabled={busy}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={busy}
        className="h-11 w-full text-sm font-semibold shadow-sm"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Ingresando…
          </>
        ) : (
          'Ingresar'
        )}
      </Button>
    </form>
  );
}
