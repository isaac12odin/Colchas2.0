export type Rol =
  | "ADMINISTRADOR"
  | "CONTABLE"
  | "VENDEDOR"
  | "ALMACENISTA"
  | "COBRADOR";

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  debeCambiarContrasena: boolean;
  mfaHabilitado: boolean;
}

export interface Pagina<T> {
  datos: T[];
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
}
