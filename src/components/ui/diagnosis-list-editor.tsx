'use client';

import { Trash2 } from 'lucide-react';
import { Cie10Combobox } from '@/components/ui/cie10-combobox';
import type { DiagnosisEntry } from '@/lib/validators/clinical-note';

interface DiagnosisListEditorProps {
  diagnoses: DiagnosisEntry[];
  onChange: (diagnoses: DiagnosisEntry[]) => void;
  disabled?: boolean;
  maxItems?: number;
}

export function DiagnosisListEditor({
  diagnoses,
  onChange,
  disabled,
  maxItems = 5,
}: DiagnosisListEditorProps) {
  function add(entry: DiagnosisEntry) {
    if (diagnoses.length >= maxItems) return;
    onChange([...diagnoses, entry]);
  }

  function remove(idx: number) {
    onChange(diagnoses.filter((_, i) => i !== idx));
  }

  function updateText(idx: number, text: string) {
    onChange(diagnoses.map((d, i) => (i === idx ? { ...d, text } : d)));
  }

  return (
    <div className="space-y-2">
      {diagnoses.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          {d.code && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2.5 py-0.5 font-mono text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {d.code}
            </span>
          )}
          <input
            type="text"
            value={d.text}
            onChange={(e) => updateText(i, e.target.value)}
            disabled={disabled}
            aria-label={`Diagnóstico ${i + 1}`}
            className="flex h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-teal-600"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={disabled}
            aria-label="Eliminar diagnóstico"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:hover:bg-red-950/20 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {diagnoses.length < maxItems && (
        <Cie10Combobox onSelect={add} disabled={disabled} />
      )}

      {diagnoses.length === 0 && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Busca un código CIE-10 o escribe el diagnóstico en texto libre y presiona Enter.
        </p>
      )}
    </div>
  );
}
