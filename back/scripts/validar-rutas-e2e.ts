import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaClient, ResultadoVisita, RolUsuario } from "@prisma/client";

import { cifrarCampo } from "../src/compartido/cifrado.js";
import {
  buscarClientesExtraordinarios,
  obtenerJornadaRuta,
} from "../src/modulos/rutas/clientesCobranza.js";
import { sincronizarLote } from "../src/modulos/sincronizacion/procesador.js";

if (
  process.env.NODE_ENV !== "test" ||
  process.env.E2E_CONFIRM_TEMP_DB !== "1"
) {
  throw new Error(
    "Esta prueba sólo puede ejecutarse contra una base temporal confirmada.",
  );
}

const prisma = new PrismaClient();

async function principal() {
  const sufijo = randomUUID().slice(0, 8);
  const usuario = await prisma.usuario.create({
    data: {
      nombre: "Cobrador E2E",
      correo: `cobrador-${sufijo}@e2e.local`,
      hashContrasena: "hash-no-utilizable",
      rol: RolUsuario.COBRADOR,
      debeCambiarContrasena: false,
    },
  });
  const localidades = await Promise.all(
    ["Norte", "Centro", "Extra"].map((nombre) =>
      prisma.localidad.create({
        data: { nombre: `${nombre}-${sufijo}`, estado: "Prueba" },
      }),
    ),
  );
  const [norte, centro, extra] = localidades;
  assert(norte && centro && extra);

  const [asignada, extraordinaria] = await Promise.all([
    crearCliente(`Clienta asignada ${sufijo}`, norte.id, `TA-${sufijo}`),
    crearCliente(`Clienta extraordinaria ${sufijo}`, extra.id, `TE-${sufijo}`),
  ]);
  const ruta = await prisma.ruta.create({
    data: {
      nombre: `Ruta E2E ${sufijo}`,
      diaSemana: "LUNES",
      localidades: {
        create: [
          { localidadId: norte.id, orden: 1 },
          { localidadId: centro.id, orden: 2 },
        ],
      },
      clientes: { create: { clienteId: asignada.id, orden: 1 } },
    },
    include: { localidades: true },
  });
  assert.equal(ruta.localidades.length, 2);

  const porNombre = await buscarClientesExtraordinarios(
    ruta.id,
    `extraordinaria ${sufijo}`,
  );
  const porTarjeta = await buscarClientesExtraordinarios(
    ruta.id,
    `TE-${sufijo}`,
  );
  assert.equal(porNombre[0]?.id, extraordinaria.id);
  assert.equal(porTarjeta[0]?.id, extraordinaria.id);
  assert.equal(porNombre[0]?.telefono, "");
  assert.equal(porNombre[0]?.direccion, "");

  const fecha = new Date("2026-08-17T12:00:00.000Z");
  const idOperacion = `visita-extra-${randomUUID()}`;
  const lote = {
    idLoteCliente: `lote-extra-${randomUUID()}`,
    dispositivoId: `e2e-${sufijo}`,
    operaciones: [
      {
        idOperacion,
        tipo: "VISITA" as const,
        datos: {
          rutaId: ruta.id,
          clienteId: extraordinaria.id,
          fechaProgramada: fecha,
          fechaVisita: fecha,
          resultado: ResultadoVisita.PAGO,
        },
      },
    ],
  };
  const sincronizacion = await sincronizarLote(lote, usuario.id);
  assert.equal(sincronizacion.resultados[0]?.exito, true);
  const reintento = await sincronizarLote(lote, usuario.id);
  assert.equal(reintento.resultados[0]?.idempotente, true);

  const visita = await prisma.visitaCobranza.findUniqueOrThrow({
    where: { idOperacionMovil: idOperacion },
  });
  assert.equal(visita.fueraDeRuta, true);
  assert.equal(
    await prisma.auditoria.count({
      where: { entidad: "VisitaFueraDeRuta", entidadId: visita.id },
    }),
    1,
  );
  const jornada = await obtenerJornadaRuta(ruta.id, fecha);
  assert.equal(jornada.clientes.length, 2);
  assert.equal(
    jornada.clientes.find((cliente) => cliente.id === extraordinaria.id)
      ?.fueraDeRuta,
    true,
  );

  console.info(
    "E2E rutas: multilocalidad, búsqueda y visita extraordinaria verificadas.",
  );
}

async function crearCliente(
  nombre: string,
  localidadId: string,
  tarjeta: string,
) {
  return prisma.cliente.create({
    data: {
      nombreCompleto: nombre,
      localidadId,
      numeroTarjeta: tarjeta,
      telefonoCifrado: cifrarCampo("5555551234"),
      direccionCifrada: cifrarCampo("Dirección de prueba"),
      saldo: { create: { saldoActual: 1_000, totalCargos: 1_000 } },
    },
  });
}

principal()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
