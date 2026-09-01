import type { Page, Route } from "@playwright/test";

export type RolBuscador = "ADMINISTRADOR" | "CONTABLE" | "VENDEDOR";

export const clienteBuscador = {
  id: "cliente-buscador-001",
  nombreCompleto: "María Reforma",
  telefono: "2225550199",
  direccion: "Avenida Reforma 10",
  numeroTarjeta: "0042",
  localidad: { id: "localidad-centro", nombre: "Centro", estado: "Puebla" },
  limiteCredito: "5000",
  notas: null,
  saldo: {
    saldoActual: "850",
    vencidoActual: "0",
    totalCargos: "1200",
    totalAbonos: "350",
  },
  acuerdoPago: null,
  estadoCuenta: {
    saldoTotal: 850,
    abonoPeriodico: 200,
    vencido: 0,
    venceHoy: 0,
    cobrarHoy: 0,
    proximoVencimiento: null,
    cuotasVencidas: 0,
    retardosHistoricos: 0,
    diasRetardoActual: 0,
    diasRetardoMaximo: 0,
    vencimientos: [],
  },
  evaluacionesRiesgo: [],
  ventas: [],
  abonos: [],
  pedidos: [],
  movimientosSaldo: [],
};

export const productoBuscador = {
  id: "producto-buscador-001",
  nombre: "Colcha Viena Azul",
  marca: "Vektra Hogar",
  sku: "COL-VIE-AZ-01",
  existencia: 7,
  existenciaMinima: 2,
  precioVenta: "1200",
  precioCompra: "650",
  activo: true,
  codigoBarras: "7501234567890",
  codigoQr: null,
  categoria: null,
  imagenUrl: null,
  imagenMiniaturaUrl: null,
};

export interface EstadoBuscadorMock {
  consultasClientes: string[];
  consultasProductos: string[];
}

const resumenVacio = {
  periodo: { tipo: "MES", desde: "2026-09-01", hasta: "2026-09-30" },
  ventas: {
    total: 0,
    bruto: 0,
    devoluciones: 0,
    operaciones: 0,
    operacionesDevueltas: 0,
  },
  abonos: { total: 0, operaciones: 0 },
  compras: { total: 0, operaciones: 0 },
  cartera: { saldo: 850, vencido: 0 },
  operacion: {
    clientesActivos: 1,
    pedidosPendientes: 0,
    productosBajoMinimo: 0,
    valorInventarioCosto: 4550,
  },
};

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

function pagina(datos: unknown[], limite: number) {
  return {
    datos,
    paginacion: {
      pagina: 1,
      limite,
      total: datos.length,
      totalPaginas: datos.length ? 1 : 0,
    },
  };
}

export async function prepararBuscadorGlobal(
  page: Page,
  rol: RolBuscador = "ADMINISTRADOR",
) {
  const estado: EstadoBuscadorMock = {
    consultasClientes: [],
    consultasProductos: [],
  };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const ruta = url.pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, {
        usuario: {
          id: `buscador-${rol.toLowerCase()}`,
          nombre: `${rol} Buscador`,
          correo: `${rol.toLowerCase()}-buscador@nexo.test`,
          rol,
          debeCambiarContrasena: false,
          mfaHabilitado: rol === "ADMINISTRADOR",
        },
      });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/reportes/resumen")) return json(route, resumenVacio);
    if (ruta.endsWith(`/clientes/${clienteBuscador.id}`))
      return json(route, clienteBuscador);
    if (ruta.endsWith("/clientes")) {
      const consulta = url.searchParams.get("buscar") ?? "";
      estado.consultasClientes.push(consulta);
      const coincide = [
        clienteBuscador.nombreCompleto,
        clienteBuscador.telefono,
        clienteBuscador.numeroTarjeta,
        clienteBuscador.direccion,
      ].some((valor) =>
        valor
          ?.toLocaleLowerCase("es")
          .includes(consulta.toLocaleLowerCase("es")),
      );
      return json(route, pagina(coincide ? [clienteBuscador] : [], 6));
    }
    if (ruta.endsWith("/localidades"))
      return json(route, { datos: [clienteBuscador.localidad] });
    if (ruta.endsWith("/inventario/catalogos-producto"))
      return json(route, { marcas: [], categorias: [] });
    if (ruta.endsWith("/inventario/productos")) {
      const consulta = url.searchParams.get("buscar") ?? "";
      estado.consultasProductos.push(consulta);
      const coincide = [
        productoBuscador.nombre,
        productoBuscador.marca,
        productoBuscador.sku,
        productoBuscador.codigoBarras,
      ].some((valor) =>
        valor
          ?.toLocaleLowerCase("es")
          .includes(consulta.toLocaleLowerCase("es")),
      );
      return json(
        route,
        pagina(
          coincide || consulta.length === 0 ? [productoBuscador] : [],
          Number(url.searchParams.get("limite") ?? 6),
        ),
      );
    }
    return json(
      route,
      { error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` } },
      404,
    );
  });
  return estado;
}
