import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { entorno } from "./configuracion/entorno.js";
import { registro } from "./infraestructura/registro.js";
import { prisma } from "./infraestructura/prisma.js";
import { protegerCsrf } from "./seguridad/middlewares.js";
import { requiereHttps } from "./seguridad/https.js";
import { manejarError, manejarNoEncontrado } from "./compartido/errores.js";
import { rutasAutenticacion } from "./modulos/autenticacion/rutas.js";
import { rutasUsuarios } from "./modulos/usuarios/rutas.js";
import { rutasClientes } from "./modulos/clientes/rutas.js";
import { rutasLocalidades } from "./modulos/localidades/rutas.js";
import { rutasCobranza } from "./modulos/rutas/rutas.js";
import { rutasInventario } from "./modulos/inventario/rutas.js";
import { rutasCompras } from "./modulos/compras/rutas.js";
import { rutasVentas } from "./modulos/ventas/rutas.js";
import { rutasAbonos } from "./modulos/cobranza/rutas.js";
import { rutasPedidos } from "./modulos/pedidos/rutas.js";
import { rutasSincronizacion } from "./modulos/sincronizacion/rutas.js";
import { rutasReportes } from "./modulos/reportes/rutas.js";
import { rutasProveedores } from "./modulos/proveedores/rutas.js";
import { rutasDevoluciones } from "./modulos/devoluciones/rutas.js";
import { rutasCortes } from "./modulos/cortes/rutas.js";
import { rutasImportaciones } from "./modulos/importaciones/rutas.js";
import { rutasAlertas } from "./modulos/alertas/rutas.js";
import { rutasAuditoria } from "./modulos/auditoria/rutas.js";
import { rutasReconciliacion } from "./modulos/reconciliacion/rutas.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(pinoHttp({ logger: registro }));
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use((req, res, next) => {
  if (
    requiereHttps({
      produccion: entorno.NODE_ENV === "production",
      conexionSegura: req.secure,
      ruta: req.path,
    })
  ) {
    res.status(426).json({
      error: {
        codigo: "HTTPS_REQUERIDO",
        mensaje: "La API solo acepta conexiones HTTPS.",
      },
    });
    return;
  }
  next();
});
app.use(
  "/api/v1",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        codigo: "LIMITE_SOLICITUDES",
        mensaje: "Se recibieron demasiadas solicitudes. Intente en un momento.",
      },
    },
  }),
);
// Los saldos, existencias y cortes cambian con cada operación. Nunca permita
// que navegador, proxy o CDN reutilicen una representación autenticada vieja.
app.use("/api/v1", (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  next();
});
app.use(
  cors({
    origin: entorno.FRONTEND_URL,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "Cache-Control",
      "Pragma",
    ],
  }),
);
app.use(express.json({ limit: "11mb" }));
app.use(cookieParser());
app.use(
  "/api/v1/auth/iniciar-sesion",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        codigo: "DEMASIADOS_INTENTOS",
        mensaje: "Espere antes de intentar nuevamente.",
      },
    },
  }),
);
app.use(protegerCsrf);

app.get("/salud", (_req, res) =>
  res.json({
    estado: "ok",
    servicio: "vektra-api",
    fecha: new Date().toISOString(),
  }),
);
app.get("/salud/listo", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({
    estado: "listo",
    baseDatos: "disponible",
    fecha: new Date().toISOString(),
  });
});
app.use("/api/v1/auth", rutasAutenticacion);
app.use("/api/v1/usuarios", rutasUsuarios);
app.use("/api/v1/clientes", rutasClientes);
app.use("/api/v1/localidades", rutasLocalidades);
app.use("/api/v1/rutas", rutasCobranza);
app.use("/api/v1/inventario", rutasInventario);
app.use("/api/v1/compras", rutasCompras);
app.use("/api/v1/proveedores", rutasProveedores);
app.use("/api/v1/ventas", rutasVentas);
app.use("/api/v1/abonos", rutasAbonos);
app.use("/api/v1/pedidos", rutasPedidos);
app.use("/api/v1/sincronizacion", rutasSincronizacion);
app.use("/api/v1/reportes", rutasReportes);
app.use("/api/v1/devoluciones", rutasDevoluciones);
app.use("/api/v1/cortes", rutasCortes);
app.use("/api/v1/importaciones", rutasImportaciones);
app.use("/api/v1/alertas", rutasAlertas);
app.use("/api/v1/auditoria", rutasAuditoria);
app.use("/api/v1/reconciliacion", rutasReconciliacion);
app.use(manejarNoEncontrado);
app.use(manejarError);
