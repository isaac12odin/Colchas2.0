import type { RolUsuario } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        correo: string;
        rol: RolUsuario;
      };
    }
  }
}

export {};
