import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient, RolUsuario } from "@prisma/client";
import { leerConfiguracionSeed } from "./configuracionSeed.js";

const prisma = new PrismaClient();

async function principal() {
  const { correo, contrasena } = leerConfiguracionSeed(process.env);
  const hashContrasena = await argon2.hash(contrasena, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });

  const administrador = await prisma.usuario.upsert({
    where: { correo },
    update: {},
    create: {
      nombre: "Administrador principal",
      correo,
      hashContrasena,
      rol: RolUsuario.ADMINISTRADOR,
      debeCambiarContrasena: true,
    },
  });
  if (administrador.rol !== RolUsuario.ADMINISTRADOR || !administrador.activo) {
    throw new Error(
      "SEED_ADMIN_EMAIL ya pertenece a una cuenta que no es administradora activa. El seed no cambiará roles ni reactivará cuentas existentes.",
    );
  }

  const localidad = await prisma.localidad.upsert({
    where: { nombre_estado: { nombre: "Centro", estado: "Sin especificar" } },
    update: {},
    create: { nombre: "Centro", estado: "Sin especificar" },
  });

  await prisma.ruta.upsert({
    where: { nombre: "Ruta inicial" },
    update: {},
    create: {
      nombre: "Ruta inicial",
      diaSemana: "LUNES",
      activa: true,
      notas:
        "Ruta administrativa web. Asigne un cobrador sólo si también debe aparecer en móvil.",
      localidades: { create: { localidadId: localidad.id, orden: 1 } },
    },
  });

  console.info(`Usuario administrador preparado: ${correo}`);
  console.info(
    "Si la cuenta fue creada ahora, deberá reemplazar la contraseña temporal en el primer acceso. Una cuenta existente conserva su contraseña y estado.",
  );
}

principal()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
