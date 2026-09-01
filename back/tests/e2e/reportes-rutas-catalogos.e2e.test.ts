import ExcelJS from "exceljs";
import { DiaSemana, RolUsuario } from "@prisma/client";
import type { Response } from "superagent";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { fechaMexicoISO } from "../../src/compartido/fechas.js";
import { prisma } from "../../src/infraestructura/prisma.js";
import {
  asegurarBaseDePruebas,
  cabeceras,
  EscenarioPrueba,
} from "./escenario.js";

beforeAll(asegurarBaseDePruebas);
afterAll(() => prisma.$disconnect());

async function conEscenario(
  ejecutar: (escenario: EscenarioPrueba) => Promise<void>,
) {
  const escenario = new EscenarioPrueba();
  try {
    await ejecutar(escenario);
  } finally {
    await escenario.limpiar();
  }
}

function diaActual(): DiaSemana {
  const dias = [
    DiaSemana.DOMINGO,
    DiaSemana.LUNES,
    DiaSemana.MARTES,
    DiaSemana.MIERCOLES,
    DiaSemana.JUEVES,
    DiaSemana.VIERNES,
    DiaSemana.SABADO,
  ];
  return dias[new Date().getDay()]!;
}

function recibirBinario(
  respuesta: Response,
  terminar: (error: Error | null, cuerpo?: Buffer) => void,
) {
  const fragmentos: Buffer[] = [];
  respuesta.on("data", (fragmento: Buffer) => fragmentos.push(fragmento));
  respuesta.on("end", () => terminar(null, Buffer.concat(fragmentos)));
  respuesta.on("error", (error: Error) => terminar(error));
}

