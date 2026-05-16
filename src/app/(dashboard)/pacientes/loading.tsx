import { Skeleton } from '@/components/ui/skeleton';

// Route-level loading boundary for the patient list. Mirrors the page layout
// (header + search bar + table) so the transition does not shift content.
export default function PacientesLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>

      <Skeleton className="mb-4 h-9 w-full max-w-sm" />

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <Skeleton className="h-11 w-full rounded-none" />
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
