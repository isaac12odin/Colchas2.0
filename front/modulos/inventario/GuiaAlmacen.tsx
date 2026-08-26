import Link from "next/link";
import { ClipboardCheck, PackagePlus, Scale } from "lucide-react";

export function GuiaAlmacen({ es }: { es: boolean }) {
  return (
    <section className="panel mb-5 grid gap-3 p-4 md:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
        <PackagePlus className="text-blue-600" size={22} />
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
        className="rounded-xl border border-blue-200 bg-blue-50 p-4 transition hover:border-blue-500 dark:border-blue-900 dark:bg-blue-950/30"
      >
        <ClipboardCheck className="text-blue-600" size={22} />
        <strong className="mt-2 block text-sm">
          {es ? "Llegó mercancía" : "Goods arrived"}
        </strong>
        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
          {es
            ? "Registra la compra para sumar existencias, costo y proveedor."
            : "Record the purchase to add stock, cost, and supplier."}
        </p>
      </Link>
      <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
        <Scale className="text-amber-600" size={22} />
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
  );
}
