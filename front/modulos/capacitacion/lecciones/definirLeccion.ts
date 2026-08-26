import type { Rol } from "@/lib/tipos";

import type {
  EventoPasoAtomico,
  LeccionCapacitacion,
  PasoAtomicoCapacitacion,
  PasoCapacitacion,
  PlataformaCapacitacion,
  TextoCapacitacion,
  TipoSimuladorCapacitacion,
} from "../tipos";

type TextoBilingue = readonly [es: string, en: string];

export interface LeccionCapacitacionDefinida extends LeccionCapacitacion {
  guion: readonly PasoAtomicoCapacitacion[];
}

interface DatosComunes {
  id: string;
  pantalla: string;
  roles: readonly Rol[];
  titulo: TextoBilingue;
  objetivo: TextoBilingue;
  resultado: TextoBilingue;
  responsable: TextoBilingue;
  tipoSimulador?: TipoSimuladorCapacitacion;
}

interface DatosWeb extends DatosComunes {
  rutaReal: string;
  guion: readonly PasoAtomicoCapacitacion[];
}

interface DatosMovil extends DatosComunes {
  pasos: readonly PasoCapacitacion[];
}

function texto([es, en]: TextoBilingue): TextoCapacitacion {
  return { es, en };
}

function base(
  datos: DatosComunes,
  plataforma: PlataformaCapacitacion,
): Omit<LeccionCapacitacion, "pasos"> {
  return {
    id: datos.id,
    pantalla: datos.pantalla,
    plataforma,
    roles: datos.roles,
    titulo: texto(datos.titulo),
    objetivo: texto(datos.objetivo),
    resultado: texto(datos.resultado),
    responsable: texto(datos.responsable),
    ...(datos.tipoSimulador ? { tipoSimulador: datos.tipoSimulador } : {}),
  };
}

/** La tarjeta web y su recorrido real viven juntos en el mismo archivo. */
export function definirLeccionWeb(
  datos: DatosWeb,
): LeccionCapacitacionDefinida {
  return {
    ...base(datos, "WEB"),
    rutaReal: datos.rutaReal,
    pasos: datos.guion.map((paso) => ({
      instruccion: paso.antesDeActuar,
      accion: paso.accion,
      explicacion: paso.verificacion,
    })),
    guion: datos.guion,
  };
}

export function definirLeccionMovil(
  datos: DatosMovil,
): LeccionCapacitacionDefinida {
  return {
    ...base(datos, "MOVIL"),
    pasos: datos.pasos,
    guion: [],
  };
}

export function paso(
  id: string,
  titulo: string,
  ubicacion: string,
  antesDeActuar: string,
  microEjemplo: string,
  accion: string,
  verificacion: string,
  control: string,
  evento: EventoPasoAtomico,
  mutacion?: { metodo: "POST" | "PATCH" | "DELETE"; ruta: string },
  opciones?: {
    controlesAuxiliares?: readonly string[];
    requerirTodosValidos?: boolean;
    usarEntidadActiva?: boolean;
    numeroMinimo?: number;
  },
): PasoAtomicoCapacitacion {
  return {
    id,
    titulo: { es: titulo, en: titulo },
    ubicacion: { es: ubicacion, en: ubicacion },
    antesDeActuar: { es: antesDeActuar, en: antesDeActuar },
    microEjemplo: { es: microEjemplo, en: microEjemplo },
    accion: { es: accion, en: accion },
    verificacion: { es: verificacion, en: verificacion },
    objetivo: {
      control,
      evento,
      ...(mutacion ? { mutacion } : {}),
      ...(opciones?.controlesAuxiliares
        ? { controlesAuxiliares: opciones.controlesAuxiliares }
        : {}),
      ...(opciones?.requerirTodosValidos ? { requerirTodosValidos: true } : {}),
      ...(opciones?.usarEntidadActiva ? { usarEntidadActiva: true } : {}),
      ...(opciones?.numeroMinimo !== undefined
        ? { numeroMinimo: opciones.numeroMinimo }
        : {}),
    },
  };
}

export function pasoMovil(
  instruccion: TextoBilingue,
  accion: TextoBilingue,
  explicacion: TextoBilingue,
): PasoCapacitacion {
  return {
    instruccion: texto(instruccion),
    accion: texto(accion),
    explicacion: texto(explicacion),
  };
}