describe.sequential("rutas y alertas empresariales", () => {
  it("arma una ruta sólo con clientas con saldo y conserva el orden elegido", () =>
    conEscenario(async (escenario) => {
      const [admin, cobrador] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const [localidadUno, localidadDos] = await Promise.all([
        escenario.crearLocalidad(1),
        escenario.crearLocalidad(2),
      ]);
      const [clienteUno, clienteDos] = await Promise.all([
        escenario.crearCliente(localidadUno.id, { indice: 1, saldo: 300 }),
        escenario.crearCliente(localidadDos.id, { indice: 2, saldo: 500 }),
      ]);
      const clienteSinSaldo = await escenario.crearCliente(localidadUno.id, {
        indice: 3,
        saldo: 0,
      });
      const candidatos = await request(app)
        .get("/api/v1/rutas/clientes-con-saldo")
        .set(cabeceras(admin.token))
        .expect(200);
      const idsCandidatos = candidatos.body.datos.map(
        (item: { id: string }) => item.id,
      );
      expect(idsCandidatos).toEqual(
        expect.arrayContaining([clienteUno.id, clienteDos.id]),
      );
      expect(idsCandidatos).not.toContain(clienteSinSaldo.id);

      await request(app)
        .post("/api/v1/rutas")
        .set(cabeceras(admin.token))
        .send({
          nombre: `Ruta inválida ${escenario.marca}`,
          diaSemana: "JUEVES",
          cobradorId: cobrador.id,
          localidadIds: [localidadUno.id],
          clienteIds: [clienteSinSaldo.id],
          incluirClientesLocalidades: false,
        })
        .expect(422);

      const respuesta = await request(app)
        .post("/api/v1/rutas")
        .set(cabeceras(admin.token))
        .send({
          nombre: `Ruta API ${escenario.marca}`,
          diaSemana: "JUEVES",
          cobradorId: cobrador.id,
          localidadIds: [localidadUno.id, localidadDos.id],
          clienteIds: [clienteDos.id, clienteUno.id],
          incluirClientesLocalidades: false,
        })
        .expect(201);
      escenario.registrarRuta(respuesta.body.id);
      expect(respuesta.body.localidades).toHaveLength(2);
      expect(
        respuesta.body.clientes.map(
          (item: { clienteId: string }) => item.clienteId,
        ),
      ).toEqual([clienteDos.id, clienteUno.id]);

      await request(app)
        .patch(`/api/v1/rutas/${respuesta.body.id}`)
        .set(cabeceras(admin.token))
        .send({
          clienteIds: [clienteUno.id, clienteDos.id],
          incluirClientesLocalidades: false,
        })
        .expect(200);
      const ordenActualizado = await prisma.rutaCliente.findMany({
        where: { rutaId: respuesta.body.id },
        orderBy: { orden: "asc" },
        select: { clienteId: true },
      });
      expect(ordenActualizado.map(({ clienteId }) => clienteId)).toEqual([
        clienteUno.id,
        clienteDos.id,
      ]);

      await request(app)
        .patch(`/api/v1/rutas/${respuesta.body.id}`)
        .set(cabeceras(admin.token))
        .send({
          clienteIds: [clienteSinSaldo.id],
          incluirClientesLocalidades: false,
        })
        .expect(422);
    }));

  it("encuentra clientes fuera de ruta por nombre, tarjeta y teléfono sin filtrar PII", () =>
    conEscenario(async (escenario) => {
      const cobrador = await escenario.crearUsuario(RolUsuario.COBRADOR);
      const [localidadRuta, localidadExtra] = await Promise.all([
        escenario.crearLocalidad(1),
        escenario.crearLocalidad(2),
      ]);
      const asignado = await escenario.crearCliente(localidadRuta.id, {
        indice: 1,
      });
      const extraordinario = await escenario.crearCliente(localidadExtra.id, {
        indice: 2,
        saldo: 500,
        tarjeta: `EXTRA-${escenario.marca}`,
      });
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
      for (const termino of [
        extraordinario.nombreCompleto,
        extraordinario.numeroTarjeta!,
        extraordinario.telefono,
      ]) {
        const respuesta = await request(app)
          .get(
            `/api/v1/rutas/${ruta.id}/clientes-extraordinarios?buscar=${encodeURIComponent(termino)}`,
          )
          .set(cabeceras(cobrador.token))
          .expect(200);
        const encontrado = respuesta.body.datos.find(
          (item: { id: string }) => item.id === extraordinario.id,
        );
        expect(encontrado, `No encontrado por ${termino}`).toBeTruthy();
        expect(encontrado.telefono).toBe(extraordinario.telefono);
        expect(encontrado.direccion).toContain("Avenida Automatizada");
        expect(encontrado).not.toHaveProperty("telefonoCifrado");
        expect(encontrado).not.toHaveProperty("direccionCifrada");
      }
    }));

  it("detecta inventario bajo, mora, pedido atrasado y ruta incompleta", () =>
    conEscenario(async (escenario) => {
      const [admin, contable, cobrador] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 900,
      });
      await prisma.saldoCliente.update({
        where: { clienteId: cliente.id },
        data: { vencidoActual: 999_999 },
      });
      const producto = await escenario.crearProducto({ existencia: 1 });
      await prisma.producto.update({
        where: { id: producto.id },
        data: { existenciaMinima: 5 },
      });
      const ruta = await escenario.crearRuta(
        [localidad.id],
        [cliente.id],
        diaActual(),
        cobrador.id,
      );
      await prisma.pedidoVenta.create({
        data: {
          folio: `ALERTA-${escenario.marca}`,
          clienteId: cliente.id,
          estado: "PENDIENTE_PEDIR",
          creadoEn: new Date(Date.now() - 9 * 86_400_000),
          items: {
            create: {
              productoId: producto.id,
              descripcion: producto.nombre,
              cantidad: 1,
              precioEstimado: producto.precioVenta,
            },
          },
        },
      });

      const alertas = await request(app)
        .get("/api/v1/alertas")
        .set(cabeceras(admin.token))
        .expect(200);
      expect(alertas.body.totales.bajoInventario).toBeGreaterThanOrEqual(1);
      expect(alertas.body.totales.clientesVencidos).toBeGreaterThanOrEqual(1);
      expect(alertas.body.totales.pedidosAtrasados).toBeGreaterThanOrEqual(1);
      expect(
        alertas.body.rutas.some((item: { id: string }) => item.id === ruta.id),
      ).toBe(true);
      expect(
        alertas.body.clientes.some(
          (item: { id: string }) => item.id === cliente.id,
        ),
      ).toBe(true);

      const alertasContable = await request(app)
        .get("/api/v1/alertas")
        .set(cabeceras(contable.token))
        .expect(200);
      expect(alertasContable.body.productos).toEqual([]);
      expect(alertasContable.body.totales.bajoInventario).toBe(0);
    }));
});

