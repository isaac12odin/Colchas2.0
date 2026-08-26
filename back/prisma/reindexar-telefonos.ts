import { prisma } from "../src/infraestructura/prisma.js";
import {
  descifrarCampo,
  hashBusqueda,
  normalizarTelefono,
  VERSION_HASH_BUSQUEDA,
} from "../src/compartido/cifrado.js";

async function principal() {
  const clientes = await prisma.cliente.findMany({
    select: { id: true, telefonoCifrado: true, telefonoHashVersion: true },
  });
  let actualizados = 0;
  for (const cliente of clientes) {
    const telefono = normalizarTelefono(
      descifrarCampo(cliente.telefonoCifrado),
    );
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        telefonoHash: hashBusqueda(telefono),
        telefonoHashVersion: VERSION_HASH_BUSQUEDA,
        telefonoUltimos4: telefono.slice(-4),
      },
    });
    actualizados += 1;
  }
  const pendientes = await prisma.cliente.count({
    where: { telefonoHashVersion: { not: VERSION_HASH_BUSQUEDA } },
  });
  if (pendientes !== 0)
    throw new Error(`Quedaron ${pendientes} teléfonos con índice legado.`);
  console.log(`Índice HMAC reconstruido para ${actualizados} clientes.`);
}

principal()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
