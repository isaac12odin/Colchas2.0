import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colores, type usarTema } from "../../tema";
import type { ClienteJornada } from "../../tipos";
import { dinero } from "../../utilidades/formato";
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
  function confirmar() {
    const monto = Number(control.monto);
    Alert.alert(
      es ? "Confirma el abono" : "Confirm payment",
      `${cliente.nombreCompleto}\n${dinero.format(monto)} · ${control.metodo}`,
      [
        { text: es ? "Revisar" : "Review", style: "cancel" },
        {
          text: es ? "Confirmar" : "Confirm",
          onPress: () => control.alGuardar(monto),
        },
      ],
    );
  }

  return (
    <View>
      <Pressable onPress={control.alVolver} style={estilos.atras}>
        <Ionicons name="arrow-back" color={colores.azul} size={17} />
        <Text style={estilos.atrasTexto}>
          {es ? "Volver a acciones" : "Back to actions"}
        </Text>
      </Pressable>
      <Etiqueta>{es ? "Monto recibido" : "Amount received"}</Etiqueta>
      <View style={[estilos.montoCampo, { borderColor: tema.borde }]}>
        <Text style={[estilos.simbolo, { color: tema.texto }]}>$</Text>
        <TextInput
          autoFocus
          value={control.monto}
          onChangeText={control.alCambiarMonto}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colores.gris}
          style={[estilos.montoInput, { color: tema.texto }]}
        />
      </View>
      <Etiqueta>{es ? "Método" : "Method"}</Etiqueta>
      <View style={estilos.selector}>
        {(["EFECTIVO", "TRANSFERENCIA"] as const).map((opcion) => (
          <Metodo
            key={opcion}
            opcion={opcion}
            activo={control.metodo === opcion}
            es={es}
            tema={tema}
            alPulsar={() => control.alCambiarMetodo(opcion)}
          />
        ))}
      </View>
      {control.metodo === "TRANSFERENCIA" && (
        <>
          <Etiqueta>{es ? "Referencia" : "Reference"}</Etiqueta>
          <Campo
            valor={control.referencia}
            alCambiar={control.alCambiarReferencia}
            tema={tema}
          />
        </>
      )}
      <Etiqueta>{es ? "Nota opcional" : "Optional note"}</Etiqueta>
      <Campo
        valor={control.notas}
        alCambiar={control.alCambiarNotas}
        tema={tema}
        multilinea
      />
      <Pressable
        disabled={control.guardando}
        onPress={confirmar}
        style={[estilos.guardar, control.guardando && estilos.deshabilitado]}
      >
        {control.guardando ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="shield-checkmark" color="white" size={20} />
        )}
        <Text style={estilos.guardarTexto}>
          {control.guardando
            ? es
              ? "Protegiendo…"
              : "Securing…"
            : es
              ? "Guardar abono"
              : "Save payment"}
        </Text>
      </Pressable>
    </View>
  );
}

function Metodo({
  opcion,
  activo,
  es,
  tema,
  alPulsar,
}: {
  opcion: MetodoAbono;
  activo: boolean;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      onPress={alPulsar}
      style={[
        estilos.metodo,
        { borderColor: tema.borde },
        activo && estilos.metodoActivo,
      ]}
    >
      <Ionicons
        name={opcion === "EFECTIVO" ? "cash-outline" : "swap-horizontal"}
        color={activo ? "white" : colores.azul}
        size={18}
      />
      <Text style={activo ? estilos.metodoTextoActivo : { color: tema.texto }}>
        {opcion === "EFECTIVO"
          ? es
            ? "Efectivo"
            : "Cash"
          : es
            ? "Transferencia"
            : "Transfer"}
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
  multilinea = false,
}: {
  valor: string;
  alCambiar: (valor: string) => void;
  tema: ReturnType<typeof usarTema>;
  multilinea?: boolean;
}) {
  return (
    <TextInput
      value={valor}
      onChangeText={alCambiar}
      multiline={multilinea}
      style={[
        estilos.campo,
        multilinea && estilos.notas,
        { color: tema.texto, borderColor: tema.borde },
      ]}
    />
  );
}

const estilos = StyleSheet.create({
  atras: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 15 },
  atrasTexto: { color: colores.azul, fontWeight: "700", fontSize: 12 },
  etiqueta: {
    color: colores.gris,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 17,
    marginBottom: 7,
  },
  montoCampo: {
    height: 64,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  simbolo: { fontSize: 25, fontWeight: "800" },
  montoInput: {
    flex: 1,
    height: 62,
    fontSize: 28,
    fontWeight: "900",
    paddingHorizontal: 8,
  },
  selector: { flexDirection: "row", gap: 8 },
  metodo: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    height: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  metodoActivo: { backgroundColor: colores.azul, borderColor: colores.azul },
  metodoTextoActivo: { color: "white", fontWeight: "700" },
  campo: {
    borderWidth: 1,
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 11,
  },
  notas: { height: 62, paddingTop: 9, textAlignVertical: "top" },
  guardar: {
    backgroundColor: colores.azul,
    height: 53,
    borderRadius: 12,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  guardarTexto: { color: "white", fontWeight: "900", fontSize: 15 },
  deshabilitado: { opacity: 0.45 },
});
