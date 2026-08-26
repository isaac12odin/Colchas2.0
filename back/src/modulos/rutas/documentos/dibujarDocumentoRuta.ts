import PDFDocument from "pdfkit";
import type { Writable } from "node:stream";

import type {
  ClienteDocumentoRuta,
  DatosDocumentoRuta,
  TipoDocumentoRuta,
} from "./tipos.js";

const colores = {
  tinta: "#172033",
  tenue: "#64748B",
  azul: "#155EEF",
  azulClaro: "#EAF2FF",
  borde: "#D8E0EC",
  rojo: "#B42318",
  verde: "#067647",
};
const formatoDinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function transmitirDocumentoRutaPdf(
  destino: Writable,
  datos: DatosDocumentoRuta,
  tipo: TipoDocumentoRuta,
) {
  const documento = new PDFDocument({
    size: "LETTER",
    margins: { top: 36, right: 36, bottom: 44, left: 36 },
    bufferPages: true,
    info: {
      Title: `${tipo === "HOJA" ? "Hoja" : "Resultado"} de ruta - ${datos.nombre}`,
      Author: "Vektra",
    },
  });
  documento.pipe(destino);
  dibujarEncabezado(documento, datos, tipo);
  dibujarTotales(documento, datos, tipo);

  for (const cliente of datos.clientes) {
    asegurarEspacio(documento, 126, datos, tipo);
    dibujarCliente(documento, cliente, tipo);
  }
  if (!datos.clientes.length) {
    documento
      .moveDown(2)
      .fillColor(colores.tenue)
      .fontSize(11)
      .text("La ruta no tiene clientes asignados con saldo.", {
        align: "center",
      });
  }

  numerarPaginas(documento);
  documento.end();
}

function dibujarEncabezado(
  documento: PDFKit.PDFDocument,
  datos: DatosDocumentoRuta,
  tipo: TipoDocumentoRuta,
) {
  const titulo = tipo === "HOJA" ? "HOJA DE COBRANZA" : "RESULTADO DE COBRANZA";
  documento
    .roundedRect(36, 30, 540, 78, 12)
    .fill(colores.tinta)
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("VEKTRA · RUTAS", 52, 45)
    .fontSize(19)
    .text(titulo, 52, 61)
    .font("Helvetica")
    .fontSize(9)
    .text(formatoFecha.format(datos.fecha), 410, 48, {
      width: 150,
      align: "right",
    })
    .font("Helvetica-Bold")
    .text(datos.nombre, 410, 70, { width: 150, align: "right" });
  documento
    .fillColor(colores.tinta)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`Cobrador: ${datos.cobrador}`, 36, 119, { width: 260 })
    .font("Helvetica")
    .fillColor(colores.tenue)
    .text(datos.localidades.join(" · ") || "Sin localidades", 305, 119, {
      width: 271,
      align: "right",
    });
  documento.y = 146;
}

function dibujarTotales(
  documento: PDFKit.PDFDocument,
  datos: DatosDocumentoRuta,
  tipo: TipoDocumentoRuta,
) {
  const resumen = [
    ["Visitas", String(datos.clientes.length)],
    ["Saldo", formatoDinero.format(datos.totales.saldo)],
    ["Vencido", formatoDinero.format(datos.totales.vencido)],
    ["Cobrar hoy", formatoDinero.format(datos.totales.cobrarHoy)],
    [
      tipo === "HOJA" ? "Meta" : "Recibido",
      formatoDinero.format(
        tipo === "HOJA" ? datos.totales.cobrarHoy : datos.totales.recibido,
      ),
    ],
  ];
  const ancho = 104;
  resumen.forEach(([etiqueta, valor], indice) => {
    const x = 36 + indice * 108;
    documento.roundedRect(x, 146, ancho, 48, 7).fill(colores.azulClaro);
    documento
      .fillColor(colores.tenue)
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(etiqueta!.toUpperCase(), x + 8, 155, { width: ancho - 16 })
      .fillColor(colores.tinta)
      .fontSize(10)
      .text(valor!, x + 8, 171, { width: ancho - 16 });
  });
  documento.y = 210;
}

