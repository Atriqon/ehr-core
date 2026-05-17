import { notFound, redirect } from 'next/navigation';
import { Upload } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { CsvImporter } from '@/components/settings/csv-importer';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { settingsTrail } from '@/lib/breadcrumbs';

export default async function ImportarPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') notFound();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Breadcrumbs items={settingsTrail({ label: 'Importar' })} />

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30">
          <Upload className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Importar pacientes
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Carga masiva desde archivo CSV
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
          <p className="font-medium text-zinc-700 dark:text-zinc-300">Formato esperado del CSV</p>
          <p className="mt-1">
            El CSV puede tener las columnas en cualquier orden. El sistema las detecta
            automáticamente por el nombre. Puedes corregir el mapeo antes de importar.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs">
            <li>
              <span className="font-medium">Requerido:</span> cédula, nombre, apellido,
              fecha_nacimiento (DD/MM/YYYY o YYYY-MM-DD), sexo (F/M)
            </li>
            <li>
              <span className="font-medium">Opcional:</span> teléfono
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <CsvImporter />
        </div>
      </div>
    </div>
  );
}
