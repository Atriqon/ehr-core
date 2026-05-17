'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import cie10Data from '@/lib/data/cie10.json';
import type { DiagnosisEntry } from '@/lib/validators/clinical-note';

interface Cie10Entry {
  code: string;
  description: string;
}

const CIE10: Cie10Entry[] = cie10Data as Cie10Entry[];

function filterCie10(query: string): Cie10Entry[] {
  const raw = query.trim();
  if (raw.length < 2) return [];
  const up = raw.toUpperCase();
  return CIE10.filter(
    (e) => e.code.toUpperCase().startsWith(up) || e.description.toUpperCase().includes(up),
  ).slice(0, 8);
}

interface Cie10ComboboxProps {
  onSelect: (entry: DiagnosisEntry) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Cie10Combobox({ onSelect, placeholder, disabled }: Cie10ComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Cie10Entry[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const found = filterCie10(query);
      setResults(found);
      setOpen(found.length > 0 || query.trim().length >= 2);
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function handleSelect(entry: Cie10Entry) {
    onSelect({ code: entry.code, text: entry.description });
    setQuery('');
    setOpen(false);
  }

  function handleAddFreeText() {
    const text = query.trim();
    if (!text) return;
    onSelect({ text });
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    if (e.key === 'Enter' && results.length === 0 && query.trim().length >= 2) {
      e.preventDefault();
      handleAddFreeText();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Buscar código o diagnóstico (ej: N76, vaginitis)…'}
          disabled={disabled}
          className={[
            'flex h-9 w-full rounded-lg border bg-white pl-8 pr-8 text-sm shadow-sm outline-none transition-colors',
            'placeholder:text-zinc-400 focus:ring-2',
            'dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'border-zinc-200 focus:border-teal-600 focus:ring-teal-600/20 dark:border-zinc-700 dark:focus:border-teal-600',
          ].join(' ')}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {results.map((entry) => (
              <li key={entry.code}>
                <button
                  type="button"
                  role="option"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(entry); }}
                  className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span className="shrink-0 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {entry.code}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">{entry.description}</span>
                </button>
              </li>
            ))}
            {query.trim().length >= 2 && (
              <li className="border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleAddFreeText(); }}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <span>Agregar texto libre:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    &ldquo;{query.trim()}&rdquo;
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
