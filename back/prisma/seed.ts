import "dotenv/config";
import argon2 from 'argon2';
import { PrismaClient, RolUsuario } from '@prisma/client';
import { leerConfiguracionSeed } from './configuracionSeed.js';

const prisma = new PrismaClient();

async function principal() {
  const { correo, contrasena } = leerConfiguracionSeed(process.env);
  const hashContrasena = await argon2.hash(contrasena, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.usuario.upsert({
    where: { correo },
    update: {
      hashContrasena,
      rol: RolUsuario.ADMINISTRADOR,
      activo: true,
      debeCambiarContrasena: true,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
    create: {
      nombre: 'Administrador principal',
      correo,
      hashContrasena,
      rol: RolUsuario.ADMINISTRADOR,
      debeCambiarContrasena: true,
    },
  });

  const localidad = await prisma.localidad.upsert({
    where: { nombre_estado: { nombre: 'Centro', estado: 'Sin especificar' } },
    update: {},
    create: { nombre: 'Centro', estado: 'Sin especificar' },
  });

  await prisma.ruta.upsert({
    where: { nombre: 'Ruta inicial' },
    update: {},
    create: {
      nombre: 'Ruta inicial',
      diaSemana: 'LUNES',
      localidades: { create: { localidadId: localidad.id, orden: 1 } },
    },
  });

  console.info(`Usuario administrador preparado: ${correo}`);
  console.info('Por seguridad, el sistema exigira cambiar la contrasena en el primer acceso.');
}

principal()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
