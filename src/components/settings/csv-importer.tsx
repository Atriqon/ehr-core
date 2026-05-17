'use client';

import { useState, useRef, useTransition } from 'react';
import Papa from 'papaparse';
import { Upload, AlertCircle, CheckCircle2, Loader2, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importPatients, type CsvImportRow, type ImportResult } from '@/actions/import-patients';

// ─── Column mapping ───────────────────────────────────────────────────────────

type TargetField =
  | 'id_number'
  | 'first_name'
  | 'last_name'
  | 'date_of_birth'
  | 'sex'
  | 'phone'
  | 'skip';

const FIELD_LABELS: Record<TargetField, string> = {
  id_number: 'Cédula / ID',
  first_name: 'Nombre',
  last_name: 'Apellido',
  date_of_birth: 'Fecha de nacimiento',
  sex: 'Sexo',
  phone: 'Teléfono',
  skip: '— Ignorar columna —',
};

const REQUIRED_FIELDS: TargetField[] = ['id_number', 'first_name', 'last_name', 'date_of_birth', 'sex'];

function autoDetect(headers: string[]): Record<string, TargetField> {
  const mapping: Record<string, TargetField> = {};
  const patterns: [TargetField, RegExp][] = [
    ['id_number', /c[eé]dul|id_?number|documento|nro/i],
    ['first_name', /nombre|first_?name|name/i],
    ['last_name', /apellido|last_?name|surname/i],
    ['date_of_birth', /fecha|birth|nacimiento|dob/i],
    ['sex', /sex[o]?|g[eé]nero|gender/i],
    ['phone', /tel[eé]f?|phone|celular|m[oó]vil/i],
  ];

  const assigned = new Set<TargetField>();

  for (const header of headers) {
    let matched: TargetField = 'skip';
    for (const [field, re] of patterns) {
      if (!assigned.has(field) && re.test(header)) {
        matched = field;
        assigned.add(field);
        break;
      }
    }
    mapping[header] = matched;
  }

  return mapping;
}

// ─── Sex normalizer ───────────────────────────────────────────────────────────

function normalizeSex(value: string): 'F' | 'M' | 'other' {
  const v = value.trim().toUpperCase();
  if (v === 'F' || v === 'FEMENINO' || v === 'FEMALE') return 'F';
  if (v === 'M' || v === 'MASCULINO' || v === 'MALE') return 'M';
  return 'other';
}

// ─── Date normalizer ─────────────────────────────────────────────────────────

function normalizeDate(value: string): string {
  // Try common date formats and normalize to YYYY-MM-DD
  const trimmed = value.trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // MM/DD/YYYY
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return trimmed;
}

// ─── Client-side validation ───────────────────────────────────────────────────

interface RowValidation {
  rowIndex: number;
  errors: string[];
}

function validateRows(
  rows: Record<string, string>[],
  mapping: Record<string, TargetField>,
): RowValidation[] {
  const issues: RowValidation[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    const mapped: Record<TargetField, string> = {} as Record<TargetField, string>;
    for (const [header, field] of Object.entries(mapping)) {
      if (field !== 'skip') {
        mapped[field] = (row[header] ?? '').trim();
      }
    }

    for (const req of REQUIRED_FIELDS) {
      if (!mapped[req]) {
        errors.push(`${FIELD_LABELS[req]} requerido`);
      }
    }

    if (mapped.date_of_birth) {
      const normalized = normalizeDate(mapped.date_of_birth);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        errors.push('Fecha de nacimiento inválida (usar DD/MM/YYYY o YYYY-MM-DD)');
      }
    }

    if (errors.length > 0) {
      issues.push({ rowIndex: i, errors });
    }
  }

  return issues;
}

