import { PrismaClient } from "@prisma/client";
import { entorno } from "../configuracion/entorno.js";

const globalPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalPrisma.prisma ??
  new PrismaClient({
    log:
      entorno.NODE_ENV === "test"
        ? []
        : entorno.NODE_ENV === "development"
          ? ["warn", "error"]
          : ["error"],
  });

if (entorno.NODE_ENV !== "production") globalPrisma.prisma = prisma;
