import { beforeEach, describe, expect, it, vi } from "vitest";

const dobles = vi.hoisted(() => ({
  emitir: vi.fn(),
  agregar: vi.fn(),
  remover: vi.fn(),
}));

vi.mock("react-native", () => ({
  DeviceEventEmitter: {
    emit: dobles.emitir,
    addListener: dobles.agregar,
  },
}));

import {
  EVENTO_SESION_REVOCADA,
  notificarSesionRevocada,
  suscribirSesionRevocada,
} from "../src/eventosSesion";

describe("evento global de sesión revocada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dobles.agregar.mockReturnValue({ remove: dobles.remover });
  });

  it("publica una revocación con motivo y fecha sin tocar almacenamiento", () => {
    notificarSesionRevocada("REFRESCO_RECHAZADO");

    expect(dobles.emitir).toHaveBeenCalledOnce();
    expect(dobles.emitir).toHaveBeenCalledWith(
      EVENTO_SESION_REVOCADA,
      expect.objectContaining({
        motivo: "REFRESCO_RECHAZADO",
        ocurridoEn: expect.any(Number),
      }),
    );
  });

  it("expone una suscripción desmontable para ProveedorSesion", () => {
    const atender = vi.fn();
    const cancelar = suscribirSesionRevocada(atender);

    expect(dobles.agregar).toHaveBeenCalledWith(
      EVENTO_SESION_REVOCADA,
      atender,
    );
    cancelar();
    expect(dobles.remover).toHaveBeenCalledOnce();
  });
});
