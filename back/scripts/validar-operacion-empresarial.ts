import request from "supertest";
import { RolUsuario } from "@prisma/client";
import { app } from "../src/app.js";
import { prisma } from "../src/infraestructura/prisma.js";
import { crearTokenAcceso } from "../src/seguridad/tokens.js";
import { cifrarCampo, hashBusqueda } from "../src/compartido/cifrado.js";
import { fechaMexicoISO } from "../src/compartido/fechas.js";

const marca = Date.now().toString(36);
const creados: Record<string, string | undefined> = {};

function autorizar(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function limpiar() {
  if (creados.usuario) {
    await prisma.auditoria.deleteMany({
      where: { usuarioId: creados.usuario },
    });
    await prisma.corteCaja.deleteMany({
      where: {
        OR: [
          { usuarioOperadorId: creados.usuario },
          { cerradoPorId: creados.usuario },
        ],
      },
    });
  }
  if (creados.devolucion)
    await prisma.devolucion.deleteMany({ where: { id: creados.devolucion } });
  if (creados.pedido)
    await prisma.pedidoVenta.deleteMany({ where: { id: creados.pedido } });
  if (creados.venta) {
    await prisma.movimientoInventario.deleteMany({
      where: { referenciaId: creados.venta },
    });
    await prisma.venta.deleteMany({ where: { id: creados.venta } });
  }
  if (creados.compra) {
    await prisma.movimientoInventario.deleteMany({
      where: { referenciaId: creados.compra },
    });
    await prisma.compra.deleteMany({ where: { id: creados.compra } });
  }
  if (creados.cliente) {
    await prisma.movimientoSaldo.deleteMany({
      where: { clienteId: creados.cliente },
    });
    await prisma.saldoCliente.deleteMany({
      where: { clienteId: creados.cliente },
    });
    await prisma.evaluacionRiesgo.deleteMany({
      where: { clienteId: creados.cliente },
    });
    await prisma.cliente.deleteMany({ where: { id: creados.cliente } });
  }
  if (creados.producto) {
    await prisma.movimientoInventario.deleteMany({
      where: { productoId: creados.producto },
    });
    await prisma.producto.deleteMany({ where: { id: creados.producto } });
  }
  if (creados.proveedor)
    await prisma.proveedor.deleteMany({ where: { id: creados.proveedor } });
  if (creados.localidad)
    await prisma.localidad.deleteMany({ where: { id: creados.localidad } });
  if (creados.usuario)
    await prisma.usuario.deleteMany({ where: { id: creados.usuario } });
}

async function principal() {
  const usuario = await prisma.usuario.create({
    data: {
      nombre: `Prueba empresarial ${marca}`,
      correo: `prueba-${marca}@nexo.local`,
      hashContrasena: "no-se-usa-en-esta-prueba",
      rol: RolUsuario.ADMINISTRADOR,
    },
  });
  creados.usuario = usuario.id;
  const token = crearTokenAcceso({
    sub: usuario.id,
    correo: usuario.correo,
    rol: usuario.rol,
    debeCambiarContrasena: false,
  });
  const cabeceras = autorizar(token);
  const localidad = await prisma.localidad.create({
    data: { nombre: `Localidad ${marca}`, estado: "Puebla" },
  });
  creados.localidad = localidad.id;
  const cliente = await prisma.cliente.create({
    data: {
      nombreCompleto: `Cliente ${marca}`,
      telefonoCifrado: cifrarCampo("2220001234"),
      telefonoHash: hashBusqueda("2220001234"),
      telefonoUltimos4: "1234",
      direccionCifrada: cifrarCampo("Dirección de prueba número 1"),
      localidadId: localidad.id,
      saldo: { create: {} },
    },
  });
  creados.cliente = cliente.id;
  const producto = await prisma.producto.create({
    data: {
      sku: `TEST-${marca}`,
      nombre: `Producto prueba ${marca}`,
      marca: "Nexo Test",
      existencia: 0,
      precioCompra: 50,
      precioVenta: 100,
    },
  });
  creados.producto = producto.id;

  const proveedorRespuesta = await request(app)
    .post("/api/v1/proveedores")
    .set(cabeceras)
    .send({ nombre: `Proveedor ${marca}`, telefono: "2220009999" })
    .expect(201);
  creados.proveedor = proveedorRespuesta.body.id;

  const pedidoRespuesta = await request(app)
    .post("/api/v1/pedidos")
    .set(cabeceras)
    .send({
      clienteId: cliente.id,
      items: [{ productoId: producto.id, cantidad: 1 }],
    })
    .expect(201);
  creados.pedido = pedidoRespuesta.body.id;
  const itemPedidoId = pedidoRespuesta.body.items[0].id as string;

  await request(app)
    .patch(`/api/v1/pedidos/${creados.pedido}/estado`)
    .set(cabeceras)
    .send({ estado: "PEDIDO_PROVEEDOR" })
    .expect(200);

  const compraRespuesta = await request(app)
    .post("/api/v1/compras")
    .set(cabeceras)
    .send({
      proveedorId: creados.proveedor,
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
  creados.compra = compraRespuesta.body.id;

  await request(app)
    .patch(`/api/v1/pedidos/${creados.pedido}/estado`)
    .set(cabeceras)
    .send({ estado: "RECIBIDO_ALMACEN" })
    .expect(200);
  await request(app)
    .patch(`/api/v1/pedidos/${creados.pedido}/estado`)
    .set(cabeceras)
    .send({ estado: "LISTO_ENTREGA" })
    .expect(200);

  const entregaRespuesta = await request(app)
    .post(`/api/v1/pedidos/${creados.pedido}/entregar`)
    .set(cabeceras)
    .send({
      tipo: "CONTADO",
      fechaEntrega: new Date(),
      proveedores: [{ itemPedidoId, proveedorId: creados.proveedor }],
    })
    .expect(201);
  creados.venta = entregaRespuesta.body.venta.id;
  const detalleVentaId = entregaRespuesta.body.venta.detalles[0].id as string;

  const pngUnPixel =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const devolucionRespuesta = await request(app)
    .post("/api/v1/devoluciones")
    .set(cabeceras)
    .send({
      ventaId: creados.venta,
      tipo: "TOTAL",
      motivo: "Prueba integral de devolución y reembolso",
      montoReembolsado: 100,
      metodoReembolso: "EFECTIVO",
      usuarioOperadorId: usuario.id,
      evidencia: {
        nombre: "evidencia.png",
        mime: "image/png",
        base64: pngUnPixel,
      },
      items: [{ detalleVentaId, cantidad: 1 }],
    })
    .expect(201);
  creados.devolucion = devolucionRespuesta.body.id;

  const fecha = fechaMexicoISO(new Date());
  const previsualizacion = await request(app)
    .get(
      `/api/v1/cortes/previsualizar?usuarioOperadorId=${usuario.id}&fecha=${fecha}`,
    )
    .set(cabeceras)
    .expect(200);
  if (previsualizacion.body.sistema.total !== 0)
    throw new Error(
      `El corte neto debía ser 0 y fue ${previsualizacion.body.sistema.total}`,
    );

  await request(app)
    .post("/api/v1/cortes")
    .set(cabeceras)
    .send({
      usuarioOperadorId: usuario.id,
      fecha,
      efectivo: 0,
      transferencia: 0,
      tarjeta: 0,
      otro: 0,
      firmaNombre: usuario.nombre,
      confirmacion: `CERRAR ${fecha}`,
    })
    .expect(201);

  await request(app)
    .post("/api/v1/ventas")
    .set(cabeceras)
    .send({
      tipo: "PUBLICO",
      fechaVenta: new Date(),
      items: [{ productoId: producto.id, cantidad: 1 }],
    })
    .expect(409);

  const alertasRespuesta = await request(app)
    .get("/api/v1/alertas")
    .set(cabeceras)
    .expect(200);
  if (typeof alertasRespuesta.body.totales?.total !== "number")
    throw new Error("El centro de alertas no devolvio totales validos.");

  const productoFinal = await prisma.producto.findUniqueOrThrow({
    where: { id: producto.id },
  });
  if (productoFinal.existencia !== 2)
    throw new Error(
      `La existencia final debía ser 2 y fue ${productoFinal.existencia}`,
    );

  console.log(
    JSON.stringify({
      resultado: "ok",
      compra: compraRespuesta.body.folio,
      venta: entregaRespuesta.body.venta.folio,
      devolucion: devolucionRespuesta.body.folio,
      corteNeto: previsualizacion.body.sistema.total,
      existenciaFinal: productoFinal.existencia,
      alertasConsultadas: alertasRespuesta.body.totales.total,
    }),
  );
}

principal()
  .finally(async () => {
    await limpiar();
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
