import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t, todosLosRoles } from "./definirLeccion";

export const movilSeguridad: LeccionCapacitacionMovil = {
  id: "movil-seguridad",
  pantalla: "perfil",
  roles: todosLosRoles,
  titulo: t("Proteger cuenta y equipo", "Protect account and device"),
  resultado: t(
    "Sesión vinculada al usuario correcto y clave personal segura.",
    "Session bound to the correct user with a secure personal password.",
  ),
  pasos: [
    p(
      "Necesitas actualizar tu contraseña.",
      "Abrir Perfil y elegir Cambiar contraseña",
      "Usa al menos 6 caracteres y vuelve a iniciar sesión.",
      "You need to update your password.",
      "Open Profile and choose Change password",
      "Use at least 6 characters and sign in again.",
    ),
    p(
      "Compartirán físicamente el teléfono.",
      "Cerrar sesión y validar la nueva identidad",
      "Las operaciones offline se aíslan por usuario.",
      "The phone will be physically shared.",
      "Sign out and validate the new identity",
      "Offline operations are isolated per user.",
    ),
    p(
      "El teléfono se pierde.",
      "Reportarlo y revocar la sesión",
      "El almacenamiento cifrado ayuda, pero la revocación corta el acceso futuro.",
      "The phone is lost.",
      "Report it and revoke the session",
      "Encrypted storage helps, but revocation stops future access.",
    ),
  ],
};
