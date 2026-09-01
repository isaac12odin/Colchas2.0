import { describe, expect, it } from "vitest";

import { ErrorApi, esFalloRealRed } from "../src/erroresApi";
import {
  puedeUsarCacheOperativa,
  resolverProyeccionPendiente,
} from "../src/utilidades/cacheOperativa";

describe("política de caché con movimientos offline", () => {
  it("conserva incluso una lista principal vacía si fue guardada explícitamente", () => {
    expect(puedeUsarCacheOperativa(2, [])).toBe(true);
  });

  it("no confunde una caché auxiliar con el recurso principal ausente", () => {
    const cacheAuxiliar = [{ id: "catalogo" }];
    const cachePrincipal = undefined;

    expect(cacheAuxiliar).toHaveLength(1);
    expect(puedeUsarCacheOperativa(2, cachePrincipal)).toBe(false);
  });

  it("sin cola pendiente debe volver a consultar el servidor", () => {
    expect(puedeUsarCacheOperativa(0, [{ id: "ruta" }])).toBe(false);
  });

  it("sólo clasifica estado cero como fallo real de red", () => {
    expect(esFalloRealRed(new ErrorApi("sin red", 0))).toBe(true);
    expect(esFalloRealRed(new ErrorApi("sin sesión", 401))).toBe(false);
    expect(esFalloRealRed(new ErrorApi("prohibido", 403))).toBe(false);
    expect(esFalloRealRed(new ErrorApi("servidor", 503))).toBe(false);
    expect(esFalloRealRed(new Error("error local"))).toBe(false);
  });

  it("revalida la sesión antes de mostrar una proyección pendiente conectada", async () => {
    let validaciones = 0;
    const datos = [{ id: "ruta-proyectada" }];
    const resultado = await resolverProyeccionPendiente({
      pendientes: 2,
      cachePrincipal: datos,
      revalidarSesion: async () => {
        validaciones += 1;
      },
    });

    expect(validaciones).toBe(1);
    expect(resultado).toEqual({ usar: true, datos, offline: false });
  });

  it("habilita la copia pendiente únicamente si la revalidación falla por red", async () => {
    const datos = [{ id: "ruta-proyectada" }];
    await expect(
      resolverProyeccionPendiente({
        pendientes: 1,
        cachePrincipal: datos,
        revalidarSesion: async () => {
          throw new ErrorApi("sin red", 0);
        },
      }),
    ).resolves.toEqual({ usar: true, datos, offline: true });
  });

  it.each([401, 403, 500, 503])(
    "un HTTP %s bloquea la caché y conserva el rechazo",
    async (estado) => {
      const rechazo = new ErrorApi(`HTTP ${estado}`, estado);
      await expect(
        resolverProyeccionPendiente({
          pendientes: 1,
          cachePrincipal: [{ id: "dato-anterior" }],
          revalidarSesion: async () => {
            throw rechazo;
          },
        }),
      ).rejects.toBe(rechazo);
    },
  );

  it("sin caché principal no consulta ni confunde catálogos auxiliares", async () => {
    let validaciones = 0;
    const resultado = await resolverProyeccionPendiente({
      pendientes: 3,
      cachePrincipal: undefined,
      revalidarSesion: async () => {
        validaciones += 1;
      },
    });

    expect(resultado).toEqual({ usar: false });
    expect(validaciones).toBe(0);
  });
});
