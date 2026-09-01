import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  contextoLeccionMovil,
  leccionesMovilesParaRol,
  nivelCapacitacionMovil,
  puntosCapacitacionMovil,
  rutaCapacitacionMovilParaRol,
  type LeccionCapacitacionMovil,
} from "@/src/modulos/capacitacion/catalogo";
import { SimuladorCriticoMovil } from "@/src/modulos/capacitacion/simuladores/SimuladorCriticoMovil";
import { ReplicaPantallaOperativa } from "@/src/modulos/capacitacion/ReplicaPantallaOperativa";
import {
  distribucionCapacitacionMovil,
  porcentajeEtapaCapacitacion,
  siguienteLeccionPendiente,
} from "@/src/modulos/capacitacion/presentacion";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";

const clave = (usuarioId: string) => `nexo-capacitacion-${usuarioId}-v1`;

export default function CapacitacionMovil() {
  const { pantalla } = useLocalSearchParams<{ pantalla?: string }>();
  const { usuario, idioma } = usarSesion();
  const tema = usarTema();
  const insets = useSafeAreaInsets();
  const { width: anchoPantalla, fontScale } = useWindowDimensions();
  const distribucion = distribucionCapacitacionMovil(anchoPantalla);
  const lecturaAmpliada = anchoPantalla < 390 || fontScale >= 1.25;
  const es = idioma === "es";
  const [completadas, establecerCompletadas] = useState<string[]>([]);
  const [activa, establecerActiva] = useState<LeccionCapacitacionMovil | null>(
    null,
  );
  const [indice, establecerIndice] = useState(0);
  const [respuesta, establecerRespuesta] = useState<"BIEN" | null>(null);
  const [terminada, establecerTerminada] = useState(false);
  const [mostrarPreparacion, establecerMostrarPreparacion] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    SecureStore.getItemAsync(clave(usuario.id))
      .then((valor) => establecerCompletadas(valor ? JSON.parse(valor) : []))
      .catch(() => establecerCompletadas([]));
  }, [usuario]);

  const lecciones = useMemo(() => {
    if (!usuario) return [];
    const todas = leccionesMovilesParaRol(usuario.rol);
    return pantalla
      ? [...todas].sort(
          (a, b) =>
            Number(b.pantalla === pantalla) - Number(a.pantalla === pantalla),
        )
      : todas;
  }, [pantalla, usuario]);
  if (!usuario) return null;
  const usuarioId = usuario.id;
  const rutaAprendizaje = rutaCapacitacionMovilParaRol(usuario.rol);
  const contextoActivo = activa
    ? contextoLeccionMovil(usuario.rol, activa.id)
    : null;

  const puntos = puntosCapacitacionMovil(completadas);
  const nivel = nivelCapacitacionMovil(completadas);
  const leccionesPorId = new Map(
    lecciones.map((leccion) => [leccion.id, leccion]),
  );
  const ordenRuta = rutaAprendizaje.etapas.flatMap((etapa) => etapa.lecciones);
  const siguienteId = siguienteLeccionPendiente(completadas, ordenRuta);
  const siguiente = siguienteId ? leccionesPorId.get(siguienteId) : null;

  function abrir(leccion: LeccionCapacitacionMovil) {
    establecerActiva(leccion);
    establecerIndice(0);
    establecerRespuesta(null);
    establecerTerminada(false);
    establecerMostrarPreparacion(!completadas.includes(leccion.id));
  }
  async function completarActiva() {
    if (!activa) return;
    const nuevas = [...new Set([...completadas, activa.id])];
    establecerCompletadas(nuevas);
    await SecureStore.setItemAsync(clave(usuarioId), JSON.stringify(nuevas));
    establecerTerminada(true);
  }
  async function continuar() {
    if (!activa || respuesta !== "BIEN") return;
    if (indice < activa.pasos.length - 1) {
      establecerIndice((actual) => actual + 1);
      establecerRespuesta(null);
      return;
    }
    await completarActiva();
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[estilos.pagina, { backgroundColor: tema.fondo }]}
    >
      <KeyboardAvoidingView
        style={estilos.expandir}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            estilos.contenido,
            {
              paddingHorizontal: distribucion.margenHorizontal,
              paddingBottom: Math.max(insets.bottom, 18) + 24,
              maxWidth: distribucion.anchoMaximo,
            },
          ]}
        >
          <View
            style={[estilos.heroe, lecturaAmpliada && estilos.heroeCompacto]}
          >
            <Ionicons name="map" size={30} color="#fddc69" />
            <Text style={estilos.heroeTitulo}>
              {es
                ? "Tu jornada, en el orden correcto"
                : "Your day, in the correct order"}
            </Text>
            <Text style={estilos.heroeTexto}>
              {es
                ? "Primero revisa qué debes tener listo; después practica cada etapa en una pantalla simulada. No modifica la base de datos."
                : "First review what must be ready; then practice each stage on a simulated screen. It does not modify the database."}
            </Text>
            <View
              style={[
                estilos.metricas,
                lecturaAmpliada && estilos.metricasCompactas,
              ]}
            >
              <Text style={estilos.metrica}>
                {es ? "Nivel" : "Level"} {nivel}
              </Text>
              <Text style={estilos.metrica}>{puntos} XP</Text>
              <Text style={estilos.metrica}>
                {completadas.length}/{lecciones.length}
              </Text>
            </View>
            {siguiente && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  es
                    ? `Continuar con ${siguiente.titulo.es}`
                    : `Continue with ${siguiente.titulo.en}`
                }
                onPress={() => abrir(siguiente)}
                style={estilos.continuarRuta}
              >
                <View style={estilos.continuarIcono}>
                  <Ionicons name="play" size={17} color={colores.azulOscuro} />
                </View>
                <View style={estilos.expandir}>
                  <Text style={estilos.continuarEtiqueta}>
                    {es ? "CONTINUAR CAPACITACIÓN" : "CONTINUE TRAINING"}
                  </Text>
                  <Text style={estilos.continuarTitulo}>
                    {siguiente.titulo[idioma]}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={19} color="white" />
              </Pressable>
            )}
          </View>

          {!activa && (
            <View style={estilos.lista}>
              <Text style={[estilos.seccion, { color: tema.texto }]}>
                {rutaAprendizaje.titulo[idioma]}
              </Text>
              <View
                style={[
                  estilos.preparacion,
                  { backgroundColor: tema.panel, borderColor: tema.borde },
                ]}
              >
                <View style={estilos.preparacionTituloFila}>
                  <Ionicons name="clipboard" size={20} color={tema.primario} />
                  <Text
                    style={[estilos.preparacionTitulo, { color: tema.texto }]}
                  >
                    {es
                      ? "Antes de salir o capturar"
                      : "Before leaving or entering data"}
                  </Text>
                </View>
                {rutaAprendizaje.antesDeSalir.map(
                  (requisito, requisitoIndice) => (
                    <View key={requisito[idioma]} style={estilos.requisitoFila}>
                      <Text style={estilos.requisitoNumero}>
                        {requisitoIndice + 1}
                      </Text>
                      <Text
                        style={[estilos.requisitoTexto, { color: tema.texto }]}
                      >
                        {requisito[idioma]}
                      </Text>
                    </View>
                  ),
                )}
              </View>

              {rutaAprendizaje.etapas.map((etapa, etapaIndice) => {
                const leccionesEtapa = etapa.lecciones
                  .map((id) => leccionesPorId.get(id))
                  .filter(
                    (leccion): leccion is LeccionCapacitacionMovil =>
                      leccion !== undefined,
                  );
                if (leccionesEtapa.length === 0) return null;
                return (
                  <View key={etapa.id} style={estilos.etapa}>
                    <View style={estilos.etapaCabecera}>
                      <Text style={estilos.etapaNumero}>{etapaIndice + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[estilos.etapaTitulo, { color: tema.texto }]}
                        >
                          {etapa.titulo[idioma]}
                        </Text>
                        <Text
                          style={[
                            estilos.etapaNecesitas,
                            { color: tema.advertencia },
                          ]}
                        >
                          {es ? "ANTES: " : "FIRST: "}
                          {etapa.necesitas[idioma]}
                        </Text>
                        <View
                          accessibilityLabel={`${porcentajeEtapaCapacitacion(
                            completadas,
                            etapa.lecciones,
                          )}%`}
                          style={[
                            estilos.etapaProgreso,
                            {
                              backgroundColor: tema.campoDeshabilitado,
                            },
                          ]}
                        >
                          <View
                            style={[
                              estilos.etapaProgresoActivo,
                              {
                                width: `${porcentajeEtapaCapacitacion(
                                  completadas,
                                  etapa.lecciones,
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                    {leccionesEtapa.map((leccion, leccionIndice) => {
                      const completa = completadas.includes(leccion.id);
                      return (
                        <Pressable
                          key={leccion.id}
                          onPress={() => abrir(leccion)}
                          accessibilityRole="button"
                          accessibilityLabel={leccion.titulo[idioma]}
                          style={[
                            estilos.tarjeta,
                            lecturaAmpliada && estilos.tarjetaCompacta,
                            {
                              backgroundColor: tema.panel,
                              borderColor: tema.borde,
                            },
                          ]}
                        >
                          <View
                            style={[
                              estilos.icono,
                              { backgroundColor: tema.primarioSuave },
                            ]}
                          >
                            <Ionicons
                              name={completa ? "checkmark" : "school"}
                              size={22}
                              color={completa ? tema.exito : tema.primario}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                estilos.pantalla,
                                { color: tema.primario },
                              ]}
                            >
                              {es
                                ? `PASO ${leccionIndice + 1}`
                                : `STEP ${leccionIndice + 1}`}{" "}
                              · {leccion.pantalla.toUpperCase()}
                            </Text>
                            <Text
                              style={[
                                estilos.tarjetaTitulo,
                                { color: tema.texto },
                              ]}
                            >
                              {leccion.titulo[idioma]}
                            </Text>
                            <Text
                              style={[
                                estilos.tarjetaDetalle,
                                { color: tema.textoSecundario },
                              ]}
                            >
                              {es ? "DEBE QUEDAR: " : "RESULT: "}
                              {leccion.resultado[idioma]}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={tema.textoTenue}
                          />
                        </Pressable>
                      );
                    })}
                    <View
                      style={[
                        estilos.etapaResultado,
                        {
                          backgroundColor: tema.exitoSuave,
                        },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={17}
                        color={tema.exito}
                      />
                      <Text
                        style={[
                          estilos.etapaResultadoTexto,
                          { color: tema.exito },
                        ]}
                      >
                        {etapa.resultado[idioma]}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {activa && !terminada && mostrarPreparacion && (
            <View
              style={[
                estilos.mision,
                { backgroundColor: tema.panel, borderColor: tema.borde },
              ]}
            >
              <View style={estilos.misionCabecera}>
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.pantalla, { color: tema.primario }]}>
                    {contextoActivo
                      ? es
                        ? `ETAPA ${contextoActivo.indiceEtapa + 1} · PRÁCTICA ${contextoActivo.indiceLeccion + 1}`
                        : `STAGE ${contextoActivo.indiceEtapa + 1} · PRACTICE ${contextoActivo.indiceLeccion + 1}`
                      : es
                        ? "PRÁCTICA GUIADA"
                        : "GUIDED PRACTICE"}
                  </Text>
                  <Text style={[estilos.misionTitulo, { color: tema.texto }]}>
                    {activa.titulo[idioma]}
                  </Text>
                </View>
                <Pressable
                  onPress={() => establecerActiva(null)}
                  style={estilos.cerrar}
                  accessibilityRole="button"
                  accessibilityLabel={
                    es ? "Cerrar preparación" : "Close preparation"
                  }
                >
                  <Ionicons name="close" size={23} color={tema.texto} />
                </Pressable>
              </View>

              <View
                style={[
                  estilos.bloqueAntes,
                  {
                    backgroundColor: tema.advertenciaSuave,
                  },
                ]}
              >
                <Text
                  style={[
                    estilos.bloqueAntesEtiqueta,
                    { color: tema.advertencia },
                  ]}
                >
                  {es ? "ANTES NECESITAS" : "YOU NEED FIRST"}
                </Text>
                <Text style={[estilos.bloqueAntesTexto, { color: tema.texto }]}>
                  {contextoActivo
                    ? contextoActivo.etapa.necesitas[idioma]
                    : activa.resultado[idioma]}
                </Text>
              </View>
              <Text
                style={[estilos.preparacionSubtitulo, { color: tema.texto }]}
              >
                {es ? "Lo practicarás en este orden" : "Practice in this order"}
              </Text>
              {activa.pasos.map((paso, pasoIndice) => (
                <View key={paso.accion[idioma]} style={estilos.ordenFila}>
                  <Text
                    style={[
                      estilos.ordenNumero,
                      {
                        backgroundColor: tema.primarioSuave,
                        color: tema.primario,
                      },
                    ]}
                  >
                    {pasoIndice + 1}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[estilos.ordenAccion, { color: tema.texto }]}>
                      {paso.accion[idioma]}
                    </Text>
                    <Text
                      style={[
                        estilos.ordenDetalle,
                        { color: tema.textoSecundario },
                      ]}
                    >
                      {paso.instruccion[idioma]}
                    </Text>
                  </View>
                </View>
              ))}
              <View
                style={[
                  estilos.bloqueResultado,
                  { backgroundColor: tema.exitoSuave },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={tema.exito}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      estilos.bloqueResultadoEtiqueta,
                      { color: tema.exito },
                    ]}
                  >
                    {es ? "AL TERMINAR DEBE QUEDAR" : "EXPECTED RESULT"}
                  </Text>
                  <Text
                    style={[
                      estilos.bloqueResultadoTexto,
                      { color: tema.exito },
                    ]}
                  >
                    {activa.resultado[idioma]}
                  </Text>
                </View>
              </View>
              <Pressable
                style={[estilos.boton, { backgroundColor: tema.primario }]}
                onPress={() => establecerMostrarPreparacion(false)}
              >
                <Ionicons
                  name="play-circle"
                  size={20}
                  color={tema.sobrePrimario}
                />
                <Text
                  style={[estilos.botonTexto, { color: tema.sobrePrimario }]}
                >
                  {es
                    ? "Ya tengo lo necesario: comenzar"
                    : "I have what I need: start"}
                </Text>
              </Pressable>
            </View>
          )}

          {activa &&
            !terminada &&
            !mostrarPreparacion &&
            (activa.tipoSimulador ? (
              <View>
                <View style={estilos.accionesSimulador}>
                  <Text style={[estilos.decision, { color: tema.primario }]}>
                    {es ? "SIMULACIÓN PRÁCTICA" : "HANDS-ON SIMULATION"}
                  </Text>
                  <Pressable
                    onPress={() => establecerActiva(null)}
                    style={estilos.cerrar}
                    accessibilityRole="button"
                    accessibilityLabel={
                      es ? "Cerrar práctica" : "Close practice"
                    }
                  >
                    <Ionicons name="close" size={23} color={tema.texto} />
                  </Pressable>
                </View>
                <SimuladorCriticoMovil
                  key={activa.id}
                  tipo={activa.tipoSimulador}
                  idioma={idioma}
                  alCompletar={() => void completarActiva()}
                />
              </View>
            ) : (
              <View
                style={[
                  estilos.mision,
                  { backgroundColor: tema.panel, borderColor: tema.borde },
                ]}
              >
                <View style={estilos.misionCabecera}>
                  <View style={{ flex: 1 }}>
                    <Text style={[estilos.pantalla, { color: tema.primario }]}>
                      {es ? "RECORRIDO GUIADO" : "GUIDED WALKTHROUGH"}
                    </Text>
                    <Text style={[estilos.misionTitulo, { color: tema.texto }]}>
                      {activa.titulo[idioma]}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => establecerActiva(null)}
                    style={estilos.cerrar}
                    accessibilityRole="button"
                    accessibilityLabel={
                      es ? "Cerrar recorrido" : "Close walkthrough"
                    }
                  >
                    <Ionicons name="close" size={23} color={tema.texto} />
                  </Pressable>
                </View>
                <View
                  style={[
                    estilos.progreso,
                    { backgroundColor: tema.campoDeshabilitado },
                  ]}
                >
                  <View
                    style={[
                      estilos.progresoActivo,
                      {
                        width: `${((indice + 1) / activa.pasos.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[estilos.decision, { color: tema.primario }]}>
                  {es ? "PASO" : "STEP"} {indice + 1}/{activa.pasos.length}
                </Text>
                <Text style={[estilos.pregunta, { color: tema.texto }]}>
                  {activa.pasos[indice]!.instruccion[idioma]}
                </Text>
                <Text
                  style={[estilos.queHarias, { color: tema.textoSecundario }]}
                >
                  {es
                    ? "Pulsa el control azul dentro de la pantalla simulada."
                    : "Press the blue control inside the simulated screen."}
                </Text>
                <ReplicaPantallaOperativa
                  pantalla={activa.pantalla}
                  accion={activa.pasos[indice]!.accion[idioma]}
                  completado={respuesta === "BIEN"}
                  idioma={idioma}
                  alAccionar={() => establecerRespuesta("BIEN")}
                />
                {respuesta && (
                  <View
                    style={[
                      estilos.retro,
                      estilos.retroBien,
                      {
                        backgroundColor: tema.exitoSuave,
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={tema.exito}
                    />
                    <Text
                      style={[estilos.retroBienTexto, { color: tema.exito }]}
                    >
                      {activa.pasos[indice]!.explicacion[idioma]}
                    </Text>
                  </View>
                )}
                <Pressable
                  disabled={respuesta !== "BIEN"}
                  onPress={() => void continuar()}
                  style={[
                    estilos.boton,
                    { backgroundColor: tema.primario },
                    respuesta !== "BIEN" && estilos.deshabilitado,
                  ]}
                >
                  <Text
                    style={[estilos.botonTexto, { color: tema.sobrePrimario }]}
                  >
                    {indice === activa.pasos.length - 1
                      ? es
                        ? "Terminar recorrido"
                        : "Finish walkthrough"
                      : es
                        ? "Continuar recorrido"
                        : "Continue walkthrough"}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={tema.sobrePrimario}
                  />
                </Pressable>
              </View>
            ))}

          {activa && terminada && (
            <View
              style={[
                estilos.mision,
                estilos.final,
                { backgroundColor: tema.panel, borderColor: tema.borde },
              ]}
            >
              <Ionicons name="trophy" size={55} color="#f1c21b" />
              <Text style={[estilos.misionTitulo, { color: tema.texto }]}>
                {activa.tipoSimulador
                  ? es
                    ? "Simulación resuelta"
                    : "Simulation solved"
                  : es
                    ? "Recorrido guiado completado"
                    : "Guided walkthrough completed"}
              </Text>
              <Text
                style={[estilos.resultado, { color: tema.textoSecundario }]}
              >
                {activa.resultado[idioma]}
              </Text>
              <Text style={[estilos.xp, { color: tema.primario }]}>
                +100 XP
              </Text>
              <Pressable
                style={[estilos.boton, { backgroundColor: tema.primario }]}
                onPress={() => establecerActiva(null)}
              >
                <Text
                  style={[estilos.botonTexto, { color: tema.sobrePrimario }]}
                >
                  {es ? "Volver a recorridos" : "Back to walkthroughs"}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  expandir: { flex: 1 },
  contenido: {
    width: "100%",
    alignSelf: "center",
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroe: { borderRadius: 22, padding: 22, backgroundColor: colores.azulOscuro },
  heroeCompacto: { padding: 17, borderRadius: 18 },
  heroeTitulo: {
    color: "white",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 10,
  },
  heroeTexto: { color: "#d0e2ff", fontSize: 13, lineHeight: 20, marginTop: 8 },
  metricas: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  metricasCompactas: { alignItems: "stretch" },
  metrica: {
    color: "white",
    backgroundColor: "rgba(255,255,255,.14)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "800",
  },
  continuarRuta: {
    minHeight: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.25)",
    backgroundColor: "rgba(255,255,255,.12)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  continuarIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fddc69",
    alignItems: "center",
    justifyContent: "center",
  },
  continuarEtiqueta: {
    color: "#a6c8ff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  continuarTitulo: {
    color: "white",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  lista: { gap: 11 },
  seccion: { fontSize: 18, fontWeight: "900", marginTop: 24, marginBottom: 2 },
  preparacion: { borderWidth: 1, borderRadius: 17, padding: 16, gap: 11 },
  preparacionTituloFila: { flexDirection: "row", alignItems: "center", gap: 8 },
  preparacionTitulo: { fontSize: 15, fontWeight: "900", flex: 1 },
  requisitoFila: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requisitoNumero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: "center",
    paddingTop: 5,
    backgroundColor: colores.azul,
    color: "white",
    fontSize: 12,
    fontWeight: "900",
  },
  requisitoTexto: { flex: 1, fontSize: 13, lineHeight: 20 },
  etapa: { gap: 9, marginTop: 12 },
  etapaCabecera: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  etapaNumero: {
    width: 44,
    height: 44,
    borderRadius: 12,
    textAlign: "center",
    paddingTop: 11,
    backgroundColor: colores.azulOscuro,
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
  etapaTitulo: { fontSize: 17, fontWeight: "900" },
  etapaNecesitas: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  etapaProgreso: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 9,
  },
  etapaProgresoActivo: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colores.azul,
  },
  etapaResultado: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#defbe6",
  },
  etapaResultadoTexto: {
    color: "#0e6027",
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  tarjeta: {
    minHeight: 86,
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tarjetaCompacta: {
    alignItems: "flex-start",
    paddingHorizontal: 12,
    gap: 10,
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colores.azulClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  pantalla: {
    color: colores.azul,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tarjetaTitulo: { fontSize: 15, fontWeight: "800", marginTop: 3 },
  tarjetaDetalle: {
    color: colores.gris,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  mision: { marginTop: 18, borderWidth: 1, borderRadius: 20, padding: 18 },
  accionesSimulador: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  misionCabecera: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  misionTitulo: { fontSize: 21, fontWeight: "900", marginTop: 4 },
  bloqueAntes: {
    borderRadius: 14,
    backgroundColor: "#fff4ce",
    padding: 15,
    marginTop: 17,
  },
  bloqueAntesEtiqueta: { color: "#8a3800", fontSize: 12, fontWeight: "900" },
  bloqueAntesTexto: {
    color: "#3b2f00",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 6,
  },
  preparacionSubtitulo: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 19,
    marginBottom: 9,
  },
  ordenFila: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 11,
  },
  ordenNumero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: "center",
    paddingTop: 6,
    backgroundColor: colores.azulClaro,
    color: colores.azul,
    fontSize: 12,
    fontWeight: "900",
  },
  ordenAccion: { fontSize: 13, fontWeight: "800" },
  ordenDetalle: {
    color: colores.gris,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  bloqueResultado: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 13,
    backgroundColor: "#defbe6",
    padding: 14,
    marginTop: 5,
  },
  bloqueResultadoEtiqueta: {
    color: "#0e6027",
    fontSize: 12,
    fontWeight: "900",
  },
  bloqueResultadoTexto: {
    color: "#0e6027",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  cerrar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  progreso: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#dde1e6",
    marginTop: 18,
  },
  progresoActivo: { height: 7, backgroundColor: colores.azul },
  decision: {
    color: colores.azul,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 20,
  },
  pregunta: { fontSize: 18, fontWeight: "800", lineHeight: 25, marginTop: 7 },
  queHarias: {
    color: colores.gris,
    marginTop: 8,
    marginBottom: 13,
    fontSize: 12,
  },
  retro: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 5,
  },
  retroBien: { backgroundColor: "#defbe6" },
  retroBienTexto: { color: "#0e6027", flex: 1, fontSize: 12, lineHeight: 18 },
  boton: {
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: colores.azul,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 18,
  },
  botonTexto: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  deshabilitado: { opacity: 0.4 },
  final: { alignItems: "center", paddingVertical: 35 },
  resultado: {
    color: colores.gris,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 12,
  },
  xp: { color: colores.azul, fontSize: 18, fontWeight: "900", marginTop: 14 },
});
