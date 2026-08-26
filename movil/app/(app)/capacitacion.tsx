import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  contextoLeccionMovil,
  leccionesMovilesParaRol,
  nivelCapacitacionMovil,
  puntosCapacitacionMovil,
  rutaCapacitacionMovilParaRol,
  type LeccionCapacitacionMovil,
} from "@/src/modulos/capacitacion/catalogo";
import { SimuladorCriticoMovil } from "@/src/modulos/capacitacion/simuladores/SimuladorCriticoMovil";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";

const clave = (usuarioId: string) => `nexo-capacitacion-${usuarioId}-v1`;

export default function CapacitacionMovil() {
  const { pantalla } = useLocalSearchParams<{ pantalla?: string }>();
  const { usuario, idioma } = usarSesion();
  const tema = usarTema();
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

  function abrir(leccion: LeccionCapacitacionMovil) {
    establecerActiva(leccion);
    establecerIndice(0);
    establecerRespuesta(null);
    establecerTerminada(false);
    establecerMostrarPreparacion(true);
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
    <SafeAreaView style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.heroe}>
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
          <View style={estilos.metricas}>
            <Text style={estilos.metrica}>
              {es ? "Nivel" : "Level"} {nivel}
            </Text>
            <Text style={estilos.metrica}>{puntos} XP</Text>
            <Text style={estilos.metrica}>
              {completadas.length}/{lecciones.length}
            </Text>
          </View>
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
                <Ionicons name="clipboard" size={20} color={colores.azul} />
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
                      <Text style={estilos.etapaNecesitas}>
                        {es ? "ANTES: " : "FIRST: "}
                        {etapa.necesitas[idioma]}
                      </Text>
                    </View>
                  </View>
                  {leccionesEtapa.map((leccion, leccionIndice) => {
                    const completa = completadas.includes(leccion.id);
                    return (
                      <Pressable
                        key={leccion.id}
                        onPress={() => abrir(leccion)}
                        style={[
                          estilos.tarjeta,
                          {
                            backgroundColor: tema.panel,
                            borderColor: tema.borde,
                          },
                        ]}
                      >
                        <View style={estilos.icono}>
                          <Ionicons
                            name={completa ? "checkmark" : "school"}
                            size={22}
                            color={completa ? colores.verde : colores.azul}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={estilos.pantalla}>
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
                          <Text style={estilos.tarjetaDetalle}>
                            {es ? "DEBE QUEDAR: " : "RESULT: "}
                            {leccion.resultado[idioma]}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colores.gris}
                        />
                      </Pressable>
                    );
                  })}
                  <View style={estilos.etapaResultado}>
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={colores.verde}
                    />
                    <Text style={estilos.etapaResultadoTexto}>
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
                <Text style={estilos.pantalla}>
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
              >
                <Ionicons name="close" size={23} color={tema.texto} />
              </Pressable>
            </View>

            <View style={estilos.bloqueAntes}>
              <Text style={estilos.bloqueAntesEtiqueta}>
                {es ? "ANTES NECESITAS" : "YOU NEED FIRST"}
              </Text>
              <Text style={estilos.bloqueAntesTexto}>
                {contextoActivo
                  ? contextoActivo.etapa.necesitas[idioma]
                  : activa.resultado[idioma]}
              </Text>
            </View>
            <Text style={[estilos.preparacionSubtitulo, { color: tema.texto }]}>
              {es ? "Lo practicarás en este orden" : "Practice in this order"}
            </Text>
            {activa.pasos.map((paso, pasoIndice) => (
              <View key={paso.accion[idioma]} style={estilos.ordenFila}>
                <Text style={estilos.ordenNumero}>{pasoIndice + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.ordenAccion, { color: tema.texto }]}>
                    {paso.accion[idioma]}
                  </Text>
                  <Text style={estilos.ordenDetalle}>
                    {paso.instruccion[idioma]}
                  </Text>
                </View>
              </View>
            ))}
            <View style={estilos.bloqueResultado}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colores.verde}
              />
              <View style={{ flex: 1 }}>
                <Text style={estilos.bloqueResultadoEtiqueta}>
                  {es ? "AL TERMINAR DEBE QUEDAR" : "EXPECTED RESULT"}
                </Text>
                <Text style={estilos.bloqueResultadoTexto}>
                  {activa.resultado[idioma]}
                </Text>
              </View>
            </View>
            <Pressable
              style={estilos.boton}
              onPress={() => establecerMostrarPreparacion(false)}
            >
              <Ionicons name="play-circle" size={19} color="white" />
              <Text style={estilos.botonTexto}>
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
                <Text style={estilos.decision}>
                  {es ? "SIMULACIÓN PRÁCTICA" : "HANDS-ON SIMULATION"}
                </Text>
                <Pressable
                  onPress={() => establecerActiva(null)}
                  style={estilos.cerrar}
                  accessibilityLabel={es ? "Cerrar práctica" : "Close practice"}
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
                  <Text style={estilos.pantalla}>
                    {es ? "RECORRIDO GUIADO" : "GUIDED WALKTHROUGH"}
                  </Text>
                  <Text style={[estilos.misionTitulo, { color: tema.texto }]}>
                    {activa.titulo[idioma]}
                  </Text>
                </View>
                <Pressable
                  onPress={() => establecerActiva(null)}
                  style={estilos.cerrar}
                >
                  <Ionicons name="close" size={23} color={tema.texto} />
                </Pressable>
              </View>
              <View style={estilos.progreso}>
                <View
                  style={[
                    estilos.progresoActivo,
                    { width: `${((indice + 1) / activa.pasos.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={estilos.decision}>
                {es ? "PASO" : "STEP"} {indice + 1}/{activa.pasos.length}
              </Text>
              <Text style={[estilos.pregunta, { color: tema.texto }]}>
                {activa.pasos[indice]!.instruccion[idioma]}
              </Text>
              <Text style={estilos.queHarias}>
                {es
                  ? "Pulsa el control azul dentro de la pantalla simulada."
                  : "Press the blue control inside the simulated screen."}
              </Text>
              <View style={estilos.telefono}>
                <View style={estilos.telefonoBarra}>
                  <Text style={estilos.telefonoMarca}>Vektra</Text>
                  <Text style={estilos.telefonoPantalla}>
                    {activa.pantalla.toUpperCase()}
                  </Text>
                </View>
                <View style={estilos.telefonoContenido}>
                  <View style={estilos.esqueletoTitulo} />
                  <View style={estilos.esqueletoCampo} />
                  <View style={estilos.esqueletoCampo} />
                  <Text style={estilos.controlEtiqueta}>
                    {es ? "CONTROL SEÑALADO" : "HIGHLIGHTED CONTROL"}
                  </Text>
                  <Pressable
                    disabled={respuesta === "BIEN"}
                    onPress={() => establecerRespuesta("BIEN")}
                    style={[
                      estilos.controlGuiado,
                      respuesta === "BIEN" && estilos.controlCompletado,
                    ]}
                  >
                    <Ionicons
                      name={
                        respuesta === "BIEN"
                          ? "checkmark-circle"
                          : "finger-print"
                      }
                      size={20}
                      color="white"
                    />
                    <Text style={estilos.controlTexto}>
                      {activa.pasos[indice]!.accion[idioma]}
                    </Text>
                  </Pressable>
                </View>
              </View>
              {respuesta && (
                <View style={[estilos.retro, estilos.retroBien]}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colores.verde}
                  />
                  <Text style={estilos.retroBienTexto}>
                    {activa.pasos[indice]!.explicacion[idioma]}
                  </Text>
                </View>
              )}
              <Pressable
                disabled={respuesta !== "BIEN"}
                onPress={() => void continuar()}
                style={[
                  estilos.boton,
                  respuesta !== "BIEN" && estilos.deshabilitado,
                ]}
              >
                <Text style={estilos.botonTexto}>
                  {indice === activa.pasos.length - 1
                    ? es
                      ? "Terminar recorrido"
                      : "Finish walkthrough"
                    : es
                      ? "Continuar recorrido"
                      : "Continue walkthrough"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
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
            <Text style={estilos.resultado}>{activa.resultado[idioma]}</Text>
            <Text style={estilos.xp}>+100 XP</Text>
            <Pressable
              style={estilos.boton}
              onPress={() => establecerActiva(null)}
            >
              <Text style={estilos.botonTexto}>
                {es ? "Volver a recorridos" : "Back to walkthroughs"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  contenido: { padding: 16, paddingBottom: 40 },
  heroe: { borderRadius: 22, padding: 22, backgroundColor: colores.azulOscuro },
  heroeTitulo: {
    color: "white",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 10,
  },
  heroeTexto: { color: "#d0e2ff", fontSize: 13, lineHeight: 20, marginTop: 8 },
  metricas: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  metrica: {
    color: "white",
    backgroundColor: "rgba(255,255,255,.14)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "800",
  },
  lista: { gap: 11 },
  seccion: { fontSize: 18, fontWeight: "900", marginTop: 24, marginBottom: 2 },
  preparacion: { borderWidth: 1, borderRadius: 17, padding: 16, gap: 11 },
  preparacionTituloFila: { flexDirection: "row", alignItems: "center", gap: 8 },
  preparacionTitulo: { fontSize: 15, fontWeight: "900", flex: 1 },
  requisitoFila: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requisitoNumero: {
    width: 23,
    height: 23,
    borderRadius: 12,
    textAlign: "center",
    paddingTop: 3,
    backgroundColor: colores.azul,
    color: "white",
    fontSize: 10,
    fontWeight: "900",
  },
  requisitoTexto: { flex: 1, fontSize: 12, lineHeight: 18 },
  etapa: { gap: 9, marginTop: 12 },
  etapaCabecera: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  etapaNumero: {
    width: 36,
    height: 36,
    borderRadius: 12,
    textAlign: "center",
    paddingTop: 7,
    backgroundColor: colores.azulOscuro,
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
  etapaTitulo: { fontSize: 17, fontWeight: "900" },
  etapaNecesitas: {
    color: "#8a5a00",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
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
    fontSize: 11,
    lineHeight: 16,
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
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tarjetaTitulo: { fontSize: 15, fontWeight: "800", marginTop: 3 },
  tarjetaDetalle: { color: colores.gris, fontSize: 11, marginTop: 4 },
  mision: { marginTop: 18, borderWidth: 1, borderRadius: 20, padding: 18 },
  accionesSimulador: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  misionCabecera: { flexDirection: "row", gap: 10 },
  misionTitulo: { fontSize: 21, fontWeight: "900", marginTop: 4 },
  bloqueAntes: {
    borderRadius: 14,
    backgroundColor: "#fff4ce",
    padding: 15,
    marginTop: 17,
  },
  bloqueAntesEtiqueta: { color: "#8a3800", fontSize: 9, fontWeight: "900" },
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
    width: 25,
    height: 25,
    borderRadius: 13,
    textAlign: "center",
    paddingTop: 4,
    backgroundColor: colores.azulClaro,
    color: colores.azul,
    fontSize: 10,
    fontWeight: "900",
  },
  ordenAccion: { fontSize: 13, fontWeight: "800" },
  ordenDetalle: {
    color: colores.gris,
    fontSize: 11,
    lineHeight: 16,
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
  bloqueResultadoEtiqueta: { color: "#0e6027", fontSize: 9, fontWeight: "900" },
  bloqueResultadoTexto: {
    color: "#0e6027",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  cerrar: {
    width: 42,
    height: 42,
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
    fontSize: 10,
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
  telefono: {
    borderWidth: 1,
    borderColor: "#a8a8a8",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#f4f7fb",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  telefonoBarra: {
    minHeight: 48,
    paddingHorizontal: 15,
    backgroundColor: colores.azulOscuro,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  telefonoMarca: { color: "white", fontSize: 15, fontWeight: "900" },
  telefonoPantalla: { color: "#d0e2ff", fontSize: 9, fontWeight: "900" },
  telefonoContenido: { minHeight: 245, padding: 16, justifyContent: "center" },
  esqueletoTitulo: {
    width: "58%",
    height: 13,
    borderRadius: 7,
    backgroundColor: "#c6c6c6",
    marginBottom: 16,
  },
  esqueletoCampo: {
    height: 38,
    borderRadius: 9,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#dde1e6",
    marginBottom: 9,
  },
  controlEtiqueta: {
    color: colores.azul,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 7,
  },
  controlGuiado: {
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: colores.azul,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderWidth: 4,
    borderColor: "#a6c8ff",
  },
  controlCompletado: { backgroundColor: colores.verde, borderColor: "#a7f0ba" },
  controlTexto: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    flexShrink: 1,
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
  botonTexto: { color: "white", fontWeight: "900" },
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