describe.sequential("reportes y exportaciones", () => {
  it("calcula ventas, compras e inventario de un periodo histórico aislado", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({
        existencia: 3,
        precio: 100,
      });
      const proveedor = await escenario.crearProveedor();
      const fecha = new Date();
      const fechaIso = fechaMexicoISO(fecha);
      await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          fechaVenta: fecha,
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      await request(app)
        .post("/api/v1/compras")
        .set(cabeceras(admin.token))
        .send({
          proveedorId: proveedor.id,
          fechaCompra: fecha,
          items: [{ productoId: producto.id, cantidad: 2, costoUnitario: 50 }],
        })
        .expect(201);
      const resumen = await request(app)
        .get(`/api/v1/reportes/resumen?periodo=MES&fecha=${fechaIso}`)
        .set(cabeceras(admin.token))
        .expect(200);
      expect(resumen.body.ventas.bruto).toBe(100);
      expect(resumen.body.ventas.total).toBe(100);
      expect(resumen.body.compras.total).toBe(100);
      expect(resumen.body.ventas.operaciones).toBe(1);
    }));

  it("genera Excel de ventas con fórmula de utilidad", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({
        existencia: 2,
        precio: 250,
      });
      await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          fechaVenta: new Date(),
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      const respuesta = await request(app)
        .get(
          `/api/v1/reportes/ventas.xlsx?desde=${new Date(Date.now() - 86_400_000).toISOString()}&hasta=${new Date(Date.now() + 86_400_000).toISOString()}`,
        )
        .set(cabeceras(admin.token))
        .buffer(true)
        .parse(recibirBinario)
        .expect(200)
        .expect("Content-Type", /spreadsheetml/);
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(Buffer.from(respuesta.body));
      const hoja = libro.getWorksheet("Ventas")!;
      expect(hoja.rowCount).toBeGreaterThanOrEqual(3);
      expect(hoja.getCell("A2").value).toMatch(/^V-/);
      expect(hoja.getCell("I2").value).toMatchObject({ formula: "G2-H2" });
    }));

  it("genera Excel de cartera sin incluir teléfono ni dirección", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 750,
      });
      const respuesta = await request(app)
        .get("/api/v1/reportes/clientes.xlsx")
        .set(cabeceras(admin.token))
        .buffer(true)
        .parse(recibirBinario)
        .expect(200)
        .expect("Content-Type", /spreadsheetml/);
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(Buffer.from(respuesta.body));
      const hoja = libro.getWorksheet("Cartera")!;
      const encabezados = hoja.getRow(1).values as unknown[];
      expect(encabezados).not.toContain("Telefono");
      expect(encabezados).not.toContain("Direccion");
      const nombres = (hoja.getColumn(2).values ?? []).map(String);
      expect(nombres).toContain(cliente.nombreCompleto);
    }));

  it("genera un PDF válido de pedidos pendientes", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const respuesta = await request(app)
        .get("/api/v1/reportes/pedidos-pendientes.pdf")
        .set(cabeceras(admin.token))
        .buffer(true)
        .expect(200)
        .expect("Content-Type", /application\/pdf/);
      expect(Buffer.from(respuesta.body).subarray(0, 5).toString()).toBe(
        "%PDF-",
      );
    }));
});

describe.sequential("catálogos, auditoría y paginación", () => {
  it("pagina clientes sin repetir registros entre páginas", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      for (let indice = 1; indice <= 5; indice += 1)
        await escenario.crearCliente(localidad.id, { indice });
      const [paginaUno, paginaDos] = await Promise.all([
        request(app)
          .get("/api/v1/clientes?pagina=1&limite=2")
          .set(cabeceras(admin.token))
          .expect(200),
        request(app)
          .get("/api/v1/clientes?pagina=2&limite=2")
          .set(cabeceras(admin.token))
          .expect(200),
      ]);
      expect(paginaUno.body.datos).toHaveLength(2);
      expect(paginaDos.body.datos).toHaveLength(2);
      const idsUno = new Set(
        paginaUno.body.datos.map((item: { id: string }) => item.id),
      );
      expect(
        paginaDos.body.datos.some((item: { id: string }) =>
          idsUno.has(item.id),
        ),
      ).toBe(false);
      expect(paginaUno.body.paginacion.total).toBeGreaterThanOrEqual(5);
    }));

  it("registra en auditoría la edición de un proveedor", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const proveedor = await escenario.crearProveedor();
      await request(app)
        .patch(`/api/v1/proveedores/${proveedor.id}`)
        .set(cabeceras(admin.token))
        .send({ contacto: "Contacto actualizado", activo: false })
        .expect(200);
      const auditoria = await request(app)
        .get("/api/v1/auditoria?entidad=Proveedor&accion=ACTUALIZAR")
        .set(cabeceras(admin.token))
        .expect(200);
      expect(
        auditoria.body.datos.some(
          (item: { entidadId: string }) => item.entidadId === proveedor.id,
        ),
      ).toBe(true);
      const registro = await prisma.auditoria.findFirstOrThrow({
        where: { entidad: "Proveedor", entidadId: proveedor.id },
      });
      expect(registro.datosAntes).toBeTruthy();
      expect(registro.datosDespues).toBeTruthy();
    }));

  it("revierte el Excel si una tarjeta llega sin saldo inicial", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidadNombre = `Rollback Tarjeta ${escenario.marca}`;
      const libro = new ExcelJS.Workbook();
      const localidades = libro.addWorksheet("Localidades");
      localidades.addRow(["Nombre", "Estado"]);
      localidades.addRow([localidadNombre, "Veracruz"]);
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
        `Cliente inválido ${escenario.marca}`,
        "2295551234",
        "Calle rollback número 1",
        localidadNombre,
        "Veracruz",
        0,
        `SIN-SALDO-${escenario.marca}`,
        1_000,
      ]);
      const archivoBase64 = Buffer.from(
        await libro.xlsx.writeBuffer(),
      ).toString("base64");
      const respuesta = await request(app)
        .post("/api/v1/importaciones/excel")
        .set(cabeceras(admin.token))
        .send({ archivoBase64 })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("TARJETA_SIN_SALDO");
      expect(
        await prisma.localidad.findUnique({
          where: {
            nombre_estado: { nombre: localidadNombre, estado: "Veracruz" },
          },
        }),
      ).toBeNull();
    }));
});
