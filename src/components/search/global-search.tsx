'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { SearchDialog } from '@/components/search/search-dialog';

// Header trigger + Ctrl/Cmd+K shortcut for the global search command palette.
//
// Only Ctrl+K / Cmd+K is bound here. Ctrl+N / Ctrl+Shift+N are intentionally
// NOT implemented — they collide with browser "new window / incognito"
// shortcuts (see Phase 11 §2).
export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-sm text-zinc-500 transition-colors duration-150 hover:border-zinc-300 hover:bg-white hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 sm:w-64 sm:px-3"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Buscar pacientes…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-zinc-200 bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-400 sm:inline-flex">
          ⌘K
        </kbd>
      </button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
