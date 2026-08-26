import type { Rol } from "../../tipos";

export type TipoSimuladorCapacitacionMovil =
  | "VENTA_CREDITO"
  | "ABONO"
  | "ENTREGA_PEDIDO"
  | "DEVOLUCION"
  | "SINCRONIZACION_CORRECCION";

export interface TextoCapacitacionMovil {
  es: string;
  en: string;
}

export interface PasoCapacitacionMovil {
  instruccion: TextoCapacitacionMovil;
  accion: TextoCapacitacionMovil;
  explicacion: TextoCapacitacionMovil;
}

export interface LeccionCapacitacionMovil {
  id: string;
  pantalla: string;
  roles: readonly Rol[];
  titulo: TextoCapacitacionMovil;
  resultado: TextoCapacitacionMovil;
  tipoSimulador?: TipoSimuladorCapacitacionMovil;
  pasos: readonly PasoCapacitacionMovil[];
}

export interface EtapaCapacitacionMovil {
  id: string;
  titulo: TextoCapacitacionMovil;
  necesitas: TextoCapacitacionMovil;
  resultado: TextoCapacitacionMovil;
  lecciones: readonly string[];
}

export interface RutaCapacitacionMovil {
  titulo: TextoCapacitacionMovil;
  antesDeSalir: readonly TextoCapacitacionMovil[];
  etapas: readonly EtapaCapacitacionMovil[];
}
