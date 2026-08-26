import { Router, type RequestHandler } from "express";
import { z } from "zod";

import { permitirPermiso } from "../../../seguridad/middlewares.js";
import { obtenerDatosDocumentoRuta } from "./datosDocumentoRuta.js";
import { transmitirDocumentoRutaPdf } from "./dibujarDocumentoRuta.js";
import type { TipoDocumentoRuta } from "./tipos.js";

export const rutasDocumentos = Router();

rutasDocumentos.get(
  "/:id/hoja.pdf",
  permitirPermiso("RUTAS_OPERAR"),
  descargar("HOJA"),
);
rutasDocumentos.get(
  "/:id/resultado.pdf",
  permitirPermiso("RUTAS_OPERAR"),
  descargar("RESULTADO"),
);

function descargar(tipo: TipoDocumentoRuta): RequestHandler {
  return async (req, res) => {
    const fechaTexto = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(req.query.fecha);
    const fecha = fechaLocal(fechaTexto);
    const datos = await obtenerDatosDocumentoRuta(
      String(req.params.id),
      fecha,
      req.usuario!,
    );
    const nombre = `${tipo === "HOJA" ? "hoja" : "resultado"}-${normalizarNombre(datos.nombre)}-${fechaTexto}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${nombre}"`);
    transmitirDocumentoRutaPdf(res, datos, tipo);
  };
}

function fechaLocal(valor: string) {
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano!, mes! - 1, dia!, 12, 0, 0);
}

function normalizarNombre(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLocaleLowerCase("es-MX")
    .slice(0, 60);
}
