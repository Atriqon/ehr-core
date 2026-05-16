'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@base-ui/react/dialog';
import { FileText, Loader2, Search, User } from 'lucide-react';
import {
  SEARCH_MIN_LENGTH,
  type GlobalSearchResults,
  type NoteSearchHit,
  type PatientSearchHit,
} from '@/lib/search';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 250;
const PLACEHOLDER = 'Buscar pacientes, cédulas, teléfonos o diagnósticos...';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FlatHit =
  | { kind: 'patient'; hit: PatientSearchHit }
  | { kind: 'note'; hit: NoteSearchHit };

function formatNoteDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset state whenever the dialog is (re)opened or closed.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
      setLoading(false);
      setActiveIndex(0);
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    }
  }, [open]);

  // Debounced fetch. Minimum query length is enforced before any network call.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('search failed');
        const data: GlobalSearchResults = await res.json();
        setResults(data);
        setActiveIndex(0);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setResults({ patients: [], notes: [] });
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const flatHits = useMemo<FlatHit[]>(() => {
    if (!results) return [];
    return [
      ...results.patients.map((hit) => ({ kind: 'patient' as const, hit })),
      ...results.notes.map((hit) => ({ kind: 'note' as const, hit })),
    ];
  }, [results]);

  const navigate = useCallback(
    (item: FlatHit) => {
      onOpenChange(false);
      if (item.kind === 'patient') {
        router.push(`/pacientes/${item.hit.id}`);
      } else {
        router.push(`/pacientes/${item.hit.patientId}/notas/${item.hit.id}`);
      }
    },
    [onOpenChange, router],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (flatHits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatHits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatHits.length) % flatHits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatHits[activeIndex];
      if (item) navigate(item);
    }
  }

  const trimmed = query.trim();
  const showMinHint = trimmed.length > 0 && trimmed.length < SEARCH_MIN_LENGTH;
  const showEmpty =
    !loading &&
    !showMinHint &&
    results !== null &&
    flatHits.length === 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup
          className={cn(
            'fixed left-1/2 top-[12vh] z-50 flex w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 flex-col',
            'overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl outline-none',
            'transition duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0',
            'data-ending-style:scale-95 data-starting-style:scale-95',
            'dark:border-zinc-700 dark:bg-zinc-900',
          )}
        >
          <Dialog.Title className="sr-only">Búsqueda global</Dialog.Title>

          {/* Search input */}
          <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 dark:border-zinc-800">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            )}
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDER}
              aria-label="Buscar"
              className="h-12 w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          {/* Results */}
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {showMinHint && (
              <p className="px-3 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                Escribe al menos {SEARCH_MIN_LENGTH} caracteres para buscar.
              </p>
            )}

            {loading && !results && (
              <div className="space-y-1.5 p-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
                  />
                ))}
              </div>
            )}

            {showEmpty && (
              <p className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No se encontraron resultados.
              </p>
            )}

            {results && results.patients.length > 0 && (
              <ResultGroup label={`Pacientes (${results.patients.length})`}>
                {results.patients.map((hit) => {
                  const index = flatHits.findIndex(
                    (f) => f.kind === 'patient' && f.hit.id === hit.id,
                  );
                  return (
                    <ResultRow
                      key={hit.id}
                      active={index === activeIndex}
                      onSelect={() => navigate({ kind: 'patient', hit })}
                      onHover={() => setActiveIndex(index)}
                      icon={<User className="h-4 w-4 text-zinc-400" />}
                      title={`${hit.firstName} ${hit.lastName}`}
                      subtitle={[hit.idNumber, hit.phone].filter(Boolean).join(' · ')}
                    />
                  );
                })}
              </ResultGroup>
            )}

            {results && results.notes.length > 0 && (
              <ResultGroup label={`Notas clínicas (${results.notes.length})`}>
                {results.notes.map((hit) => {
                  const index = flatHits.findIndex(
                    (f) => f.kind === 'note' && f.hit.id === hit.id,
                  );
                  return (
                    <ResultRow
                      key={hit.id}
                      active={index === activeIndex}
                      onSelect={() => navigate({ kind: 'note', hit })}
                      onHover={() => setActiveIndex(index)}
                      icon={<FileText className="h-4 w-4 text-zinc-400" />}
                      title={hit.snippet}
                      subtitle={`${hit.patientName} · ${formatNoteDate(hit.noteDate)}`}
                    />
                  );
                })}
              </ResultGroup>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ResultGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function ResultRow({
  active,
  onSelect,
  onHover,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
        active
          ? 'bg-blue-50 dark:bg-blue-950/40'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
}
