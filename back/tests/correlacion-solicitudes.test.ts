import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { entorno } from "../src/configuracion/entorno.js";

describe("correlación segura de solicitudes", () => {
  it("conserva un identificador válido y lo expone al navegador", async () => {
    const identificador = "web-prueba-12345678";
    const respuesta = await request(app)
      .get("/salud")
      .set("Origin", entorno.FRONTEND_URL)
      .set("X-Request-Id", identificador)
      .expect(200);

    expect(respuesta.headers["x-request-id"]).toBe(identificador);
    expect(respuesta.headers["access-control-expose-headers"]).toContain(
      "X-Request-Id",
    );
  });

  it("no refleja valores inválidos enviados como identificador", async () => {
    const respuesta = await request(app)
      .get("/salud")
      .set("X-Request-Id", "corto")
      .expect(200);

    expect(respuesta.headers["x-request-id"]).not.toBe("corto");
  });
});
