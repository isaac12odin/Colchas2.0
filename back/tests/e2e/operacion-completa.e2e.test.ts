import { randomUUID } from "node:crypto";

import ExcelJS from "exceljs";
import { DiaSemana, MetodoPago, RolUsuario } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { fechaMexicoISO } from "../../src/compartido/fechas.js";
import { prisma } from "../../src/infraestructura/prisma.js";
import type { OperacionSincronizacion } from "../../src/modulos/sincronizacion/esquemas.js";
import {
  calcularHashOperacion,
  calcularHuellaLote,
} from "../../src/modulos/sincronizacion/integridad.js";
import {
  asegurarBaseDePruebas,
  cabeceras,
  EscenarioPrueba,
} from "./escenario.js";

const pngUnPixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

beforeAll(async () => {
  asegurarBaseDePruebas();
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe.sequential("suite robusta con datos automáticos", () => {
  it("aplica permisos por rol, oculta costos y permite búsquedas humanas", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const [admin, almacenista, vendedor, cobrador] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.ALMACENISTA),
        escenario.crearUsuario(RolUsuario.VENDEDOR),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);

      const localidad = await request(app)
        .post("/api/v1/localidades")
        .set(cabeceras(admin.token))
        .send({
          nombre: `Localidad API ${escenario.marca}`,
          estado: "Puebla",
        })
        .expect(201);
      escenario.registrarLocalidad(localidad.body.id);

      await request(app)
        .post("/api/v1/localidades")
        .set(cabeceras(almacenista.token))
        .send({ nombre: "No autorizada", estado: "Puebla" })
        .expect(403);

      const producto = await request(app)
        .post("/api/v1/inventario/productos")
        .set(cabeceras(almacenista.token))
        .send({
          sku: `API-${escenario.marca}`,
          nombre: `Producto por API ${escenario.marca}`,
          marca: "Nexo Test",
          categoria: "Automatizada",
          codigoBarras: `790${escenario.marca}`,
          existenciaInicial: 5,
          existenciaMinima: 2,
          precioCompra: 120,
          precioVenta: 250,
        })
        .expect(201);
      escenario.registrarProducto(producto.body.id);

      await request(app)
        .post("/api/v1/inventario/productos")
        .set(cabeceras(cobrador.token))
        .send({
          sku: `PROHIBIDO-${escenario.marca}`,
          nombre: "Producto prohibido",
          marca: "Nexo",
          precioCompra: 1,
          precioVenta: 2,
        })
        .expect(403);

      const telefono = `222${[...escenario.marca]
        .map((caracter) => (Number.parseInt(caracter, 16) % 10).toString())
        .join("")
        .slice(0, 7)}`;
      const cliente = await request(app)
        .post("/api/v1/clientes")
        .set(cabeceras(vendedor.token))
        .send({
          nombreCompleto: `María Automatizada ${escenario.marca}`,
          telefono,
          direccion: `Avenida Búsqueda número 10 ${escenario.marca}`,
          localidadId: localidad.body.id,
          limiteCredito: 10_000,
        })
        .expect(201);
      escenario.registrarCliente(cliente.body.id);

      const tarjetaSinSaldo = await request(app)
        .patch(`/api/v1/clientes/${cliente.body.id}/tarjeta`)
        .set(cabeceras(vendedor.token))
        .send({ numeroTarjeta: `T-${escenario.marca}` })
        .expect(422);
      expect(tarjetaSinSaldo.body.error.codigo).toBe("TARJETA_SIN_SALDO");

      for (const buscar of [
        "María Automatizada",
        telefono,
        `Avenida Búsqueda número 10 ${escenario.marca}`,
      ]) {
        const busqueda = await request(app)
          .get(`/api/v1/clientes?buscar=${encodeURIComponent(buscar)}`)
          .set(cabeceras(vendedor.token))
          .expect(200);
        expect(
          busqueda.body.datos.some(
            (item: { id: string }) => item.id === cliente.body.id,
          ),
          `No se encontró al cliente con el término: ${buscar}`,
        ).toBe(true);
      }

      const catalogoCobrador = await request(app)
        .get(`/api/v1/inventario/productos?buscar=${escenario.marca}`)
        .set(cabeceras(cobrador.token))
        .expect(200);
      const visible = catalogoCobrador.body.datos.find(
        (item: { id: string }) => item.id === producto.body.id,
      );
      expect(visible).toBeTruthy();
      expect(visible).not.toHaveProperty("precioCompra");

      await request(app)
        .get("/api/v1/inventario/movimientos")
        .set(cabeceras(vendedor.token))
        .expect(403);
    } finally {
      await escenario.limpiar();
    }
  });

  it("recorre crédito, tarjeta, abono idempotente, anulación y expediente", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const [admin, contable, cobrador] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      await escenario.crearRuta(
        [localidad.id],
        [cliente.id],
        DiaSemana.LUNES,
        cobrador.id,
      );
      const producto = await escenario.crearProducto({
        existencia: 10,
        precio: 400,
      });
      const tarjeta = `CRED-${escenario.marca}`;
      const primerVencimiento = new Date(Date.now() - 8 * 86_400_000);

      const venta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          clienteId: cliente.id,
          numeroTarjeta: tarjeta,
          tipo: "CREDITO",
          anticipo: 100,
          metodoAnticipo: MetodoPago.TRANSFERENCIA,
          items: [{ productoId: producto.id, cantidad: 2 }],
          plan: {
            periodicidad: "SEMANAL",
            montoCuota: 200,
            primerVencimiento,
          },
        })
        .expect(201);
      expect(Number(venta.body.total)).toBe(800);
      expect(venta.body.planPago.cuotas).toHaveLength(4);

      const despuesVenta = await prisma.cliente.findUniqueOrThrow({
        where: { id: cliente.id },
        include: { saldo: true },
      });
      expect(despuesVenta.numeroTarjeta).toBe(tarjeta);
      expect(Number(despuesVenta.saldo?.saldoActual)).toBe(700);
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: producto.id },
          })
        ).existencia,
      ).toBe(8);

      const idOperacionMovil = `abono-${randomUUID()}`;
      const datosAbono = {
        clienteId: cliente.id,
        ventaId: venta.body.id,
        idOperacionMovil,
        monto: 200,
        metodo: "EFECTIVO",
        fechaAbono: new Date(),
      };
      const primerAbono = await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(cobrador.token))
        .send(datosAbono)
        .expect(201);
      const reintento = await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(cobrador.token))
        .send(datosAbono)
        .expect(200);
      expect(reintento.body.id).toBe(primerAbono.body.id);
      expect(reintento.body.idempotente).toBe(true);
      expect(await prisma.abono.count({ where: { idOperacionMovil } })).toBe(1);

      await request(app)
        .post(`/api/v1/abonos/${primerAbono.body.id}/anular`)
        .set(cabeceras(contable.token))
        .send({ motivo: "Captura duplicada detectada durante la conciliación" })
        .expect(200);

      const saldoRestaurado = await prisma.saldoCliente.findUniqueOrThrow({
        where: { clienteId: cliente.id },
      });
      const abonoAnulado = await prisma.abono.findUniqueOrThrow({
        where: { id: primerAbono.body.id },
      });
      expect(Number(saldoRestaurado.saldoActual)).toBe(700);
      // El anticipo original de la venta permanece; sólo se revierte el abono de 200.
      expect(Number(saldoRestaurado.totalAbonos)).toBe(100);
      expect(abonoAnulado.anuladoEn).not.toBeNull();

      const expediente = await request(app)
        .get(`/api/v1/clientes/${cliente.id}`)
        .set(cabeceras(admin.token))
        .expect(200);
      expect(expediente.body.ventas[0].planPago.cuotas).toHaveLength(4);
      expect(expediente.body.abonos[0].motivoAnulacion).toContain("duplicada");
      expect(expediente.body.evaluacionesRiesgo).toHaveLength(1);
      expect(
        await prisma.auditoria.count({
          where: { entidad: "Abono", entidadId: primerAbono.body.id },
        }),
      ).toBeGreaterThanOrEqual(2);
    } finally {
      await escenario.limpiar();
    }
  });

  it("valida pedido, compra, proveedor, entrega, devolución y corte sellado", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const producto = await escenario.crearProducto({
        existencia: 0,
        precio: 100,
      });
      const proveedor = await escenario.crearProveedor();

      const pedido = await request(app)
        .post("/api/v1/pedidos")
        .set(cabeceras(admin.token))
        .send({
          clienteId: cliente.id,
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      const itemPedidoId = pedido.body.items[0].id as string;

      await request(app)
        .post(`/api/v1/pedidos/${pedido.body.id}/entregar`)
        .set(cabeceras(admin.token))
        .send({ tipo: "CONTADO" })
        .expect(422);

      await request(app)
        .patch(`/api/v1/pedidos/${pedido.body.id}/estado`)
        .set(cabeceras(admin.token))
        .send({ estado: "PEDIDO_PROVEEDOR" })
        .expect(200);

      const compra = await request(app)
        .post("/api/v1/compras")
        .set(cabeceras(admin.token))
        .send({
          proveedorId: proveedor.id,
          items: [
            {
              productoId: producto.id,
              cantidad: 2,
              costoUnitario: 50,
              itemPedidoId,
            },
          ],
        })
        .expect(201);
      expect(compra.body.proveedorNombre).toBe(proveedor.nombre);

      for (const estado of ["RECIBIDO_ALMACEN", "LISTO_ENTREGA"]) {
        await request(app)
          .patch(`/api/v1/pedidos/${pedido.body.id}/estado`)
          .set(cabeceras(admin.token))
          .send({ estado })
          .expect(200);
      }

      const entrega = await request(app)
        .post(`/api/v1/pedidos/${pedido.body.id}/entregar`)
        .set(cabeceras(admin.token))
        .send({
          tipo: "CONTADO",
          fechaEntrega: new Date(),
          proveedores: [{ itemPedidoId, proveedorId: proveedor.id }],
        })
        .expect(201);
      const venta = entrega.body.venta;
      expect(Number(venta.total)).toBe(100);

      const devolucion = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(admin.token))
        .send({
          ventaId: venta.id,
          tipo: "TOTAL",
          motivo: "Mercancía dañada comprobada por la prueba automatizada",
          montoReembolsado: 100,
          metodoReembolso: "EFECTIVO",
          usuarioOperadorId: admin.id,
          evidencia: {
            nombre: "evidencia-e2e.png",
            mime: "image/png",
            base64: pngUnPixel,
          },
          items: [{ detalleVentaId: venta.detalles[0].id, cantidad: 1 }],
        })
        .expect(201);
      expect(Number(devolucion.body.totalDevuelto)).toBe(100);

      const evidencia = await request(app)
        .get(`/api/v1/devoluciones/${devolucion.body.id}/evidencia`)
        .set(cabeceras(admin.token))
        .expect(200)
        .expect("Content-Type", /image\/png/);
      expect(evidencia.headers["x-content-hash"]).toMatch(/^[a-f0-9]{64}$/);

      const fecha = fechaMexicoISO(new Date());
      const previsualizacion = await request(app)
        .get(
          `/api/v1/cortes/previsualizar?usuarioOperadorId=${admin.id}&fecha=${fecha}`,
        )
        .set(cabeceras(admin.token))
        .expect(200);
      expect(previsualizacion.body.sistema.total).toBe(0);

      const corte = await request(app)
        .post("/api/v1/cortes")
        .set(cabeceras(admin.token))
        .send({
          usuarioOperadorId: admin.id,
          fecha,
          efectivo: 0,
          transferencia: 0,
          tarjeta: 0,
          otro: 0,
          firmaNombre: admin.nombre,
          confirmacion: `CERRAR ${fecha}`,
        })
        .expect(201);
      expect(corte.body.hashIntegridad).toMatch(/^[a-f0-9]{64}$/);

      const movimientoTardio = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          fechaVenta: new Date(),
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(409);
      expect(movimientoTardio.body.error.codigo).toBe("JORNADA_CERRADA");

      const [productoFinal, ventaFinal] = await Promise.all([
        prisma.producto.findUniqueOrThrow({ where: { id: producto.id } }),
        prisma.venta.findUniqueOrThrow({ where: { id: venta.id } }),
      ]);
      expect(productoFinal.existencia).toBe(2);
      expect(ventaFinal.estado).toBe("CANCELADA");
    } finally {
      await escenario.limpiar();
    }
  });

  it("sincroniza una cobranza fuera de ruta sin duplicar abono ni visita", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const cobrador = await escenario.crearUsuario(RolUsuario.COBRADOR);
      const [localidadRuta, localidadExtra] = await Promise.all([
        escenario.crearLocalidad(1),
        escenario.crearLocalidad(2),
      ]);
      const [asignado, extraordinario] = await Promise.all([
        escenario.crearCliente(localidadRuta.id, { indice: 1, saldo: 500 }),
        escenario.crearCliente(localidadExtra.id, { indice: 2, saldo: 500 }),
      ]);
      const ruta = await escenario.crearRuta(
        [localidadRuta.id],
        [asignado.id],
        DiaSemana.LUNES,
        cobrador.id,
      );
      await escenario.crearRuta(
        [localidadExtra.id],
        [extraordinario.id],
        DiaSemana.MARTES,
        cobrador.id,
      );
      const fecha = new Date();
      const idVisita = `visita-${randomUUID()}`;
      const idAbono = `abono-${randomUUID()}`;
      const dispositivoId = `telefono-${escenario.marca}`;
      const claveIntegridad = "a1".repeat(32);
      await request(app)
        .post("/api/v1/sincronizacion/dispositivos/registrar")
        .set(cabeceras(cobrador.token))
        .send({ dispositivoId, claveIntegridad })
        .expect(200);
      const operacionVisita = {
        idOperacion: idVisita,
        tipo: "VISITA" as const,
        secuencia: 1,
        hashAnterior: "GENESIS" as const,
        creadoEn: fecha,
        hashIntegridad: "0".repeat(128),
        datos: {
          rutaId: ruta.id,
          clienteId: extraordinario.id,
          fechaProgramada: fecha,
          fechaVisita: fecha,
          resultado: "PAGO" as const,
          notas: "Cobranza extraordinaria sin conexión",
        },
      } satisfies OperacionSincronizacion;
      operacionVisita.hashIntegridad = calcularHashOperacion(
        claveIntegridad,
        cobrador.id,
        operacionVisita,
      );
      const abono = {
        idOperacion: idAbono,
        tipo: "ABONO" as const,
        secuencia: 2,
        hashAnterior: operacionVisita.hashIntegridad,
        creadoEn: fecha,
        hashIntegridad: "0".repeat(128),
        visitaOperacionId: idVisita,
        datos: {
          clienteId: extraordinario.id,
          monto: 100,
          metodo: MetodoPago.EFECTIVO,
          fechaAbono: fecha,
        },
      } satisfies OperacionSincronizacion;
      abono.hashIntegridad = calcularHashOperacion(
        claveIntegridad,
        cobrador.id,
        abono,
      );
      const operaciones = [operacionVisita, abono];
      const lote = {
        idLoteCliente: `lote-${randomUUID()}`,
        dispositivoId,
        huellaIntegridad: calcularHuellaLote(claveIntegridad, operaciones),
        operaciones,
      };

      const primeraCarga = await request(app)
        .post("/api/v1/sincronizacion/lotes")
        .set(cabeceras(cobrador.token))
        .send(lote)
        .expect(201);
      expect(
        primeraCarga.body.resultados.every(
          (item: { exito: boolean }) => item.exito,
        ),
      ).toBe(true);

      const reintento = await request(app)
        .post("/api/v1/sincronizacion/lotes")
        .set(cabeceras(cobrador.token))
        // La app reconstruye el lote tras perder la respuesta, pero conserva
        // IDs, secuencias y HMAC de cada operación.
        .send({ ...lote, idLoteCliente: `reintento-${randomUUID()}` })
        .expect(201);
      expect(reintento.body.idempotente).toBe(true);

      expect(
        await prisma.visitaCobranza.count({
          where: { idOperacionMovil: idVisita },
        }),
      ).toBe(1);
      expect(
        await prisma.abono.count({ where: { idOperacionMovil: idAbono } }),
      ).toBe(1);
      const visita = await prisma.visitaCobranza.findUniqueOrThrow({
        where: { idOperacionMovil: idVisita },
      });
      expect(visita.fueraDeRuta).toBe(true);
      expect(
        Number(
          (
            await prisma.saldoCliente.findUniqueOrThrow({
              where: { clienteId: extraordinario.id },
            })
          ).saldoActual,
        ),
      ).toBe(400);

      const alterado = structuredClone(lote);
      alterado.operaciones[1]!.hashIntegridad = "b2".repeat(64);
      const manipulacion = await request(app)
        .post("/api/v1/sincronizacion/lotes")
        .set(cabeceras(cobrador.token))
        .send(alterado)
        .expect(409);
      expect(manipulacion.body.error.codigo).toBe("HUELLA_LOTE_INVALIDA");
    } finally {
      await escenario.limpiar();
    }
  });

  it("importa un Excel completo y revierte todas las filas si una es inválida", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const [admin, contable] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
      ]);
      const datos = datosImportacion(escenario.marca);
      escenario.registrarImportacionEsperada({
        localidadNombre: datos.localidad,
        localidadEstado: datos.estado,
        productoSku: datos.sku,
        clienteTarjeta: datos.tarjeta,
        rutaNombre: datos.ruta,
      });
      const archivoBase64 = await crearExcelImportacion(datos);

      await request(app)
        .post("/api/v1/importaciones/excel")
        .set(cabeceras(contable.token))
        .send({ archivoBase64 })
        .expect(403);

      const importacion = await request(app)
        .post("/api/v1/importaciones/excel")
        .set(cabeceras(admin.token))
        .send({ archivoBase64 });
      expect(importacion.status, JSON.stringify(importacion.body)).toBe(201);
      expect(importacion.body.resumen).toEqual({
        localidades: 1,
        productos: 1,
        clientes: 1,
        rutas: 1,
        asignaciones: 1,
      });

      const [localidad, producto, cliente, ruta] = await Promise.all([
        prisma.localidad.findUniqueOrThrow({
          where: {
            nombre_estado: { nombre: datos.localidad, estado: datos.estado },
          },
        }),
        prisma.producto.findUniqueOrThrow({ where: { sku: datos.sku } }),
        prisma.cliente.findUniqueOrThrow({
          where: { numeroTarjeta: datos.tarjeta },
          include: { saldo: true },
        }),
        prisma.ruta.findUniqueOrThrow({ where: { nombre: datos.ruta } }),
      ]);
      escenario.registrarLocalidad(localidad.id);
      escenario.registrarProducto(producto.id);
      escenario.registrarCliente(cliente.id);
      escenario.registrarRuta(ruta.id);
      expect(producto.existencia).toBe(7);
      expect(Number(cliente.saldo?.saldoActual)).toBe(1_200);
      expect(
        await prisma.rutaCliente.count({
          where: { rutaId: ruta.id, clienteId: cliente.id },
        }),
      ).toBe(1);

      const marcaInvalida = `${escenario.marca}-ROLLBACK`;
      const datosInvalidos = datosImportacion(marcaInvalida);
      datosInvalidos.localidadCliente = "Localidad inexistente";
      const respuestaInvalida = await request(app)
        .post("/api/v1/importaciones/excel")
        .set(cabeceras(admin.token))
        .send({ archivoBase64: await crearExcelImportacion(datosInvalidos) })
        .expect(422);
      expect(respuestaInvalida.body.error.codigo).toBe(
        "LOCALIDAD_NO_ENCONTRADA",
      );
      expect(
        await prisma.producto.findUnique({
          where: { sku: datosInvalidos.sku },
        }),
      ).toBeNull();
      expect(
        await prisma.localidad.findUnique({
          where: {
            nombre_estado: {
              nombre: datosInvalidos.localidad,
              estado: datosInvalidos.estado,
            },
          },
        }),
      ).toBeNull();
    } finally {
      await escenario.limpiar();
    }
  });
});

