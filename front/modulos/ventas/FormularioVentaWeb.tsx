"use client";

import { MensajeError } from "@/componentes/ui";
import { ConfirmacionVenta } from "./formulario/ConfirmacionVenta";
import { IndicadorPasosVenta } from "./formulario/IndicadorPasosVenta";
import { PasoCobroVenta } from "./formulario/PasoCobroVenta";
import { PasoProductosVenta } from "./formulario/PasoProductosVenta";
import { PasoTipoVenta } from "./formulario/PasoTipoVenta";
import { usarFormularioVenta } from "./formulario/usarFormularioVenta";
import type { NuevaVentaWeb, ResultadoVentaWeb } from "./tipos";

export function FormularioVentaWeb({
  es,
  guardando,
  resultado,
  error,
  puedeAutorizarDescuento,
  alCancelar,
  alNuevaVenta,
  alEnviar,
}: {
  es: boolean;
  guardando: boolean;
  resultado: ResultadoVentaWeb | null;
  error: string;
  puedeAutorizarDescuento: boolean;
  alCancelar: () => void;
  alNuevaVenta: () => void;
  alEnviar: (venta: NuevaVentaWeb) => Promise<ResultadoVentaWeb>;
}) {
  const control = usarFormularioVenta({
    puedeAutorizarDescuento,
    alEnviar,
    alNuevaVenta,
  });

  if (resultado)
    return (
      <ConfirmacionVenta
        es={es}
        resultado={resultado}
        alCerrar={alCancelar}
        alNuevaVenta={control.reiniciar}
      />
    );

  return (
    <form onSubmit={control.enviar} data-capacitacion="ventas.nueva.formulario">
      <IndicadorPasosVenta paso={control.paso} es={es} />
      {error && <MensajeError mensaje={error} />}

      {control.paso === 1 && (
        <PasoTipoVenta es={es} alElegir={control.elegirTipo} />
      )}
      {control.paso === 2 && (
        <PasoProductosVenta
          es={es}
          esCredito={control.esCredito}
          cliente={control.cliente}
          productoElegido={control.productoElegido}
          lineas={control.lineas}
          subtotal={control.subtotal}
          puedeContinuar={control.puedeContinuar}
          alCambiarCliente={control.establecerCliente}
          alAgregarProducto={control.agregarProducto}
          alCambiarCantidad={control.cambiarCantidad}
          alAtras={control.irAlTipo}
          alContinuar={control.irAlResumen}
        />
      )}
      {control.paso === 3 && (
        <PasoCobroVenta
          es={es}
          esCredito={control.esCredito}
          puedeAutorizarDescuento={puedeAutorizarDescuento}
          guardando={guardando}
          pagoValido={control.pagoValido}
          subtotal={control.subtotal}
          piezas={control.lineas.reduce(
            (total, linea) => total + linea.cantidad,
            0,
          )}
          total={control.total}
          financiado={control.financiado}
          saldoAnterior={control.saldoAnterior}
          acuerdoVigente={control.acuerdoVigente}
          valores={control.valores}
          cambiar={control.cambiar}
          alAtras={control.irAProductos}
        />
      )}
    </form>
  );
}
