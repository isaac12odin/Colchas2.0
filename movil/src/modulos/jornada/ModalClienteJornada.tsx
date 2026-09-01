import { StyleSheet, Text } from "react-native";

import {
  EstadoMovil,
  HojaFormulario,
  TarjetaMovil,
} from "../../componentes/ui";
import { type usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";
import type { ControlJornada } from "./usarJornadaRuta";
import { AccionesCliente } from "./AccionesCliente";
import { FormularioAbono } from "./FormularioAbono";

interface Propiedades {
  control: ControlJornada;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alVender: () => void;
  alEntregar: () => void;
}

export function ModalClienteJornada({
  control,
  es,
  tema,
  alVender,
  alEntregar,
}: Propiedades) {
  const cliente = control.cliente;
  const identidad = cliente
    ? [
        cliente.telefono,
        cliente.numeroTarjeta
          ? `${es ? "Tarjeta" : "Card"} ${cliente.numeroTarjeta}`
          : null,
        cliente.direccion,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <HojaFormulario
      visible={Boolean(cliente)}
      titulo={cliente?.nombreCompleto ?? ""}
      subtitulo={identidad}
      alCerrar={control.cerrarCliente}
      bloqueada={control.guardando}
      estiloContenido={estilos.contenido}
    >
      <TarjetaMovil estilo={estilos.saldoTarjeta}>
        <Text style={[estilos.saldoEtiqueta, { color: tema.textoSecundario }]}>
          {es ? "SALDO ACTUAL" : "CURRENT BALANCE"}
        </Text>
        <Text style={[estilos.saldoValor, { color: tema.primario }]}>
          {dinero.format(Number(cliente?.saldo?.saldoActual ?? 0))}
        </Text>
      </TarjetaMovil>

      {cliente?.fueraDeRuta ? (
        <EstadoMovil
          tipo="informacion"
          texto={
            es
              ? "Cobranza fuera de ruta: la visita quedará identificada en auditoría."
              : "Outside-route collection: this visit will be identified in the audit trail."
          }
        />
      ) : null}

      {cliente && control.modo === "ACCIONES" ? (
        <AccionesCliente
          cliente={cliente}
          es={es}
          tema={tema}
          guardando={control.guardando}
          alCobrar={control.mostrarCobro}
          alVender={alVender}
          alEntregar={alEntregar}
          alNoPagar={() => control.confirmarResultado("NO_PAGO")}
          alAusente={() => control.confirmarResultado("AUSENTE")}
        />
      ) : null}
      {cliente && control.modo === "COBRO" ? (
        <FormularioAbono
          cliente={cliente}
          es={es}
          tema={tema}
          monto={control.monto}
          metodo={control.metodo}
          referencia={control.referencia}
          notas={control.notas}
          guardando={control.guardando}
          alCambiarMonto={control.establecerMonto}
          alCambiarMetodo={control.establecerMetodo}
          alCambiarReferencia={control.establecerReferencia}
          alCambiarNotas={control.establecerNotas}
          alVolver={control.mostrarAcciones}
          alGuardar={(monto) => void control.guardarVisita("PAGO", monto)}
        />
      ) : null}
    </HojaFormulario>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 16 },
  saldoTarjeta: { gap: 3, paddingVertical: 13 },
  saldoEtiqueta: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  saldoValor: { fontSize: 25, lineHeight: 31, fontWeight: "900" },
});
