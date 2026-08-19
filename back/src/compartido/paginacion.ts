import { z } from "zod";

export const esquemaPaginacion = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().trim().max(120).optional(),
});

export function crearPagina<T>(
  datos: T[],
  total: number,
  pagina: number,
  limite: number,
) {
  return {
    datos,
    paginacion: {
      pagina,
      limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
    },
  };
}
