import { describe, expect, it, vi } from "vitest";

import {
  confirmarSesionSegura,
  type EstadoSesionPersistida,
  type PuertoSesionSegura,
} from "../src/seguridad/transaccionSesion";

interface UsuarioPrueba {
  id: string;
}

const anterior: EstadoSesionPersistida = {
  accessToken: "access-anterior",
  refreshToken: "refresh-anterior",
  usuarioLocal: '{"id":"anterior"}',
  usuarioIdLocal: "anterior",
};

function crearPuerto(): PuertoSesionSegura<UsuarioPrueba> & {
  eventos: string[];
} {
  const eventos: string[] = [];
  return {
    eventos,
    validarVinculacion: vi.fn(async () => {
      eventos.push("validar");
    }),
    leerEstado: vi.fn(async () => {
      eventos.push("leer");
      return anterior;
    }),
    guardarTokens: vi.fn(async () => {
      eventos.push("tokens");
    }),
    guardarIdentidad: vi.fn(async () => {
      eventos.push("identidad");
    }),
    prepararIntegridad: vi.fn(async () => {
      eventos.push("integridad");
    }),
    restaurarEstado: vi.fn(async () => {
      eventos.push("rollback");
    }),
  };
}

const nueva = {
  usuario: { id: "nuevo" },
  accessToken: "access-nuevo",
  refreshToken: "refresh-nuevo",
};

describe("persistencia transaccional de sesión móvil", () => {
  it("valida la vinculación antes de escribir tokens", async () => {
    const puerto = crearPuerto();
    puerto.validarVinculacion = vi.fn(async () => {
      puerto.eventos.push("validar");
      throw new Error("equipo vinculado a otro usuario");
    });
    await expect(confirmarSesionSegura(nueva, puerto)).rejects.toThrow(
      "otro usuario",
    );
    expect(puerto.eventos).toEqual(["validar"]);
    expect(puerto.guardarTokens).not.toHaveBeenCalled();
  });

  it("restaura la sesión anterior si falla guardar la identidad", async () => {
    const puerto = crearPuerto();
    puerto.guardarIdentidad = vi.fn(async () => {
      puerto.eventos.push("identidad");
      throw new Error("SecureStore no disponible");
    });
    await expect(confirmarSesionSegura(nueva, puerto)).rejects.toThrow(
      "SecureStore",
    );
    expect(puerto.eventos).toEqual([
      "validar",
      "leer",
      "tokens",
      "identidad",
      "rollback",
    ]);
    expect(puerto.restaurarEstado).toHaveBeenCalledWith(anterior);
  });

  it("restaura tokens e identidad si falla el enrolamiento", async () => {
    const puerto = crearPuerto();
    puerto.prepararIntegridad = vi.fn(async () => {
      puerto.eventos.push("integridad");
      throw new Error("dispositivo revocado");
    });
    await expect(confirmarSesionSegura(nueva, puerto)).rejects.toThrow(
      "revocado",
    );
    expect(puerto.eventos.at(-1)).toBe("rollback");
    expect(puerto.restaurarEstado).toHaveBeenCalledOnce();
  });

  it("confirma en orden y no ejecuta rollback cuando todo funciona", async () => {
    const puerto = crearPuerto();
    await confirmarSesionSegura(nueva, puerto);
    expect(puerto.eventos).toEqual([
      "validar",
      "leer",
      "tokens",
      "identidad",
      "integridad",
    ]);
    expect(puerto.restaurarEstado).not.toHaveBeenCalled();
  });
});
