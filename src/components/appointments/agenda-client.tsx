'use client';

import { useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  toDateStr,
  parseDateStr as parseOptional,
  getWeekStart,
  type WeekStartsOn,
} from '@/lib/dates';

type ViewMode = 'day' | 'week';

interface AgendaControlsProps {
  doctors: { id: string; fullName: string }[];
  /** First day of the week according to the clinic's settings. */
  weekStartsOn: WeekStartsOn;
  /** "Today" in the clinic's timezone (YYYY-MM-DD). Used by the "Hoy" button. */
  todayStr: string;
}

function parseDateStr(str: string | null, fallback: string): Date {
  return parseOptional(str) ?? parseOptional(fallback) ?? new Date();
}

function isSameWeek(a: Date, b: Date, weekStartsOn: WeekStartsOn): boolean {
  return toDateStr(getWeekStart(a, weekStartsOn)) === toDateStr(getWeekStart(b, weekStartsOn));
}

export function AgendaControls({ doctors, weekStartsOn, todayStr }: AgendaControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Always derive current view/date/doctor from the live URL — never from
  // props passed by the server component. Props would be stale between the
  // moment we call router.push and the moment the new RSC payload arrives,
  // which caused issues like "click back, then forward, no data".
  const view: ViewMode = searchParams.get('view') === 'week' ? 'week' : 'day';
  const dateParam = searchParams.get('date');
  const selectedDoctorId = searchParams.get('doctor') ?? '';

  const push = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === '') params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  function navigate(direction: -1 | 1) {
    // Resolve the currently visible date from the URL (or clinic "today" if absent).
    const current = parseDateStr(dateParam, todayStr);
    if (view === 'day') {
      current.setDate(current.getDate() + direction);
      push({ date: toDateStr(current) });
    } else {
      // Move by 7 days, then snap to the start of that week (per clinic
      // weekStartsOn) so the URL date is always canonical.
      current.setDate(current.getDate() + direction * 7);
      push({ date: toDateStr(getWeekStart(current, weekStartsOn)) });
    }
  }

  function goToday() {
    // Use clinic-tz "today" so the button is correct even if the user is
    // browsing from a different timezone than the clinic.
    const today = parseDateStr(todayStr, todayStr);
    if (view === 'week') {
      push({ date: toDateStr(getWeekStart(today, weekStartsOn)) });
    } else {
      push({ date: toDateStr(today) });
    }
  }

  function switchView(next: ViewMode) {
    if (next === view) return;

    const today = parseDateStr(todayStr, todayStr);
    const current = parseDateStr(dateParam, todayStr);

    if (next === 'week') {
      // Going day → week: focus the week that contains the current day.
      push({ view: 'week', date: toDateStr(getWeekStart(current, weekStartsOn)) });
      return;
    }

    // Going week → day: pick a sensible day inside the visible week instead
    // of always landing on the first day (which was the source of the "data
    // disappears" confusion). Prefer today when it falls inside the week.
    const targetDay = isSameWeek(today, current, weekStartsOn) ? today : current;
    push({ view: 'day', date: toDateStr(targetDay) });
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 transition-opacity ${
        isPending ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* View toggle */}
      <div className="flex rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => switchView('day')}
          className={[
            'px-3 py-1.5 text-sm font-medium rounded-l-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40',
            view === 'day'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800',
          ].join(' ')}
        >
          Día
        </button>
        <button
          type="button"
          onClick={() => switchView('week')}
          className={[
            'px-3 py-1.5 text-sm font-medium rounded-r-lg transition-colors duration-150 border-l border-zinc-200 dark:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40',
            view === 'week'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800',
          ].join(' ')}
        >
          Semana
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" onClick={() => navigate(-1)} aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToday}>
          Hoy
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => navigate(1)} aria-label="Siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Doctor filter (only shown when there's more than 1 doctor) */}
      {doctors.length > 1 && (
        <select
          value={selectedDoctorId}
          onChange={(e) => push({ doctor: e.target.value || undefined })}
          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-700 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <option value="">Todos los médicos</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
