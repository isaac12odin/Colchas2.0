import { definirLeccionMovil, pasoMovil } from "./definirLeccion";

export const movilOffline = definirLeccionMovil({
  id: "movil-offline",
  pantalla: "sincronizacion",
  roles: ["ADMINISTRADOR", "COBRADOR"],
  titulo: ["Trabajar sin señal y sincronizar", "Work offline and synchronize"],
  objetivo: [
    "Guardar abonos, visitas, ventas y entregas localmente sin duplicarlas.",
    "Save payments, visits, sales, and deliveries locally without duplicates.",
  ],
  resultado: [
    "Operaciones cifradas se confirman al volver la conexión y los conflictos quedan visibles.",
    "Encrypted operations are confirmed when connectivity returns, with visible conflicts.",
  ],
  responsable: ["Administración · Cobranza", "Administration · Collections"],
  tipoSimulador: "SINCRONIZACION_CORRECCION",
  pasos: [
    pasoMovil(
      ["La ruta pierde señal.", "The route loses signal."],
      [
        "Continuar desde la jornada descargada",
        "Continue from the downloaded workday",
      ],
      [
        "Los datos autorizados se guardaron para ese usuario y equipo.",
        "Authorized data was saved for that user and device.",
      ],
    ),
    pasoMovil(
      ["Registras un movimiento.", "You record a movement."],
      [
        "Confirmar una vez y conservar el folio local",
        "Confirm once and keep the local receipt",
      ],
      [
        "La bitácora cifrada e idempotente evita duplicarlo al reintentar.",
        "The encrypted idempotent log prevents duplication on retry.",
      ],
    ),
    pasoMovil(
      ["Regresa internet.", "Connectivity returns."],
      [
        "Abrir Sincronización y confirmar pendientes",
        "Open Synchronization and confirm pending operations",
      ],
      [
        "No se borra un pendiente hasta que el servidor lo acepta o muestra un conflicto.",
        "A pending item is not removed until the server accepts it or shows a conflict.",
      ],
    ),
  ],
});
