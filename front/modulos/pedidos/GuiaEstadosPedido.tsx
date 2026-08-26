export function GuiaEstadosPedido({ es }: { es: boolean }) {
  const etapas = es
    ? [
        {
          titulo: "1. Pedido",
          texto:
            "Documenta lo solicitado; no reserva inventario ni genera deuda.",
        },
        {
          titulo: "2. Compra y almacén",
          texto:
            "La compra suma existencias; recibir y preparar sólo cambian el estado.",
        },
        {
          titulo: "3. Entrega",
          texto: "Crea la venta, descuenta inventario y registra pago o saldo.",
        },
      ]
    : [
        { titulo: "1. Order", texto: "Records the request only." },
        { titulo: "2. Purchase", texto: "Purchases add stock." },
        { titulo: "3. Delivery", texto: "Creates the sale and balance." },
      ];
  return (
    <section className="panel mb-5 grid gap-2 p-3 sm:grid-cols-3">
      {etapas.map((etapa, indice) => (
        <div
          key={etapa.titulo}
          className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"
        >
          <strong
            className={
              indice === 2
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-blue-700 dark:text-blue-300"
            }
          >
            {etapa.titulo}
          </strong>
          <p className="mt-1 text-xs leading-5 text-slate-500">{etapa.texto}</p>
        </div>
      ))}
    </section>
  );
}
