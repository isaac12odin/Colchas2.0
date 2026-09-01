import { ChevronDown, ClipboardCheck, PackagePlus, Scale } from "lucide-react";
import Link from "next/link";

export function GuiaAlmacen({ es }: { es: boolean }) {
  return (
    <details className="group panel mb-5">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
        <span>
          {es ? "Guía rápida de inventario" : "Inventory quick guide"}
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
          {es ? "Ver qué acción usar" : "Choose an action"}
          <ChevronDown
            className="transition group-open:rotate-180"
            size={17}
            aria-hidden="true"
          />
        </span>
      </summary>
      <section className="grid gap-2 border-t p-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
          <PackagePlus className="text-blue-600" size={20} />
          <strong className="mt-2 block text-sm">
            {es ? "Producto que no existe" : "Missing product"}
          </strong>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {es
              ? "Usa Nuevo producto para definir tipo, marca, SKU y precios."
              : "Create its type, brand, SKU, and prices."}
          </p>
        </div>
        <Link
          href="/compras?accion=nueva"
          className="rounded-xl border border-blue-200 bg-blue-50 p-3 transition hover:border-blue-500 dark:border-blue-900 dark:bg-blue-950/30"
        >
          <ClipboardCheck className="text-blue-600" size={20} />
          <strong className="mt-2 block text-sm">
            {es ? "Llegó mercancía" : "Goods arrived"}
          </strong>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            {es
              ? "Registra la compra para sumar existencias, costo y proveedor."
              : "Record the purchase to add stock, cost, and supplier."}
          </p>
        </Link>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
          <Scale className="text-amber-600" size={20} />
          <strong className="mt-2 block text-sm">
            {es ? "El conteo no coincide" : "Count mismatch"}
          </strong>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {es
              ? "Usa Ajustar en la tarjeta y escribe el motivo; no inventes una compra."
              : "Use Adjust on the product and record the reason."}
          </p>
        </div>
      </section>
    </details>
  );
}
