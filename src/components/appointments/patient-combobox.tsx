'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { searchPatients, type PatientSearchResult } from '@/actions/search-patients';

interface PatientComboboxProps {
  name: string;
  defaultValue?: string;
  defaultLabel?: string;
  error?: string;
}

export function PatientCombobox({ name, defaultValue, defaultLabel, error }: PatientComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [selected, setSelected] = useState<PatientSearchResult | null>(
    defaultValue && defaultLabel
      ? { id: defaultValue, firstName: defaultLabel, lastName: '', idNumber: '', phone: null }
      : null,
  );
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        const r = await searchPatients(query);
        setResults(r);
        setOpen(true);
      });
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  function handleSelect(p: PatientSearchResult) {
    setSelected(p);
    setQuery('');
    setOpen(false);
    setResults([]);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ''} />

      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {selected.firstName[0]}
              {selected.lastName[0]}
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {selected.firstName} {selected.lastName}
              </p>
              {selected.idNumber && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">C.I. {selected.idNumber}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Buscar por nombre o cédula…"
              autoComplete="off"
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
            />
            {isPending && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                Buscando…
              </span>
            )}
          </div>

          {open && results.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 right-0 top-10 z-20 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    onClick={() => handleSelect(p)}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {p.firstName[0]}
                      {p.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">C.I. {p.idNumber}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {open && query.trim() && results.length === 0 && !isPending && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 right-0 top-10 z-20 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-500 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                No se encontraron pacientes para &ldquo;{query}&rdquo;
              </div>
            </>
          )}
        </>
      )}

      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
