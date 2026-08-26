import { Router } from "express";
import {
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";

export const rutasReportes = Router();
rutasReportes.use(
  autenticar,
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE),
);

function rangoPeriodo(
  periodo: "MES" | "BIMESTRE" | "SEMESTRE" | "ANIO",
  fecha: Date,
) {
  if (periodo === "ANIO")
    return { desde: startOfYear(fecha), hasta: endOfYear(fecha) };
  const meses = periodo === "MES" ? 1 : periodo === "BIMESTRE" ? 2 : 6;
  return {
    desde: startOfMonth(subMonths(fecha, meses - 1)),
    hasta: endOfMonth(fecha),
  };
}

rutasReportes.get("/resumen", async (req, res) => {
  const periodo = z
    .enum(["MES", "BIMESTRE", "SEMESTRE", "ANIO"])
    .default("MES")
    .parse(req.query.periodo);
  const fecha = z.coerce
    .date()
    .default(() => new Date())
    .parse(req.query.fecha);
  const { desde, hasta } = rangoPeriodo(periodo, fecha);
  const [
    ventas,
    abonos,
    compras,
    saldos,
    clientesActivos,
    pedidosPendientes,
    inventario,
    devoluciones,
  ] = await Promise.all([
    prisma.venta.aggregate({
      where: {
        estado: { in: ["CONFIRMADA", "CANCELADA"] },
        fechaVenta: { gte: desde, lte: hasta },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.abono.aggregate({
      where: { anuladoEn: null, fechaAbono: { gte: desde, lte: hasta } },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.compra.aggregate({
      where: { fechaCompra: { gte: desde, lte: hasta } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.saldoCliente.aggregate({
      _sum: { saldoActual: true, vencidoActual: true },
    }),
    prisma.cliente.count({ where: { activo: true } }),
    prisma.pedidoVenta.count({
      where: { estado: { notIn: ["ENTREGADO", "CANCELADO"] } },
    }),
    prisma.producto.findMany({
      where: { activo: true },
      select: {
        existencia: true,
        existenciaMinima: true,
        precioCompra: true,
        precioVenta: true,
      },
    }),
    prisma.devolucion.aggregate({
      where: { estado: "REGISTRADA", creadoEn: { gte: desde, lte: hasta } },
      _sum: { totalDevuelto: true, montoReembolsado: true },
      _count: true,
    }),
  ]);
  const valorInventarioCosto = inventario.reduce(
    (suma, producto) =>
      suma + producto.existencia * Number(producto.precioCompra),
    0,
  );
  const productosBajoMinimo = inventario.filter(
    (producto) => producto.existencia <= producto.existenciaMinima,
  ).length;
  res.json({
    periodo: { tipo: periodo, desde, hasta },
    ventas: {
      bruto: Number(ventas._sum.total ?? 0),
      devoluciones: Number(devoluciones._sum.totalDevuelto ?? 0),
      total:
        Number(ventas._sum.total ?? 0) -
        Number(devoluciones._sum.totalDevuelto ?? 0),
      operaciones: ventas._count,
      operacionesDevueltas: devoluciones._count,
    },
    abonos: {
      total: Number(abonos._sum.monto ?? 0),
      operaciones: abonos._count,
    },
    compras: {
      total: Number(compras._sum.total ?? 0),
      operaciones: compras._count,
    },
    cartera: {
      saldo: Number(saldos._sum.saldoActual ?? 0),
      vencido: Number(saldos._sum.vencidoActual ?? 0),
    },
    operacion: {
      clientesActivos,
      pedidosPendientes,
      productosBajoMinimo,
      valorInventarioCosto,
    },
  });
});

const esquemaRango = z
  .object({ desde: z.coerce.date(), hasta: z.coerce.date() })
  .refine((valor) => valor.desde <= valor.hasta, "Rango de fechas invalido.");

rutasReportes.get("/ventas.xlsx", async (req, res) => {
  const { desde, hasta } = esquemaRango.parse(req.query);
  const ventas = await prisma.venta.findMany({
    where: { estado: "CONFIRMADA", fechaVenta: { gte: desde, lte: hasta } },
    include: {
      cliente: { select: { nombreCompleto: true } },
      detalles: {
        include: { producto: { select: { nombre: true, marca: true } } },
      },
    },
    orderBy: { fechaVenta: "asc" },
  });
  const libro = new ExcelJS.Workbook();
  libro.creator = "Vektra";
  const hoja = libro.addWorksheet("Ventas");
  hoja.columns = [
    { header: "Folio", key: "folio", width: 20 },
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Descuento", key: "descuento", width: 14 },
    { header: "Total", key: "total", width: 14 },
    { header: "Costo", key: "costo", width: 14 },
    { header: "Utilidad", key: "utilidad", width: 14 },
  ];
  ventas.forEach((venta) => {
    const costo = venta.detalles.reduce(
      (suma, detalle) =>
        suma + detalle.cantidad * Number(detalle.costoUnitario),
      0,
    );
    const fila = hoja.addRow({
      folio: venta.folio,
      fecha: venta.fechaVenta,
      cliente: venta.cliente?.nombreCompleto ?? "Publico general",
      tipo: venta.tipo,
      subtotal: Number(venta.subtotal),
      descuento: Number(venta.descuento),
      total: Number(venta.total),
      costo,
    });
    fila.getCell("I").value = {
      formula: `G${fila.number}-H${fila.number}`,
      date1904: false,
    };
  });
  const totalFila = hoja.rowCount + 2;
  hoja.getCell(`F${totalFila}`).value = "TOTALES";
  for (const columna of ["G", "H", "I"])
    hoja.getCell(`${columna}${totalFila}`).value = {
      formula: `SUM(${columna}2:${columna}${totalFila - 2})`,
      date1904: false,
    };
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F62FE" },
  };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = `A1:I${Math.max(1, hoja.rowCount)}`;
  ["E", "F", "G", "H", "I"].forEach((columna) => {
    hoja.getColumn(columna).numFmt = "$#,##0.00";
  });
  const buffer = await libro.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="ventas-${desde.toISOString().slice(0, 10)}-${hasta.toISOString().slice(0, 10)}.xlsx"`,
  );
  res.send(Buffer.from(buffer));
});

rutasReportes.get("/clientes.xlsx", async (_req, res) => {
  const clientes = await prisma.cliente.findMany({
    include: {
      localidad: true,
      saldo: true,
      evaluacionesRiesgo: { take: 1, orderBy: { calculadaEn: "desc" } },
    },
    orderBy: { nombreCompleto: "asc" },
  });
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Cartera");
  hoja.columns = [
    { header: "Tarjeta", key: "tarjeta", width: 16 },
    { header: "Cliente", key: "cliente", width: 32 },
    { header: "Localidad", key: "localidad", width: 22 },
    { header: "Estado", key: "estado", width: 20 },
    { header: "Saldo", key: "saldo", width: 15 },
    { header: "Vencido", key: "vencido", width: 15 },
    { header: "Riesgo", key: "riesgo", width: 14 },
  ];
  clientes.forEach((cliente) => {
    hoja.addRow({
      tarjeta: cliente.numeroTarjeta ?? "",
      cliente: cliente.nombreCompleto,
      localidad: cliente.localidad.nombre,
      estado: cliente.localidad.estado,
      saldo: Number(cliente.saldo?.saldoActual ?? 0),
      vencido: Number(cliente.saldo?.vencidoActual ?? 0),
      riesgo: cliente.evaluacionesRiesgo[0]?.nivel ?? "SIN CALCULAR",
    });
  });
  const filaTotal = hoja.rowCount + 2;
  hoja.getCell(`D${filaTotal}`).value = "TOTALES";
  hoja.getCell(`E${filaTotal}`).value = {
    formula: `SUM(E2:E${filaTotal - 2})`,
    date1904: false,
  };
  hoja.getCell(`F${filaTotal}`).value = {
    formula: `SUM(F2:F${filaTotal - 2})`,
    date1904: false,
  };
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F62FE" },
  };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = `A1:G${Math.max(1, hoja.rowCount)}`;
  hoja.getColumn("E").numFmt = "$#,##0.00";
  hoja.getColumn("F").numFmt = "$#,##0.00";
  const buffer = await libro.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="cartera-clientes.xlsx"',
  );
  res.send(Buffer.from(buffer));
});

rutasReportes.get("/pedidos-pendientes.pdf", async (_req, res) => {
  const pedidos = await prisma.pedidoVenta.findMany({
    where: { estado: { in: ["PENDIENTE_PEDIR", "PEDIDO_PROVEEDOR"] } },
    include: { cliente: { select: { nombreCompleto: true } }, items: true },
    orderBy: { creadoEn: "asc" },
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="pedidos-pendientes.pdf"',
  );
  const documento = new PDFDocument({ margin: 42, size: "LETTER" });
  documento.pipe(res);
  documento
    .fontSize(20)
    .fillColor("#0f62fe")
    .text("Lista de surtido pendiente");
  documento
    .moveDown(0.3)
    .fontSize(9)
    .fillColor("#525252")
    .text(`Generado: ${new Date().toLocaleString("es-MX")}`);
  documento.moveDown();
  for (const pedido of pedidos) {
    if (documento.y > 680) documento.addPage();
    documento
      .fontSize(12)
      .fillColor("#161616")
      .text(`${pedido.folio} · ${pedido.cliente.nombreCompleto}`, {
        continued: false,
      });
    documento.fontSize(9).fillColor("#525252").text(`Estado: ${pedido.estado}`);
    pedido.items.forEach((item) => {
      documento
        .fillColor("#161616")
        .text(`  ${item.cantidad} × ${item.descripcion}`);
    });
    documento.moveDown(0.7);
  }
  if (pedidos.length === 0)
    documento
      .fontSize(12)
      .fillColor("#525252")
      .text("No hay pedidos pendientes por surtir.");
  documento.end();
});
