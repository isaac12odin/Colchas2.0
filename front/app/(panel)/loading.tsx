export default function CargandoPanel() {
  return (
    <div
      className="mx-auto w-full max-w-7xl p-4 sm:p-6"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Cargando pantalla…</span>
      <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, indice) => (
          <div
            key={indice}
            className="h-28 animate-pulse rounded-xl border bg-white dark:bg-slate-900"
          />
        ))}
      </div>
      <div className="mt-5 h-80 animate-pulse rounded-xl border bg-white dark:bg-slate-900" />
    </div>
  );
}
