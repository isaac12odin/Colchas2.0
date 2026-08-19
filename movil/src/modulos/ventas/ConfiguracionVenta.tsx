import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colores, type usarTema } from "../../tema";
import type { Periodicidad, TipoVenta } from "./dominioVenta";

interface Propiedades {
  tipo: TipoVenta;
  montoTotal: number;
  anticipo: string;
  periodicidad: Periodicidad;
  cuota: string;
  primerVencimiento: string;
  numeroTarjeta: string;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCambiarTipo: (valor: TipoVenta) => void;
  alCambiarAnticipo: (valor: string) => void;
  alCambiarPeriodicidad: (valor: Periodicidad) => void;
  alCambiarCuota: (valor: string) => void;
  alCambiarVencimiento: (valor: string) => void;
  alCambiarNumeroTarjeta: (valor: string) => void;
}

export function ConfiguracionVenta({ es, tema, ...control }: Propiedades) {
  const saldoNuevo =
    control.tipo === "CREDITO"
      ? Math.max(0, control.montoTotal - Number(control.anticipo || 0))
      : 0;
  const requiereFinanciamiento = saldoNuevo > 0;
  return (
    <View
      style={[
        estilos.panel,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <Text style={[estilos.subtitulo, { color: tema.texto }]}>
        {es ? "Forma de venta" : "Sale type"}
      </Text>
      <View style={estilos.selector}>
        {(["CREDITO", "CONTADO"] as const).map((opcion) => (
          <Opcion
            key={opcion}
            texto={
              opcion === "CREDITO"
                ? es
                  ? "Crédito"
                  : "Credit"
                : es
                  ? "Contado"
                  : "Cash"
            }
            activa={control.tipo === opcion}
            tema={tema}
            alPulsar={() => control.alCambiarTipo(opcion)}
          />
        ))}
      </View>
      {control.tipo === "CREDITO" && (
        <>
          {requiereFinanciamiento && (
            <>
              <Etiqueta>
                {es
                  ? "Número de tarjeta asignado por ti"
                  : "Card number assigned by you"}
              </Etiqueta>
              <Campo
                valor={control.numeroTarjeta}
                alCambiar={control.alCambiarNumeroTarjeta}
                tema={tema}
                placeholder={es ? "Ej. 0042" : "E.g. 0042"}
              />
            </>
          )}
          <Etiqueta>{es ? "Anticipo en efectivo" : "Cash deposit"}</Etiqueta>
          <Campo
            valor={control.anticipo}
            alCambiar={control.alCambiarAnticipo}
            tema={tema}
            numerico
          />
          <Text style={estilos.saldo}>
            {es ? "Saldo a financiar" : "Balance to finance"}: ${" "}
            {saldoNuevo.toFixed(2)}
          </Text>
          {requiereFinanciamiento && (
            <>
              <Etiqueta>{es ? "Periodicidad" : "Frequency"}</Etiqueta>
              <View style={estilos.selector}>
                {(["SEMANAL", "QUINCENAL", "MENSUAL"] as const).map(
                  (opcion) => (
                    <Opcion
                      key={opcion}
                      texto={opcion}
                      activa={control.periodicidad === opcion}
                      compacta
                      tema={tema}
                      alPulsar={() => control.alCambiarPeriodicidad(opcion)}
                    />
                  ),
                )}
              </View>
              <View style={estilos.dosCampos}>
                <View style={estilos.expandir}>
                  <Etiqueta>{es ? "Cuota" : "Installment"}</Etiqueta>
                  <Campo
                    valor={control.cuota}
                    alCambiar={control.alCambiarCuota}
                    tema={tema}
                    numerico
                    placeholder="250"
                  />
                </View>
                <View style={estilos.vencimiento}>
                  <Etiqueta>
                    {es ? "Primer vencimiento" : "First due date"}
                  </Etiqueta>
                  <Campo
                    valor={control.primerVencimiento}
                    alCambiar={control.alCambiarVencimiento}
                    tema={tema}
                    placeholder="AAAA-MM-DD"
                  />
                </View>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

function Opcion({
  texto,
  activa,
  compacta,
  tema,
  alPulsar,
}: {
  texto: string;
  activa: boolean;
  compacta?: boolean;
  tema: ReturnType<typeof usarTema>;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      onPress={alPulsar}
      style={[
        compacta ? estilos.opcionChica : estilos.opcion,
        activa && estilos.activa,
      ]}
    >
      <Text
        style={
          activa
            ? estilos.textoActivo
            : compacta
              ? estilos.textoChico
              : { color: tema.texto }
        }
      >
        {texto}
      </Text>
    </Pressable>
  );
}

function Etiqueta({ children }: { children: string }) {
  return <Text style={estilos.etiqueta}>{children}</Text>;
}

function Campo({
  valor,
  alCambiar,
  tema,
  numerico,
  placeholder,
}: {
  valor: string;
  alCambiar: (valor: string) => void;
  tema: ReturnType<typeof usarTema>;
  numerico?: boolean;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={valor}
      onChangeText={alCambiar}
      keyboardType={numerico ? "decimal-pad" : "default"}
      placeholder={placeholder}
      placeholderTextColor={colores.gris}
      style={[estilos.campo, { borderColor: tema.borde, color: tema.texto }]}
    />
  );
}

const estilos = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 14, padding: 15, marginTop: 16 },
  subtitulo: { fontSize: 16, fontWeight: "800" },
  selector: { flexDirection: "row", gap: 7, marginTop: 10 },
  opcion: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    padding: 11,
    alignItems: "center",
  },
  opcionChica: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
  },
  activa: { backgroundColor: colores.azul, borderColor: colores.azul },
  textoActivo: { color: "white", fontWeight: "800", fontSize: 12 },
  textoChico: { color: colores.gris, fontWeight: "700", fontSize: 9 },
  etiqueta: {
    color: colores.gris,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
  },
  campo: {
    borderWidth: 1,
    borderRadius: 10,
    height: 45,
    paddingHorizontal: 11,
  },
  saldo: {
    color: colores.azul,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
  },
  dosCampos: { flexDirection: "row", gap: 9 },
  expandir: { flex: 1 },
  vencimiento: { flex: 1.35 },
});
