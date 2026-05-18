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
        className="glass-input inline-flex h-9.5 flex-1 items-center gap-2 rounded-full px-3.5 text-[13.5px] text-zinc-400 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 sm:max-w-120"
      >
        <Search className="h-3.75 w-3.75 shrink-0" />
        <span className="hidden sm:inline">
          Buscar paciente, nota o documento…
        </span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded-full border border-zinc-200 bg-white/70 px-1.5 font-mono text-[10px] font-medium text-zinc-400 sm:inline-flex">
          ⌘K
        </kbd>
      </button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
