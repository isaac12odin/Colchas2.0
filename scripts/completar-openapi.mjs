import { readFile, writeFile } from "node:fs/promises";

import { parse, stringify } from "yaml";

const ruta = new URL("../openapi.yaml", import.meta.url);
const documento = parse(await readFile(ruta, "utf8"));
const metodos = new Set(["get", "post", "put", "patch", "delete"]);
const descripciones = {
  Autenticación: "Inicio, renovación, cierre, contraseña y MFA.",
  Usuarios: "Administración de cuentas, roles y credenciales.",
  Clientes: "Directorio, expediente, saldo y cartera.",
  Localidades: "Catálogo territorial para clientes y rutas.",
  Rutas: "Planeación y ejecución de cobranza por localidad.",
  Ventas: "Ventas de contado, crédito y público general.",
  Abonos: "Cobros, aplicación a cuotas y anulaciones auditadas.",
  Inventario: "Productos, fotografías, existencias y movimientos.",
  Compras: "Entradas de mercancía y facturas de proveedor.",
  Proveedores: "Directorio completo y opciones minimizadas por rol.",
  Pedidos: "Solicitud, surtido, almacén y entrega al cliente.",
  Devoluciones: "Devolución, evidencia, autorización y reembolso.",
  Cortes: "Previsualización y cierre firmado de caja.",
  Sincronización: "Bitácora offline, dispositivos, lotes y revisiones.",
  Reportes: "Balances, Excel y documentos operativos.",
  Alertas: "Señales empresariales que requieren atención.",
  Auditoría: "Historial inmutable de acciones sensibles.",
  Importaciones: "Carga transaccional inicial mediante Excel.",
  Reconciliación: "Comparación de libros contra proyecciones.",
};

documento.info.license = {
  name: "Propietaria; consulte LICENSE.md",
  identifier: "LicenseRef-Nexo-Proprietary",
};
for (const etiqueta of documento.tags ?? [])
  etiqueta.description =
    descripciones[etiqueta.name] ?? `Operaciones de ${etiqueta.name}.`;

function nombreOperacion(metodo, rutaOperacion) {
  const partes = rutaOperacion
    .split("/")
    .filter(Boolean)
    .map((parte) => parte.replace(/[{}_-]+/g, " "))
    .flatMap((parte) => parte.split(/\s+/))
    .filter(Boolean)
    .map((parte) => `${parte[0].toUpperCase()}${parte.slice(1)}`);
  return `${metodo}${partes.join("")}`;
}

for (const [rutaOperacion, entrada] of Object.entries(documento.paths ?? {})) {
  for (const [metodo, operacion] of Object.entries(entrada ?? {})) {
    if (!metodos.has(metodo) || !operacion) continue;
    operacion.operationId = nombreOperacion(metodo, rutaOperacion);
    const tieneCuatroX = Object.keys(operacion.responses ?? {}).some((estado) =>
      /^4(?:\d{2}|XX)$/.test(estado),
    );
    if (!tieneCuatroX)
      operacion.responses["4XX"] = {
        $ref: "#/components/responses/Error",
      };
  }
}

await writeFile(
  ruta,
  stringify(documento, {
    lineWidth: 100,
    minContentWidth: 20,
  }),
);
