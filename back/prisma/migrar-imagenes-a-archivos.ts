import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import {
  eliminarImagen,
  guardarImagen,
  optimizarContenidoImagen,
} from "../src/compartido/imagenes.js";

const prisma = new PrismaClient();

interface FotoLegacy {
  id: string;
  contenido: Buffer;
  nombre: string | null;
}

async function existeColumna(tabla: string, columna: string) {
  const filas = await prisma.$queryRaw<Array<{ existe: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tabla}
        AND column_name = ${columna}
    ) AS existe
  `;
  return filas[0]?.existe ?? false;
}

async function prepararColumnas() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "productos"
      ADD COLUMN IF NOT EXISTS "fotoRuta" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "fotoBytes" INTEGER,
      ADD COLUMN IF NOT EXISTS "fotoAncho" INTEGER,
      ADD COLUMN IF NOT EXISTS "fotoAlto" INTEGER
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "devoluciones"
      ADD COLUMN IF NOT EXISTS "evidenciaRuta" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "evidenciaBytes" INTEGER,
      ADD COLUMN IF NOT EXISTS "evidenciaAncho" INTEGER,
      ADD COLUMN IF NOT EXISTS "evidenciaAlto" INTEGER
  `);
}

async function migrarProductos() {
  if (!(await existeColumna("productos", "fotoContenido"))) return 0;
  const fotos = await prisma.$queryRawUnsafe<FotoLegacy[]>(`
    SELECT id, "fotoContenido" AS contenido, "fotoNombre" AS nombre
    FROM "productos"
    WHERE "fotoContenido" IS NOT NULL AND "fotoRuta" IS NULL
  `);
  for (const foto of fotos) {
    const optimizada = await optimizarContenidoImagen(
      foto.contenido,
      foto.nombre ?? "producto.webp",
      {
        codigo: "FOTO_PRODUCTO_INVALIDA",
        nombreVisible: "La fotografía del producto",
        dimensionMaxima: 1_280,
        objetivoBytes: 240_000,
      },
    );
    const archivo = await guardarImagen(optimizada, "productos");
    try {
      await prisma.$executeRaw`
        UPDATE "productos"
        SET "fotoRuta" = ${archivo.ruta},
            "fotoMime" = ${archivo.mime},
            "fotoHash" = ${archivo.hash},
            "fotoBytes" = ${archivo.bytes},
            "fotoAncho" = ${archivo.ancho},
            "fotoAlto" = ${archivo.alto},
            "fotoActualizadaEn" = NOW()
        WHERE id = ${foto.id}::uuid
      `;
    } catch (error) {
      await eliminarImagen(archivo.ruta);
      throw error;
    }
  }
  const [pendiente] = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(`
    SELECT COUNT(*) AS total
    FROM "productos"
    WHERE "fotoContenido" IS NOT NULL AND "fotoRuta" IS NULL
  `);
  if ((pendiente?.total ?? 0n) > 0n)
    throw new Error("Quedaron fotografías de producto pendientes de migrar.");
  return fotos.length;
}

async function migrarDevoluciones() {
  if (!(await existeColumna("devoluciones", "evidenciaContenido"))) return 0;
  const evidencias = await prisma.$queryRawUnsafe<FotoLegacy[]>(`
    SELECT id, "evidenciaContenido" AS contenido, "evidenciaNombre" AS nombre
    FROM "devoluciones"
    WHERE "evidenciaContenido" IS NOT NULL AND "evidenciaRuta" IS NULL
  `);
  for (const evidencia of evidencias) {
    const optimizada = await optimizarContenidoImagen(
      evidencia.contenido,
      evidencia.nombre ?? "evidencia.webp",
      {
        codigo: "EVIDENCIA_INVALIDA",
        nombreVisible: "La fotografía de evidencia",
        dimensionMaxima: 1_600,
        objetivoBytes: 480_000,
      },
    );
    const archivo = await guardarImagen(optimizada, "devoluciones");
    try {
      await prisma.$executeRaw`
        UPDATE "devoluciones"
        SET "evidenciaRuta" = ${archivo.ruta},
            "evidenciaMime" = ${archivo.mime},
            "evidenciaHash" = ${archivo.hash},
            "evidenciaBytes" = ${archivo.bytes},
            "evidenciaAncho" = ${archivo.ancho},
            "evidenciaAlto" = ${archivo.alto}
        WHERE id = ${evidencia.id}::uuid
      `;
    } catch (error) {
      await eliminarImagen(archivo.ruta);
      throw error;
    }
  }
  const [pendiente] = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(`
    SELECT COUNT(*) AS total
    FROM "devoluciones"
    WHERE "evidenciaContenido" IS NOT NULL AND "evidenciaRuta" IS NULL
  `);
  if ((pendiente?.total ?? 0n) > 0n)
    throw new Error("Quedaron evidencias de devolución pendientes de migrar.");
  return evidencias.length;
}

async function principal() {
  await prepararColumnas();
  const [productos, devoluciones] = await Promise.all([
    migrarProductos(),
    migrarDevoluciones(),
  ]);
  console.info(
    `Imágenes migradas a archivos: ${productos} productos, ${devoluciones} devoluciones.`,
  );
}

principal()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
