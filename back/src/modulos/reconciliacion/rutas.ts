import { Router } from "express";

import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { reconciliarProyecciones } from "./servicio.js";

export const rutasReconciliacion = Router();
rutasReconciliacion.use(
  autenticar,
  permitirPermiso("RECONCILIACION_CONSULTAR"),
);

rutasReconciliacion.get("/", async (_req, res) => {
  res.json(await reconciliarProyecciones());
});
