import type { Rol } from "../../../tipos";

import type { PasoCapacitacionMovil, TextoCapacitacionMovil } from "../tipos";

export const todosLosRoles: readonly Rol[] = [
  "ADMINISTRADOR",
  "CONTABLE",
  "VENDEDOR",
  "ALMACENISTA",
  "COBRADOR",
];

export const t = (es: string, en: string): TextoCapacitacionMovil => ({
  es,
  en,
});

export const p = (
  instruccionEs: string,
  accionEs: string,
  explicacionEs: string,
  instruccionEn: string,
  accionEn: string,
  explicacionEn: string,
): PasoCapacitacionMovil => ({
  instruccion: t(instruccionEs, instruccionEn),
  accion: t(accionEs, accionEn),
  explicacion: t(explicacionEs, explicacionEn),
});
