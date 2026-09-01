import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { BotonMovil } from "../../../componentes/ui";
import { usarTema } from "../../../tema";
import { Dato, PanelAccion } from "./componentesReplica";
import type { ControlPractica, IdiomaReplica } from "./dominioReplica";
import { estilosReplica as estilos } from "./estilosReplica";

interface PanelCuentaProps {
  idioma: IdiomaReplica;
  control: ControlPractica;
  acertar: () => void;
  fallar: () => void;
}

export function PanelInicio({
  idioma,
  control,
  acertar,
  fallar,
}: PanelCuentaProps) {
  const tema = usarTema();
  const es = idioma === "es";
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={control === "INICIO_ESTADO" ? acertar : fallar}
        style={estilos.filaTitulo}
      >
        <View style={estilos.expandir}>
          <Text style={[estilos.titulo, { color: tema.texto }]}>Hola, Ana</Text>
          <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
            {es ? "COBRADOR · EN LÍNEA" : "COLLECTOR · ONLINE"}
          </Text>
        </View>
        <Ionicons name="cloud-done" size={24} color={tema.exito} />
      </Pressable>
      <View style={estilos.rejilla}>
        <TarjetaInicio
          icono="map"
          titulo={es ? "Mi ruta" : "My route"}
          detalle={es ? "12 clientes" : "12 customers"}
          alPulsar={control === "INICIO_RUTA" ? acertar : fallar}
        />
        <TarjetaInicio
          icono="cloud-upload"
          titulo={es ? "Sincronizar" : "Sync"}
          detalle={es ? "2 pendientes" : "2 pending"}
          alPulsar={control === "INICIO_SINCRONIZAR" ? acertar : fallar}
        />
      </View>
    </>
  );
}

function TarjetaInicio({
  icono,
  titulo,
  detalle,
  alPulsar,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalle: string;
  alPulsar: () => void;
}) {
  const tema = usarTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      onPress={alPulsar}
      style={({ pressed }) => [
        estilos.tarjetaInicio,
        {
          backgroundColor: tema.panel,
          borderColor: tema.borde,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <Ionicons name={icono} size={22} color={tema.primario} />
      <Text style={[estilos.tarjetaInicioTitulo, { color: tema.texto }]}>
        {titulo}
      </Text>
      <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
        {detalle}
      </Text>
    </Pressable>
  );
}

export function PanelPerfil({
  idioma,
  control,
  acertar,
  fallar,
}: PanelCuentaProps) {
  const tema = usarTema();
  const es = idioma === "es";
  return (
    <>
      <Text style={[estilos.titulo, { color: tema.texto }]}>
        {es ? "Seguridad de la cuenta" : "Account security"}
      </Text>
      <PanelAccion tema={tema}>
        <Dato etiqueta={es ? "Usuario" : "User"} valor="ana@vektra.mx" />
        <Dato
          etiqueta={es ? "Rol" : "Role"}
          valor={es ? "Cobrador" : "Collector"}
        />
        <BotonMovil
          texto={es ? "Cambiar contraseña" : "Change password"}
          alPulsar={control === "PERFIL_CONTRASENA" ? acertar : fallar}
          icono="lock-closed"
          variante="secundario"
        />
        <BotonMovil
          texto={es ? "Cerrar sesión" : "Sign out"}
          alPulsar={control === "PERFIL_CERRAR_SESION" ? acertar : fallar}
          icono="log-out-outline"
          variante="secundario"
        />
        <BotonMovil
          texto={
            es
              ? "Reportar equipo y revocar sesión"
              : "Report device and revoke session"
          }
          alPulsar={control === "PERFIL_REVOCAR" ? acertar : fallar}
          icono="phone-portrait-outline"
          variante="peligro"
        />
      </PanelAccion>
    </>
  );
}
