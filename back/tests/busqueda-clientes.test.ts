import { describe, expect, it } from "vitest";

import {
  coincideCliente,
  normalizarBusqueda,
} from "../src/modulos/clientes/busqueda.js";

const cliente = {
  nombreCompleto: "María López",
  telefono: "2221234567",
  direccion: "Avenida Reforma 125, Colonia Centro",
  numeroTarjeta: "T-0042",
  localidad: { nombre: "San Andrés", estado: "Puebla" },
};

describe("búsqueda de clientes", () => {
  it("ignora mayúsculas y acentos", () => {
    expect(normalizarBusqueda("  María Álvarez ")).toBe("maria alvarez");
  });

  it("encuentra por nombre, teléfono, dirección, tarjeta y localidad", () => {
    for (const termino of [
      "maria",
      "1234567",
      "reforma 125",
      "t 0042",
      "san andres",
    ]) {
      expect(coincideCliente(cliente, termino)).toBe(true);
    }
  });
});
