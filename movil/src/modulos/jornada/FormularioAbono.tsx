import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  BotonMovil,
  CampoMovil,
  SelectorSegmentado,
  TarjetaMovil,
} from "../../componentes/ui";
import { type usarTema } from "../../tema";
import type { ClienteJornada } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import { parsearDineroCapturado } from "../../utilidades/dinero";
import type { MetodoAbono } from "./dominioJornada";

interface Propiedades {
  cliente: ClienteJornada;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  monto: string;
  metodo: MetodoAbono;
  referencia: string;
  notas: string;
  guardando: boolean;
  alCambiarMonto: (valor: string) => void;
  alCambiarMetodo: (valor: MetodoAbono) => void;
  alCambiarReferencia: (valor: string) => void;
  alCambiarNotas: (valor: string) => void;
  alVolver: () => void;
  alGuardar: (monto: number) => void;
}

export function FormularioAbono({
  cliente,
  es,
  tema,
  ...control
}: Propiedades) {
  const saldoActual = Number(cliente.saldo?.saldoActual ?? 0);
  const montoNumero = parsearDineroCapturado(control.monto);
  const montoValido =
    montoNumero !== null && montoNumero > 0 && montoNumero <= saldoActual;
  const saldoRestante = Math.max(
    0,
    saldoActual - (montoValido ? montoNumero : 0),
  );
  const requiereReferencia = control.metodo !== "EFECTIVO";

  return (
    <View style={estilos.contenido}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={es ? "Volver a acciones" : "Back to actions"}
        onPress={control.alVolver}
        style={estilos.atras}
      >
        <Ionicons name="arrow-back" color={tema.primario} size={19} />
        <Text style={[estilos.atrasTexto, { color: tema.primario }]}>
          {es ? "Volver" : "Back"}
        </Text>
      </Pressable>

      <View>
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {es ? "Registrar abono" : "Record payment"}
        </Text>
        <Text style={[estilos.identidad, { color: tema.textoSecundario }]}>
          {cliente.telefono} ·{" "}
          {cliente.numeroTarjeta
            ? `${es ? "Tarjeta" : "Card"} ${cliente.numeroTarjeta}`
            : es
              ? "Sin tarjeta"
              : "No card"}
        </Text>
      </View>

      <CampoMovil
        etiqueta={es ? "Monto recibido" : "Amount received"}
        valor={control.monto}
        alCambiar={control.alCambiarMonto}
        teclado="decimal-pad"
        placeholder="0.00"
        icono="cash-outline"
        ayuda={
          !control.monto || montoValido
            ? es
              ? `Máximo ${dinero.format(saldoActual)}`
              : `Maximum ${dinero.format(saldoActual)}`
            : undefined
        }
        error={
          control.monto && !montoValido
            ? es
              ? "El monto debe ser mayor a cero y no superar el saldo."
              : "Amount must be greater than zero and not exceed the balance."
            : undefined
        }
        autoFocus
        requerido
      />

      <TarjetaMovil estilo={estilos.saldos}>
        <Saldo
          etiqueta={es ? "Saldo actual" : "Current balance"}
          valor={dinero.format(saldoActual)}
          tema={tema}
        />
        <Ionicons name="arrow-forward" color={tema.textoTenue} size={21} />
        <Saldo
          etiqueta={es ? "Quedará en" : "Remaining"}
          valor={dinero.format(saldoRestante)}
          tema={tema}
          destacado
        />
      </TarjetaMovil>

      <SelectorSegmentado
        etiqueta={es ? "Método recibido" : "Payment method"}
        valor={control.metodo}
        alCambiar={control.alCambiarMetodo}
        opciones={[
          { valor: "EFECTIVO", texto: es ? "Efectivo" : "Cash" },
          { valor: "TRANSFERENCIA", texto: es ? "Transfer." : "Transfer" },
          { valor: "TARJETA", texto: es ? "Tarjeta" : "Card" },
          { valor: "OTRO", texto: es ? "Otro" : "Other" },
        ]}
      />
      {requiereReferencia ? (
        <CampoMovil
          etiqueta={es ? "Referencia (opcional)" : "Reference (optional)"}
          valor={control.referencia}
          alCambiar={control.alCambiarReferencia}
          placeholder={
            control.metodo === "TRANSFERENCIA"
              ? es
                ? "Folio o últimos dígitos"
                : "Receipt or last digits"
              : es
                ? "Dato para identificar el pago"
                : "Payment identifier"
          }
          icono="document-text-outline"
        />
      ) : null}
      <CampoMovil
        etiqueta={es ? "Nota (opcional)" : "Note (optional)"}
        valor={control.notas}
        alCambiar={control.alCambiarNotas}
        multilinea
        maxLength={500}
        placeholder={es ? "Observaciones de la visita" : "Visit notes"}
      />

      <BotonMovil
        texto={
          montoValido
            ? es
              ? `Confirmar abono de ${dinero.format(montoNumero ?? 0)}`
              : `Confirm ${dinero.format(montoNumero ?? 0)} payment`
            : es
              ? "Escribe un monto válido"
              : "Enter a valid amount"
        }
        icono="shield-checkmark"
        cargando={control.guardando}
        deshabilitado={!montoValido}
        alPulsar={() => {
          if (montoNumero !== null) control.alGuardar(montoNumero);
        }}
      />
    </View>
  );
}

function Saldo({
  etiqueta,
  valor,
  tema,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  tema: ReturnType<typeof usarTema>;
  destacado?: boolean;
}) {
  return (
    <View style={estilos.saldoBloque}>
      <Text style={[estilos.saldoEtiqueta, { color: tema.textoSecundario }]}>
        {etiqueta}
      </Text>
      <Text
        style={[
          estilos.saldoValor,
          { color: destacado ? tema.primario : tema.texto },
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 17 },
  atras: {
    minHeight: 40,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  atrasTexto: { fontWeight: "800", fontSize: 13 },
  titulo: { fontSize: 21, lineHeight: 27, fontWeight: "900" },
  identidad: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  saldos: { flexDirection: "row", alignItems: "center", gap: 8, padding: 13 },
  saldoBloque: { flex: 1 },
  saldoEtiqueta: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
  saldoValor: { fontSize: 17, lineHeight: 23, fontWeight: "900", marginTop: 2 },
});
