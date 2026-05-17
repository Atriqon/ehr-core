import { Activity, ShieldCheck, Stethoscope } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 bg-[#FAFAFA]">
      {/* ── Form side ── */}
      <div className="flex w-full flex-col px-6 py-10 sm:px-12 lg:w-1/2 lg:px-16">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-sm">
            {/* Logo + product name, centered above the form */}
            <div className="mb-8 flex flex-col items-center text-center">
              <BrandLogo size="lg" iconOnly />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
                Hisamed
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Historia clínica electrónica
              </p>
            </div>
            {children}
          </div>
        </div>
        <footer className="mt-8 text-center text-xs text-zinc-400">
          © 2026 Hisamed · Powered by Atriqon
        </footer>
      </div>

      {/* ── Branding side (desktop only) ── */}
      <div className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:w-1/2">
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-br from-teal-600 via-teal-700 to-slate-900"
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
        />
        <div className="relative flex flex-col justify-center gap-10 px-16 text-white">
          <div>
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
              La historia clínica de tu clínica, ordenada y segura.
            </h2>
            <p className="mt-3 max-w-md text-sm text-teal-50/80">
              Gestiona pacientes, agenda y notas clínicas en un solo lugar,
              diseñado para el día a día médico.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {[
              { icon: Stethoscope, text: 'Notas clínicas y evolución estructuradas' },
              { icon: Activity, text: 'Agenda y seguimiento de pacientes en tiempo real' },
              { icon: ShieldCheck, text: 'Datos protegidos con auditoría completa' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5 text-teal-100" />
                </span>
                <span className="text-sm text-teal-50/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