function buildImportRows(
  rows: Record<string, string>[],
  mapping: Record<string, TargetField>,
): CsvImportRow[] {
  return rows.map((row) => {
    const mapped: Record<TargetField, string> = {} as Record<TargetField, string>;
    for (const [header, field] of Object.entries(mapping)) {
      if (field !== 'skip') {
        mapped[field] = (row[header] ?? '').trim();
      }
    }
    return {
      id_number: mapped.id_number ?? '',
      id_type: 'cedula',
      first_name: mapped.first_name ?? '',
      last_name: mapped.last_name ?? '',
      date_of_birth: normalizeDate(mapped.date_of_birth ?? ''),
      sex: normalizeSex(mapped.sex ?? ''),
      phone: mapped.phone || undefined,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'confirm' | 'result';

export function CsvImporter() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, TargetField>>({});
  const [clientErrors, setClientErrors] = useState<RowValidation[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const hdrs = parsed.meta.fields ?? [];
        const rows = parsed.data;
        setHeaders(hdrs);
        setAllRows(rows);
        setMapping(autoDetect(hdrs));
        setStep('map');
      },
    });
  }

  function handleConfirm() {
    const issues = validateRows(allRows, mapping);
    setClientErrors(issues);
    if (issues.length === 0) {
      setStep('confirm');
    }
  }

  function handleImport() {
    const rows = buildImportRows(allRows, mapping);
    startTransition(async () => {
      const res = await importPatients(rows);
      setResult(res);
      setStep('result');
    });
  }

  function reset() {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setAllRows([]);
    setMapping({});
    setClientErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const previewRows = allRows.slice(0, 10);
  const validRows = allRows.length - clientErrors.length;

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center transition-colors hover:border-teal-400 hover:bg-teal-50/40 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-teal-500"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
              setFileName(file.name);
              Papa.parse<Record<string, string>>(file, {
                header: true,
                skipEmptyLines: true,
                complete: (parsed) => {
                  const hdrs = parsed.meta.fields ?? [];
                  setHeaders(hdrs);
                  setAllRows(parsed.data);
                  setMapping(autoDetect(hdrs));
                  setStep('map');
                },
              });
            }
          }}
        >
          <Upload className="mb-3 h-10 w-10 text-zinc-400 dark:text-zinc-500" />
          <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
            Arrastra un CSV o haz clic para seleccionar
          </p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Columnas esperadas: cédula, nombre, apellido, fecha_nacimiento, sexo, teléfono
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <FileText className="h-4 w-4 text-teal-600" />
            <span className="font-medium">{fileName}</span>
            <span className="text-zinc-400">·</span>
            <span>{allRows.length} filas</span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
            >
              <X className="h-3.5 w-3.5" />
              Cambiar archivo
            </button>
          </div>

          {/* Column mapping */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Mapeo de columnas
            </h3>
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">
                      Columna CSV
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">
                      Campo del sistema
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {headers.map((header) => (
                    <tr key={header}>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {header}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={mapping[header] ?? 'skip'}
                          onChange={(e) =>
                            setMapping((prev) => ({
                              ...prev,
                              [header]: e.target.value as TargetField,
                            }))
                          }
                          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs focus:border-teal-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          {(Object.entries(FIELD_LABELS) as [TargetField, string][]).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Vista previa (primeras {previewRows.length} filas)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2 text-left font-medium text-zinc-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      {headers.map((h) => (
                        <td key={h} className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                          {row[h] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation errors */}
          {clientErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                {clientErrors.length} fila{clientErrors.length !== 1 ? 's' : ''} con errores
              </div>
              <ul className="space-y-1">
                {clientErrors.slice(0, 10).map(({ rowIndex, errors }) => (
                  <li key={rowIndex} className="text-xs text-red-600 dark:text-red-400">
                    <span className="font-medium">Fila {rowIndex + 1}:</span>{' '}
                    {errors.join(', ')}
                  </li>
                ))}
                {clientErrors.length > 10 && (
                  <li className="text-xs text-red-500">y {clientErrors.length - 10} más…</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Validar e importar</Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {allRows.length}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              pacientes listos para importar
            </p>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ¿Confirmas la importación de{' '}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{allRows.length} pacientes</span>?
            Los duplicados (por cédula) serán reportados como errores.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('map')} disabled={isPending}>
              Atrás
            </Button>
            <Button onClick={handleImport} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar importación
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && result && (
        <div className="space-y-5">
          {result.imported > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  {result.imported} paciente{result.imported !== 1 ? 's' : ''} importado
                  {result.imported !== 1 ? 's' : ''} correctamente
                </p>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                {result.errors.length} error{result.errors.length !== 1 ? 'es' : ''}
              </div>
              <ul className="space-y-1.5">
                {result.errors.map(({ row, message }) => (
                  <li key={row} className="text-xs text-red-600 dark:text-red-400">
                    <span className="font-medium">Fila {row}:</span> {message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.imported === 0 && result.errors.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-sm text-zinc-500">No se procesó ningún paciente</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={reset}>Importar otro archivo</Button>
          </div>
        </div>
      )}
    </div>
  );
}