function dibujarCliente(
  documento: PDFKit.PDFDocument,
  cliente: ClienteDocumentoRuta,
  tipo: TipoDocumentoRuta,
) {
  const y = documento.y;
  const alto = 116;
  documento
    .roundedRect(36, y, 540, alto, 9)
    .lineWidth(0.8)
    .strokeColor(colores.borde)
    .stroke();
  documento
    .circle(57, y + 22, 13)
    .fill(colores.azul)
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(String(cliente.orden), 46, y + 18, { width: 22, align: "center" });
  documento
    .fillColor(colores.tinta)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(cliente.nombreCompleto, 80, y + 12, { width: 285 })
    .font("Helvetica")
    .fillColor(colores.tenue)
    .fontSize(8)
    .text(
      `${cliente.localidad} · ${cliente.numeroTarjeta ?? "Sin tarjeta"}${cliente.fueraDeRuta ? " · FUERA DE RUTA" : ""}`,
      80,
      y + 29,
      { width: 285 },
    )
    .text(`${cliente.direccion} · ${cliente.telefono}`, 80, y + 42, {
      width: 475,
      height: 22,
      ellipsis: true,
    });
  dibujarMetricasCliente(documento, cliente, y);
  dibujarResultado(documento, cliente, tipo, y);
  documento.y = y + alto + 9;
}

function dibujarMetricasCliente(
  documento: PDFKit.PDFDocument,
  cliente: ClienteDocumentoRuta,
  y: number,
) {
  const datos = [
    ["SALDO", formatoDinero.format(cliente.saldo)],
    ["ABONO", formatoDinero.format(cliente.abonoAcordado)],
    ["VENCIDO", formatoDinero.format(cliente.vencido)],
    ["COBRAR HOY", formatoDinero.format(cliente.cobrarHoy)],
  ];
  datos.forEach(([etiqueta, valor], indice) => {
    const x = 374 + (indice % 2) * 92;
    const linea = Math.floor(indice / 2);
    documento
      .fillColor(colores.tenue)
      .font("Helvetica-Bold")
      .fontSize(6)
      .text(etiqueta!, x, y + 12 + linea * 26, { width: 84 })
      .fillColor(indice === 3 ? colores.azul : colores.tinta)
      .fontSize(9)
      .text(valor!, x, y + 22 + linea * 26, { width: 84 });
  });
}

function dibujarResultado(
  documento: PDFKit.PDFDocument,
  cliente: ClienteDocumentoRuta,
  tipo: TipoDocumentoRuta,
  y: number,
) {
  documento
    .moveTo(48, y + 72)
    .lineTo(564, y + 72)
    .strokeColor(colores.borde)
    .stroke();
  if (tipo === "HOJA") {
    documento
      .fillColor(colores.tinta)
      .font("Helvetica")
      .fontSize(8)
      .text("Resultado: [ ] Pagó  [ ] No pagó  [ ] Ausente", 50, y + 82)
      .text("Recibido: $____________", 260, y + 82)
      .text("Diferencia: $____________", 405, y + 82)
      .text(
        "Siguiente compromiso: ____ / ____ / ______   Monto: $____________",
        50,
        y + 98,
      );
    return;
  }
  const promesa = cliente.promesaPagoFecha
    ? `${formatoFecha.format(cliente.promesaPagoFecha)} por ${formatoDinero.format(cliente.promesaPagoMonto ?? 0)}`
    : "Sin compromiso";
  documento
    .fillColor(cliente.resultado === "PAGO" ? colores.verde : colores.rojo)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(`Resultado: ${cliente.resultado ?? "PENDIENTE"}`, 50, y + 82)
    .fillColor(colores.tinta)
    .text(
      `Recibido: ${formatoDinero.format(cliente.montoRecibido)}`,
      225,
      y + 82,
    )
    .text(
      `Diferencia: ${formatoDinero.format(cliente.diferencia)}`,
      380,
      y + 82,
    )
    .font("Helvetica")
    .fillColor(colores.tenue)
    .text(
      `Motivo: ${cliente.motivoNoCobro ?? "—"} · Compromiso: ${promesa} · Retardo: ${cliente.diasRetardo} días`,
      50,
      y + 99,
      { width: 500 },
    );
}

function asegurarEspacio(
  documento: PDFKit.PDFDocument,
  alto: number,
  datos: DatosDocumentoRuta,
  tipo: TipoDocumentoRuta,
) {
  if (documento.y + alto < 740) return;
  documento.addPage();
  documento
    .fillColor(colores.tinta)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`${tipo === "HOJA" ? "Hoja" : "Resultado"} · ${datos.nombre}`, 36, 34)
    .font("Helvetica")
    .fillColor(colores.tenue)
    .fontSize(8)
    .text(formatoFecha.format(datos.fecha), 400, 36, {
      width: 176,
      align: "right",
    });
  documento.y = 62;
}

function numerarPaginas(documento: PDFKit.PDFDocument) {
  const rango = documento.bufferedPageRange();
  for (let indice = 0; indice < rango.count; indice += 1) {
    documento.switchToPage(rango.start + indice);
    documento
      .fillColor(colores.tenue)
      .font("Helvetica")
      .fontSize(7)
      .text(
        `Generado por Vektra · Página ${indice + 1} de ${rango.count}`,
        36,
        720,
        { width: 540, align: "center" },
      );
  }
}