interface DatosExcel {
  localidad: string;
  localidadCliente: string;
  estado: string;
  sku: string;
  producto: string;
  telefono: string;
  tarjeta: string;
  cliente: string;
  ruta: string;
}

function datosImportacion(marca: string): DatosExcel {
  const localidad = `Excel Localidad ${marca}`;
  const sufijoTelefono = [...marca]
    .map((caracter) => (Number.parseInt(caracter, 16) % 10).toString())
    .join("")
    .slice(0, 7);
  return {
    localidad,
    localidadCliente: localidad,
    estado: "Oaxaca",
    sku: `XLSX-${marca}`,
    producto: `Producto Excel ${marca}`,
    // La marca es hexadecimal. Convertirla a dígitos evita que la
    // normalización telefónica elimine letras y produzca longitudes aleatorias.
    telefono: `951${sufijoTelefono}`,
    tarjeta: `XLSX-T-${marca}`,
    cliente: `Cliente Excel ${marca}`,
    ruta: `Excel Ruta ${marca}`,
  };
}

async function crearExcelImportacion(datos: DatosExcel) {
  const libro = new ExcelJS.Workbook();
  const localidades = libro.addWorksheet("Localidades");
  localidades.addRow(["Nombre", "Estado"]);
  localidades.addRow([datos.localidad, datos.estado]);

  const productos = libro.addWorksheet("Productos");
  productos.addRow([
    "SKU",
    "Nombre",
    "Marca",
    "Categoria",
    "CodigoBarras",
    "CodigoQR",
    "Existencia",
    "ExistenciaMinima",
    "PrecioCompra",
    "PrecioVenta",
  ]);
  productos.addRow([
    datos.sku,
    datos.producto,
    "Marca Excel",
    "Importados",
    `CB-${datos.sku}`,
    "",
    7,
    2,
    300,
    600,
  ]);

  const clientes = libro.addWorksheet("Clientes");
  clientes.addRow([
    "Nombre",
    "Telefono",
    "Direccion",
    "Localidad",
    "Estado",
    "SaldoInicial",
    "NumeroTarjeta",
    "LimiteCredito",
  ]);
  clientes.addRow([
    datos.cliente,
    datos.telefono,
    `Calle Excel 123 ${datos.sku}`,
    datos.localidadCliente,
    datos.estado,
    1_200,
    datos.tarjeta,
    5_000,
  ]);

  const rutas = libro.addWorksheet("Rutas");
  rutas.addRow(["Nombre", "Dia", "LocalidadesSeparadasPorPuntoYComa"]);
  rutas.addRow([datos.ruta, "MIERCOLES", datos.localidad]);

  const asignaciones = libro.addWorksheet("RutaClientes");
  asignaciones.addRow(["Ruta", "NumeroTarjeta", "Telefono"]);
  asignaciones.addRow([datos.ruta, datos.tarjeta, ""]);
  return Buffer.from(await libro.xlsx.writeBuffer()).toString("base64");
}
