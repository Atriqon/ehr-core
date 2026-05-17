import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Menu } from 'lucide-react';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { LogoutButton } from '@/components/logout-button';
import { SidebarNav } from '@/components/sidebar-nav';
import { MobileSidebar } from '@/components/mobile-sidebar';
import { GlobalSearch } from '@/components/search/global-search';
import { ToastProvider } from '@/components/ui/toast';
import { BrandLogo } from '@/components/brand-logo';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Médico',
  receptionist: 'Recepcionista',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { fullName: true, role: true, email: true },
  });

  if (!user) redirect('/login');

  const roleLabel = roleLabels[user.role] ?? user.role;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Desktop sidebar ──
          h-screen on the wrapper + flex-col here makes the sidebar exactly
          one viewport tall regardless of page content: it never shrinks on
          short pages and never scrolls away the user block on long ones. */}
      <aside className="hidden w-64 shrink-0 flex-col bg-linear-to-b from-slate-800 via-slate-800 to-slate-900 lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-700/50 px-5">
          <BrandLogo size="sm" onDark />
        </div>
        {/* Nav scrolls on its own; min-h-0 lets it shrink inside the flex column. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav role={user.role} />
        </div>
        <div className="shrink-0 border-t border-slate-700/70 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600/20 text-xs font-semibold text-teal-300 ring-1 ring-teal-500/30">
              {getInitials(user.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top header ── */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 lg:px-6">
          {/* Mobile hamburger */}
          <MobileSidebar role={user.role}>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          </MobileSidebar>

          <GlobalSearch />

          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-sm font-semibold text-zinc-900">
                {user.fullName}
              </span>
              <span className="text-xs text-zinc-500">{roleLabel}</span>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
              {getInitials(user.fullName)}
            </span>
            <LogoutButton />
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="app-surface flex-1 overflow-y-auto">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
