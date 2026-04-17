export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Bienvenido a ClinicaMVP
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Pacientes activos', value: '—' },
          { label: 'Citas hoy', value: '—' },
          { label: 'En espera', value: '—' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
