import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  fechaSugeridaEntregaPractica,
  validarAbonoPractica,
  validarDevolucionPractica,
  validarEntregaPractica,
  validarSincronizacionPractica,
  validarVentaCreditoPractica,
} from "../src/modulos/capacitacion/simuladores/dominio";

const fechaFutura = fechaSugeridaEntregaPractica();

describe("simuladores críticos de capacitación móvil", () => {
  it("rechaza una venta a crédito sin clienta", () => {
    expect(
      validarVentaCreditoPractica({
        cliente: "",
        producto: "colcha",
        cantidad: 1,
        anticipo: 200,
        tarjeta: "0042",
        cuota: 250,
        periodicidad: "SEMANAL",
        vencimiento: fechaFutura,
      }).correcta,
    ).toBe(false);
  });

  it("resuelve una venta con clienta, producto, anticipo y plan coherentes", () => {
    expect(
      validarVentaCreditoPractica({
        cliente: "ana",
        producto: "colcha",
        cantidad: 1,
        anticipo: 200,
        tarjeta: "0042",
        cuota: 250,
        periodicidad: "SEMANAL",
        vencimiento: fechaFutura,
      }).correcta,
    ).toBe(true);
  });

  it("rechaza un abono superior al saldo", () => {
    expect(
      validarAbonoPractica({
        cliente: "ana",
        monto: 801,
        metodo: "EFECTIVO",
        referencia: "",
      }).correcta,
    ).toBe(false);
  });

  it("acepta un abono que conserva método y referencia", () => {
    expect(
      validarAbonoPractica({
        cliente: "ana",
        monto: 300,
        metodo: "TRANSFERENCIA",
        referencia: "TRX-1024",
      }).correcta,
    ).toBe(true);
  });

  it("rechaza una entrega de contado con cobro parcial", () => {
    expect(
      validarEntregaPractica({
        tipo: "CONTADO",
        anticipo: 500,
        tarjeta: "",
        cuota: 0,
        periodicidad: "",
        primerVencimiento: "",
      }).correcta,
    ).toBe(false);
  });

  it("acepta una entrega a crédito con deuda calculable", () => {
    expect(
      validarEntregaPractica({
        tipo: "CREDITO",
        anticipo: 200,
        tarjeta: "0042",
        cuota: 200,
        periodicidad: "SEMANAL",
        primerVencimiento: fechaFutura,
      }).correcta,
    ).toBe(true);
  });

  it("sugiere un vencimiento dinámico y rechaza fechas pasadas", () => {
    const hoy = new Date(2030, 4, 10, 12);
    expect(fechaSugeridaEntregaPractica(7, hoy)).toBe("2030-05-17");
    expect(
      validarEntregaPractica(
        {
          tipo: "CREDITO",
          anticipo: 200,
          tarjeta: "0042",
          cuota: 200,
          periodicidad: "SEMANAL",
          primerVencimiento: "2030-05-09",
        },
        hoy,
      ),
    ).toMatchObject({
      correcta: false,
      mensaje: { es: expect.stringContaining("pasada") },
    });
  });

  it("rechaza que Almacén autorice una devolución", () => {
    expect(
      validarDevolucionPractica({
        cantidad: 2,
        motivo: "Costura abierta al entregar",
        evidencia: true,
        autorizador: "ALMACENISTA",
        operadorCaja: "COBRADOR",
      }).correcta,
    ).toBe(false);
  });

  it("separa autorizador y caja en una devolución correcta", () => {
    expect(
      validarDevolucionPractica({
        cantidad: 2,
        motivo: "Costura abierta al entregar",
        evidencia: true,
        autorizador: "CONTABLE",
        operadorCaja: "COBRADOR",
      }).correcta,
    ).toBe(true);
  });

  it("rechaza forzar una venta con conflicto de inventario", () => {
    expect(validarSincronizacionPractica(true, "FORZAR").correcta).toBe(false);
  });

  it("conserva folio y evidencia al resolver el conflicto", () => {
    expect(validarSincronizacionPractica(true, "REVISAR").correcta).toBe(true);
  });

  it("mantiene las réplicas aisladas de red y base de datos", () => {
    const fuente = readFileSync(
      fileURLToPath(
        new URL(
          "../src/modulos/capacitacion/simuladores/SimuladorCriticoMovil.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(fuente).not.toContain("/api/");
    expect(fuente).not.toContain("fetch(");
    expect(fuente).not.toContain("usarApi");
    expect(fuente).not.toContain("DATABASE_URL");
    expect(fuente).not.toContain('primerVencimiento="2026-');
  });

  it("conserva el texto numérico mientras la persona captura", () => {
    const fuente = readFileSync(
      fileURLToPath(
        new URL(
          "../src/modulos/capacitacion/simuladores/SimuladorCriticoMovil.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(fuente).toContain("monto={montoCapturado}");
    expect(fuente).toContain("anticipo={captura.anticipo}");
    expect(fuente).not.toContain("valor={String(valor.monto)}");
  });

  it("reutiliza los formularios que la persona encontrará en operación", () => {
    const simulador = readFileSync(
      fileURLToPath(
        new URL(
          "../src/modulos/capacitacion/simuladores/SimuladorCriticoMovil.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    const replica = readFileSync(
      fileURLToPath(
        new URL(
          "../src/modulos/capacitacion/ReplicaPantallaOperativa.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );

    expect(simulador).toContain("<FormularioAbono");
    expect(simulador).toContain("<ConfiguracionVenta");
    expect(replica).toContain("<TarjetaClienteJornada");
    expect(replica).toContain("<TarjetaPedido");
    expect(replica).toContain("<TarjetaProductoMovil");
    expect(replica).toContain("<BotonMovil");
    expect(replica).not.toContain('pantalla === "devoluciones"');
    expect(replica).not.toContain("/api/");
    expect(replica).not.toContain("fetch(");
  });

  it("elimina la maqueta de rectángulos y protege formularios del teclado", () => {
    const pantalla = readFileSync(
      fileURLToPath(new URL("../app/(app)/capacitacion.tsx", import.meta.url)),
      "utf8",
    );
    expect(pantalla).toContain("<ReplicaPantallaOperativa");
    expect(pantalla).not.toContain("esqueletoCampo");
    expect(pantalla).toContain("<KeyboardAvoidingView");
    expect(pantalla).toContain('keyboardShouldPersistTaps="handled"');
    expect(pantalla).toContain("automaticallyAdjustKeyboardInsets");
    expect(pantalla).toContain("useWindowDimensions");
  });

  it("aplica superficies específicas para claro y oscuro en las prácticas", () => {
    const simulador = readFileSync(
      fileURLToPath(
        new URL(
          "../src/modulos/capacitacion/simuladores/SimuladorCriticoMovil.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    const pantalla = readFileSync(
      fileURLToPath(new URL("../app/(app)/capacitacion.tsx", import.meta.url)),
      "utf8",
    );
    expect(simulador).toContain("tema.primario");
    expect(simulador).toContain("tema.exitoSuave");
    expect(simulador).toContain("tema.peligroSuave");
    expect(simulador).toContain("<CampoMovil");
    expect(simulador).toContain("<BotonMovil");
    expect(pantalla).toContain("tema.advertenciaSuave");
    expect(pantalla).toContain("tema.exitoSuave");
    expect(pantalla).toContain("tema.textoSecundario");
  });
});
