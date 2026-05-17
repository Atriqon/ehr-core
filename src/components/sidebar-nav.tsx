'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CalendarDays, Settings, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/db/schema';
import { canAccessReports } from '@/lib/reports/access';
import { MedicalToolsDrawer } from '@/components/medical-tools/medical-tools-drawer';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  /** When set, the item only renders for these roles. */
  roles?: UserRole[];
  /** Items in the "config" group render below a separator. */
  group?: 'primary' | 'config';
}

const navItems: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home, group: 'primary' },
  { href: '/pacientes', label: 'Pacientes', icon: Users, group: 'primary' },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays, group: 'primary' },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin', 'doctor'], group: 'primary' },
  { href: '/configuracion', label: 'Configuración', icon: Settings, group: 'config' },
];

interface SidebarNavProps {
  role: UserRole;
  onNavigate?: () => void;
}

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const { href, label, icon: Icon } = item;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70',
        isActive
          ? 'bg-slate-700/60 text-white'
          : 'text-slate-300 hover:bg-slate-700/40 hover:text-white',
      )}
    >
      {/* Active indicator bar */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-teal-400 transition-opacity duration-150',
          isActive ? 'opacity-100' : 'opacity-0',
        )}
      />
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-teal-300' : 'text-slate-400 group-hover:text-slate-200',
        )}
      />
      {label}
    </Link>
  );
}

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (item.href === '/reportes') return canAccessReports(role);
    return item.roles.includes(role);
  });

  const isItemActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const primary = visibleItems.filter((i) => i.group === 'primary');
  const config = visibleItems.filter((i) => i.group === 'config');

  return (
    <nav className="flex flex-col gap-1 p-3">
      <p className="px-3 pb-1.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
        Menú
      </p>
      {primary.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={isItemActive(item.href)}
          onNavigate={onNavigate}
        />
      ))}

      <div className="my-2 h-px bg-slate-700/70" />

      <p className="px-3 pb-1.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
        Sistema
      </p>
      {config.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={isItemActive(item.href)}
          onNavigate={onNavigate}
        />
      ))}
      <MedicalToolsDrawer />
    </nav>
  );
}
