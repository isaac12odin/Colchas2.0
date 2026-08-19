import { pino } from "pino";
import { entorno } from "../configuracion/entorno.js";

export const registro = pino({
  level:
    entorno.NODE_ENV === "production"
      ? "info"
      : entorno.NODE_ENV === "test"
        ? "silent"
        : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.contrasena",
      "*.hashContrasena",
      "*.telefonoCifrado",
      "*.direccionCifrada",
      "*.token",
    ],
    censor: "[PROTEGIDO]",
  },
});
