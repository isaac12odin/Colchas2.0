import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t, todosLosRoles } from "./definirLeccion";

export const movilOrientacion: LeccionCapacitacionMovil = {
  id: "movil-orientacion",
  pantalla: "inicio",
  roles: todosLosRoles,
  titulo: t("Conoce tu aplicación", "Know your app"),
  resultado: t(
    "Entras directamente al trabajo permitido para tu puesto.",
    "You go directly to work allowed for your role.",
  ),
  pasos: [
    p(
      "Acabas de iniciar sesión.",
      "Revisar mi rol y estado de conexión",
      "Las tarjetas visibles cambian según tus responsabilidades.",
      "You just signed in.",
      "Review my role and connection status",
      "Visible cards change according to your responsibilities.",
    ),
    p(
      "Necesitas empezar una tarea.",
      "Elegir la tarjeta con el resultado que buscas",
      "La pantalla inicial evita menús profundos.",
      "You need to start a task.",
      "Choose the card matching your desired result",
      "Home avoids deep menus.",
    ),
    p(
      "Ves trabajo pendiente de sincronizar.",
      "Conservarlo y abrir Sincronización cuando haya señal",
      "Los pendientes están cifrados y asociados a tu usuario.",
      "You see work pending synchronization.",
      "Keep it and open Synchronization when online",
      "Pending work is encrypted and tied to your user.",
    ),
  ],
};
