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
    // Two frosted panels float over the ambient body backdrop, separated by a
    // 14px gutter. h-screen + flex-col keeps each panel exactly one viewport
    // tall so the sidebar never scrolls away its user block.
    <div className="flex h-screen gap-3.5 overflow-hidden p-3.5">
      {/* ── Desktop sidebar — light, frosted, floating ── */}
      <aside className="glass-panel hidden w-64 shrink-0 flex-col overflow-hidden lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-900/6 px-5">
          <BrandLogo size="sm" />
        </div>
        {/* Nav scrolls on its own; min-h-0 lets it shrink inside the flex column. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav role={user.role} />
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-900/6 px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0D9488,#0F766E)] text-xs font-semibold text-white shadow-[0_4px_10px_-3px_rgba(13,148,136,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]">
            {getInitials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {user.fullName}
            </p>
            <p className="text-[11px] text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </aside>

      {/* ── Main area — frosted column ── */}
      <div className="glass-panel flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Top header — translucent bar ── */}
        <header className="glass-header flex h-16 shrink-0 items-center gap-3 border-b border-slate-900/6 px-4 lg:px-6">
          {/* Mobile hamburger */}
          <MobileSidebar role={user.role}>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-2 text-zinc-500 transition-colors duration-150 hover:bg-slate-900/6 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          </MobileSidebar>

          <GlobalSearch />

          <div className="ml-auto flex items-center justify-end gap-3">
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-[13px] font-semibold text-zinc-900">
                {user.fullName}
              </span>
              <span className="text-[11px] text-zinc-500">{roleLabel}</span>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0D9488,#0F766E)] text-xs font-semibold text-white shadow-[0_4px_10px_-3px_rgba(13,148,136,0.45)]">
              {getInitials(user.fullName)}
            </span>
            <LogoutButton />
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
