/**
 * Fachada estable del almacenamiento offline.
 * La UI desconoce SQLCipher, tablas, migraciones y la cadena de integridad.
 */
export {
  guardarCache,
  guardarJornada,
  leerCache,
  leerJornada,
  type ProyeccionLocal,
} from "./repositorios/datosLocales";
export {
  contarOperaciones,
  encolarOperaciones,
  leerHistorialOperaciones,
  leerOperaciones,
  marcarEnviando,
  obtenerDispositivoId,
  obtenerEstadoCola,
  registrarFalloTransporte,
  registrarResultados,
  verificarIntegridadOperaciones,
  type EstadoOperacion,
  type OperacionGuardada,
  type OperacionLocal,
  type TipoOperacion,
} from "./repositorios/operacionesLocal";
