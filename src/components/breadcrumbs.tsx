import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Crumb } from '@/lib/breadcrumbs';

interface BreadcrumbsProps {
  items: Crumb[];
}

// Reusable breadcrumb bar. The last item always renders as the current page
// (non-clickable) regardless of whether it carries an `href`. Items wrap on
// narrow viewports and long labels are truncated by the helpers in
// src/lib/breadcrumbs.ts.
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Ruta de navegación" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-1.5">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-600"
                  aria-hidden
                />
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className="max-w-[16rem] truncate font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="max-w-[12rem] truncate text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
