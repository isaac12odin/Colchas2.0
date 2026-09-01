import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import type { Rol } from "../../tipos";
import type { usarTema } from "../../tema";

const pasosPorRol: Partial<Record<Rol, string[]>> = {
  COBRADOR: [
    "Revisa Agenda de cobranza: ahí ves cuántas clientas pagan hoy, esta semana y cuáles están atrasadas.",
    "Abre Rutas con internet antes de salir para guardar clientas, saldos, productos y direcciones en el teléfono.",
    "Dentro de la ruta toca una clienta. Vektra muestra saldo, monto a cobrar hoy, vencido y próximo pago.",
    "Elige Pagó, No pagó o Ausente. Si pagó, captura monto y método; después guarda una sola vez.",
    "Al terminar abre Sincronización. No cierres la jornada hasta que marque cero pendientes.",
  ],
  ALMACENISTA: [
    "En Inventario busca primero por nombre, agrupación, QR o código de barras para evitar duplicados.",
    "Toca Nuevo, toma una foto, elige Colcha/Sábana/u otra agrupación y escribe nombre y marca.",
    "Pulsa el botón de escáner junto a Código de barras o QR; centra la etiqueta y el dato se llena solo.",
    "Captura costo, precio, existencia inicial y mínimo. Revisa el resumen y toca Crear producto.",
    "En Pedidos atiende primero los pendientes de proveedor; al recibir mercancía confirma cantidades y déjala lista para entrega.",
  ],
  ADMINISTRADOR: [
    "Revisa la agenda y las alertas antes de modificar operación.",
    "Usa Inventario para crear agrupaciones y productos; usa Rutas para asignar cartera.",
    "Las cuentas de Cobranza y Almacén trabajan sólo en esta aplicación móvil.",
    "Desde la web puedes cambiar la contraseña de cualquier usuario y cerrar sus sesiones.",
  ],
};

export function GuiaRapidaRolMovil({
  rol,
  tema,
  es,
}: {
  rol: Rol;
  tema: ReturnType<typeof usarTema>;
  es: boolean;
}) {
  const pasos = pasosPorRol[rol];
  if (!pasos) return null;
  return (
    <View
      style={[
        estilos.contenedor,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <View style={estilos.encabezado}>
        <Ionicons name="list-circle" size={24} color={tema.primario} />
        <View style={estilos.flex}>
          <Text style={[estilos.titulo, { color: tema.texto }]}>
            Cómo trabajar hoy
          </Text>
          <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
            Pasos para {rol.toLowerCase()}
          </Text>
        </View>
      </View>
      {pasos.map((paso, indice) => (
        <View key={paso} style={estilos.paso}>
          <View
            style={[estilos.numero, { backgroundColor: tema.primarioSuave }]}
          >
            <Text style={[estilos.numeroTexto, { color: tema.primario }]}>
              {indice + 1}
            </Text>
          </View>
          <Text style={[estilos.pasoTexto, { color: tema.texto }]}>{paso}</Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 2,
  },
  flex: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: "900" },
  detalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  paso: {
    flexDirection: "row",
    gap: 11,
    alignItems: "flex-start",
    minHeight: 48,
    paddingVertical: 5,
  },
  numero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  numeroTexto: { fontSize: 13, fontWeight: "900" },
  pasoTexto: { flex: 1, fontSize: 13, lineHeight: 20, paddingTop: 3 },
});
