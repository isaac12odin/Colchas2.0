import "dotenv/config";

import { randomUUID } from "node:crypto";

import argon2 from "argon2";
import {
  type EstadoCuota,
  type NivelRiesgo,
  type Prisma,
  PrismaClient,
  RolUsuario,
} from "@prisma/client";

import {
  cifrarCampo,
  hashBusqueda,
  VERSION_HASH_BUSQUEDA,
} from "../src/compartido/cifrado.js";

const prisma = new PrismaClient();

const MARCA_CARGA = "NEXO_CARGA_VOLUMEN_V1";
const PREFIJO = "CARGA-";
const TOTAL_CLIENTAS = 4_000;
const TOTAL_PRODUCTOS = 5_000;
const TAMANO_LOTE = 500;
const contrasenaCarga = process.env.LOAD_TEST_PASSWORD ?? "CargaNexo2026!";

const perfiles = [
  {
    correo: "admin.carga@nexo.local",
    nombre: "Administracion Carga",
    rol: RolUsuario.ADMINISTRADOR,
  },
  {
    correo: "contable.carga@nexo.local",
    nombre: "Contabilidad Carga",
    rol: RolUsuario.CONTABLE,
  },
  {
    correo: "vendedor.carga@nexo.local",
    nombre: "Ventas Carga",
    rol: RolUsuario.VENDEDOR,
  },
  {
    correo: "almacen.carga@nexo.local",
    nombre: "Almacen Carga",
    rol: RolUsuario.ALMACENISTA,
  },
  {
    correo: "cobrador.carga@nexo.local",
    nombre: "Cobranza Carga",
    rol: RolUsuario.COBRADOR,
  },
] as const;

const nombres = [
  "Adriana",
  "Alejandra",
  "Beatriz",
  "Carolina",
  "Claudia",
  "Daniela",
  "Elena",
  "Gabriela",
  "Isabel",
  "Laura",
  "Leticia",
  "Lucia",
  "Marcela",
  "Margarita",
  "Monica",
  "Natalia",
  "Patricia",
  "Raquel",
  "Rosa",
  "Veronica",
];

const apellidos = [
  "Aguilar",
  "Castillo",
  "Cruz",
  "Diaz",
  "Flores",
  "Garcia",
  "Hernandez",
  "Jimenez",
  "Lopez",
  "Martinez",
  "Mendoza",
  "Morales",
  "Navarro",
  "Ortiz",
  "Ramirez",
  "Reyes",
  "Rivera",
  "Sanchez",
  "Torres",
  "Vargas",
];

const familiasProducto = [
  "Colcha reversible",
  "Edredon ligero",
  "Juego de sabanas",
  "Cobertor termico",
  "Almohada firme",
  "Protector de colchon",
  "Juego de toallas",
  "Cortina decorativa",
  "Funda de almohada",
  "Manta multiusos",
];

const marcas = [
  "Nube Hogar",
  "Casa Clara",
  "Descanso MX",
  "Textil Centro",
  "Sueno Real",
  "Lino Vivo",
  "Abrigo",
  "Confort Plus",
  "Dulce Casa",
  "Origen Textil",
];

function asegurarBaseLocal() {
  const valor = process.env.DATABASE_URL;
  if (!valor) throw new Error("DATABASE_URL no esta configurada.");
  if (process.env.NODE_ENV === "production")
    throw new Error("La carga de volumen no puede ejecutarse en produccion.");
  const url = new URL(valor);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname))
    throw new Error(
      "La carga de volumen solo esta permitida en PostgreSQL local.",
    );
}

async function crearPorLotes<T>(
  datos: T[],
  crear: (lote: T[]) => Promise<unknown>,
) {
  for (let inicio = 0; inicio < datos.length; inicio += TAMANO_LOTE)
    await crear(datos.slice(inicio, inicio + TAMANO_LOTE));
}

async function limpiarCargaAnterior() {
  const clientes = await prisma.cliente.findMany({
    where: { notas: MARCA_CARGA },
    select: { id: true },
  });
  const productos = await prisma.producto.findMany({
    where: {
      sku: { startsWith: PREFIJO },
      codigoQr: { startsWith: "NEXO-CARGA:" },
    },
    select: { id: true },
  });
  const localidades = await prisma.localidad.findMany({
    where: { nombre: { startsWith: "Carga " } },
    select: { id: true },
  });
  const clienteIds = clientes.map(({ id }) => id);
  const productoIds = productos.map(({ id }) => id);

  await prisma.$transaction(async (tx) => {
    await tx.aplicacionAbono.deleteMany({
      where: { abono: { clienteId: { in: clienteIds } } },
    });
    await tx.abono.deleteMany({ where: { clienteId: { in: clienteIds } } });
    await tx.devolucion.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await tx.pedidoVenta.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await tx.visitaCobranza.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await tx.movimientoSaldo.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await tx.movimientoInventario.deleteMany({
      where: { productoId: { in: productoIds } },
    });
    await tx.venta.deleteMany({ where: { clienteId: { in: clienteIds } } });
    await tx.cliente.deleteMany({ where: { id: { in: clienteIds } } });
    await tx.producto.deleteMany({ where: { id: { in: productoIds } } });
    await tx.localidad.deleteMany({
      where: {
        id: { in: localidades.map(({ id }) => id) },
        clientes: { none: {} },
        rutas: { none: {} },
      },
    });
  });
}

function estadoCuota(
  pagada: boolean,
  fechaVence: Date,
  ahora: Date,
): EstadoCuota {
  if (pagada) return "PAGADA";
  return fechaVence < ahora ? "VENCIDA" : "PENDIENTE";
}

function nivelRiesgo(puntuacion: number): NivelRiesgo {
  if (puntuacion >= 75) return "CRITICO";
  if (puntuacion >= 50) return "ALTO";
  if (puntuacion >= 25) return "MEDIO";
  return "BAJO";
}

async function principal() {
  asegurarBaseLocal();
  const soloLimpiar = process.argv.includes("--limpiar");
  const inicio = Date.now();

  console.info("Limpiando una carga de volumen anterior, si existe...");
  await limpiarCargaAnterior();
  if (soloLimpiar) {
    await prisma.usuario.updateMany({
      where: { correo: { in: perfiles.map(({ correo }) => correo) } },
      data: { activo: false, tokenVersion: { increment: 1 } },
    });
    console.info("Carga de volumen eliminada.");
    return;
  }

  const hashContrasena = await argon2.hash(contrasenaCarga, {
    type: argon2.argon2id,
    memoryCost: 32_768,
    timeCost: 2,
    parallelism: 1,
  });
  const usuarios = await Promise.all(
    perfiles.map((perfil) =>
      prisma.usuario.upsert({
        where: { correo: perfil.correo },
        create: {
          ...perfil,
          hashContrasena,
          debeCambiarContrasena: false,
        },
        update: {
          ...perfil,
          hashContrasena,
          activo: true,
          debeCambiarContrasena: false,
          intentosFallidos: 0,
          bloqueadoHasta: null,
          tokenVersion: { increment: 1 },
          mfaHabilitado: false,
          mfaSecretoCifrado: null,
          mfaUltimoContador: null,
        },
      }),
    ),
  );
  const admin = usuarios[0]!;
  const vendedor = usuarios[2]!;
  const cobrador = usuarios[4]!;
  const nombresCategorias = ["Recamara", "Bano", "Decoracion", "Temporada"];
  const categorias = await Promise.all(
    nombresCategorias.map((nombre, orden) =>
      prisma.categoriaProducto.upsert({
        where: { nombre },
        create: { nombre, orden: 20 + orden },
        update: { activo: true },
      }),
    ),
  );

  const localidades = await Promise.all(
    Array.from({ length: 20 }, (_, indice) =>
      prisma.localidad.create({
        data: {
          nombre: `Carga ${String(indice + 1).padStart(2, "0")}`,
          estado: ["Puebla", "Tlaxcala", "Veracruz", "Hidalgo"][indice % 4]!,
        },
      }),
    ),
  );

  const clientes: Prisma.ClienteCreateManyInput[] = [];
  const saldos: Prisma.SaldoClienteCreateManyInput[] = [];
  const productos: Prisma.ProductoCreateManyInput[] = [];
  const movimientosInventario: Prisma.MovimientoInventarioCreateManyInput[] =
    [];
  const ventas: Prisma.VentaCreateManyInput[] = [];
  const detalles: Prisma.DetalleVentaCreateManyInput[] = [];
  const planes: Prisma.PlanPagoCreateManyInput[] = [];
  const cuotas: Prisma.CuotaCreateManyInput[] = [];
  const abonos: Prisma.AbonoCreateManyInput[] = [];
  const aplicaciones: Prisma.AplicacionAbonoCreateManyInput[] = [];
  const movimientosSaldo: Prisma.MovimientoSaldoCreateManyInput[] = [];
  const evaluaciones: Prisma.EvaluacionRiesgoCreateManyInput[] = [];
  const ahora = new Date();

  for (let indice = 0; indice < TOTAL_PRODUCTOS; indice += 1) {
    const numero = indice + 1;
    const productoId = randomUUID();
    const existenciaInicial = 20 + (indice % 81);
    const existenciaFinal =
      existenciaInicial - (indice < TOTAL_CLIENTAS ? 1 : 0);
    const cuotaCentavos = 10_000 + (indice % 300) * 100;
    const precioVenta = (cuotaCentavos * 12) / 100;
    const precioCompra = Math.round(precioVenta * 55) / 100;
    productos.push({
      id: productoId,
      sku: `${PREFIJO}${String(numero).padStart(5, "0")}`,
      nombre: `${familiasProducto[indice % familiasProducto.length]} ${String(numero).padStart(5, "0")}`,
      marca: marcas[indice % marcas.length]!,
      categoria: nombresCategorias[indice % nombresCategorias.length]!,
      categoriaId: categorias[indice % categorias.length]!.id,
      codigoBarras: `789${String(numero).padStart(10, "0")}`,
      codigoQr: `NEXO-CARGA:${String(numero).padStart(5, "0")}`,
      existencia: existenciaFinal,
      existenciaMinima: 5 + (indice % 10),
      precioVenta,
      precioCompra,
    });
    movimientosInventario.push({
      id: randomUUID(),
      productoId,
      usuarioId: admin.id,
      tipo: "AJUSTE_POSITIVO",
      cantidad: existenciaInicial,
      existenciaAntes: 0,
      existenciaDespues: existenciaInicial,
      referenciaTipo: "CARGA_VOLUMEN",
      notas: MARCA_CARGA,
    });
  }

  for (let indice = 0; indice < TOTAL_CLIENTAS; indice += 1) {
    const numero = indice + 1;
    const clienteId = randomUUID();
    const ventaId = randomUUID();
    const planId = randomUUID();
    const producto = productos[indice]!;
    const total = Number(producto.precioVenta);
    const cuota = total / 12;
    const pagos = indice < TOTAL_CLIENTAS / 2 ? 2 : 1;
    const totalAbonado = cuota * pagos;
    const saldoActual = total - totalAbonado;
    const diasAtras = 7 + (indice % 174);
    const fechaVenta = new Date(ahora.getTime() - diasAtras * 86_400_000);
    const fechaOperativa = new Date(fechaVenta);
    fechaOperativa.setUTCHours(0, 0, 0, 0);
    const telefono = `229${String(numero).padStart(7, "0")}`;
    let vencidoActual = 0;
    let cuotasVencidas = 0;
    let diasMoraMaximos = 0;

    clientes.push({
      id: clienteId,
      nombreCompleto: `${nombres[indice % nombres.length]} ${apellidos[indice % apellidos.length]} ${apellidos[(indice * 7 + 3) % apellidos.length]} ${String(numero).padStart(4, "0")}`,
      telefonoCifrado: cifrarCampo(telefono),
      telefonoHash: hashBusqueda(telefono),
      telefonoHashVersion: VERSION_HASH_BUSQUEDA,
      telefonoUltimos4: telefono.slice(-4),
      direccionCifrada: cifrarCampo(
        `Calle Prueba ${numero}, numero ${100 + (indice % 900)}, colonia Carga`,
      ),
      numeroTarjeta: `${PREFIJO}T-${String(numero).padStart(6, "0")}`,
      localidadId: localidades[indice % localidades.length]!.id,
      limiteCredito: 25_000,
      notas: MARCA_CARGA,
    });
    ventas.push({
      id: ventaId,
      folio: `${PREFIJO}V-${String(numero).padStart(6, "0")}`,
      clienteId,
      usuarioId: vendedor.id,
      tipo: "CREDITO",
      estado: "CONFIRMADA",
      subtotal: total,
      descuento: 0,
      total,
      anticipo: 0,
      metodoPago: "EFECTIVO",
      fechaVenta,
      capturadaEnCliente: fechaVenta,
      recibidaEnServidor: fechaVenta,
      fechaOperativa,
      confirmadaEn: fechaVenta,
      notas: MARCA_CARGA,
    });
    detalles.push({
      id: randomUUID(),
      ventaId,
      productoId: producto.id!,
      productoNombre: producto.nombre,
      productoSku: producto.sku,
      productoMarca: producto.marca,
      cantidad: 1,
      precioUnitario: total,
      costoUnitario: Number(producto.precioCompra),
      descuento: 0,
      total,
    });
    planes.push({
      id: planId,
      ventaId,
      periodicidad: "SEMANAL",
      numeroCuotas: 12,
      montoCuota: cuota,
      primerVencimiento: new Date(fechaVenta.getTime() + 7 * 86_400_000),
    });
    movimientosSaldo.push({
      id: randomUUID(),
      clienteId,
      tipo: "CARGO_VENTA",
      monto: total,
      saldoAnterior: 0,
      saldoNuevo: total,
      referenciaId: ventaId,
      concepto: `Venta ${PREFIJO}V-${String(numero).padStart(6, "0")}`,
      creadoEn: fechaVenta,
    });
    movimientosInventario.push({
      id: randomUUID(),
      productoId: producto.id!,
      usuarioId: vendedor.id,
      tipo: "SALIDA_VENTA",
      cantidad: 1,
      existenciaAntes: Number(producto.existencia) + 1,
      existenciaDespues: Number(producto.existencia),
      referenciaTipo: "VENTA",
      referenciaId: ventaId,
      notas: MARCA_CARGA,
      creadoEn: fechaVenta,
    });

    let saldoSecuencial = total;
    for (let cuotaIndice = 0; cuotaIndice < 12; cuotaIndice += 1) {
      const cuotaId = randomUUID();
      const fechaVence = new Date(
        fechaVenta.getTime() + (cuotaIndice + 1) * 7 * 86_400_000,
      );
      const pagada = cuotaIndice < pagos;
      cuotas.push({
        id: cuotaId,
        planPagoId: planId,
        numero: cuotaIndice + 1,
        fechaVence,
        monto: cuota,
        montoPagado: pagada ? cuota : 0,
        estado: estadoCuota(pagada, fechaVence, ahora),
        pagadaEn: pagada
          ? new Date(fechaVenta.getTime() + (cuotaIndice + 1) * 86_400_000)
          : null,
      });
      if (!pagada && fechaVence < ahora) {
        vencidoActual += cuota;
        cuotasVencidas += 1;
        diasMoraMaximos = Math.max(
          diasMoraMaximos,
          Math.floor((ahora.getTime() - fechaVence.getTime()) / 86_400_000),
        );
      }

      if (pagada) {
        const abonoId = randomUUID();
        const fechaAbono = new Date(
          fechaVenta.getTime() + (cuotaIndice + 1) * 86_400_000,
        );
        const saldoAnterior = saldoSecuencial;
        saldoSecuencial -= cuota;
        abonos.push({
          id: abonoId,
          clienteId,
          ventaId,
          usuarioId: cobrador.id,
          monto: cuota,
          metodo: cuotaIndice % 2 === 0 ? "EFECTIVO" : "TRANSFERENCIA",
          fechaAbono,
          capturadaEnCliente: fechaAbono,
          recibidaEnServidor: fechaAbono,
          fechaOperativa: new Date(
            Date.UTC(
              fechaAbono.getUTCFullYear(),
              fechaAbono.getUTCMonth(),
              fechaAbono.getUTCDate(),
            ),
          ),
          referencia: `${PREFIJO}A-${String(numero).padStart(6, "0")}-${cuotaIndice + 1}`,
          notas: MARCA_CARGA,
        });
        aplicaciones.push({ abonoId, cuotaId, monto: cuota });
        movimientosSaldo.push({
          id: randomUUID(),
          clienteId,
          tipo: "ABONO",
          monto: cuota,
          saldoAnterior,
          saldoNuevo: saldoSecuencial,
          referenciaId: abonoId,
          concepto: "Abono de cliente",
          creadoEn: fechaAbono,
        });
      }
    }
    saldos.push({
      id: randomUUID(),
      clienteId,
      saldoActual,
      totalCargos: total,
      totalAbonos: totalAbonado,
      vencidoActual,
    });
    const porcentajePagado = Math.round((pagos / 12) * 10_000) / 100;
    const puntuacion = Math.min(
      100,
      cuotasVencidas * 10 + Math.min(40, diasMoraMaximos) + 15,
    );
    evaluaciones.push({
      id: randomUUID(),
      clienteId,
      puntuacion,
      nivel: nivelRiesgo(puntuacion),
      cuotasVencidas,
      diasMoraMaximos,
      porcentajePagado,
      visitasSinPago: 0,
      razon: cuotasVencidas
        ? `${cuotasVencidas} cuota(s) vencida(s), ${diasMoraMaximos} dia(s) maximos de mora y 0 visita(s) sin pago en 90 dias.`
        : "Sin cuotas vencidas al momento del calculo.",
      calculadaEn: ahora,
    });
  }

  console.info("Insertando catalogos y clientas...");
  await crearPorLotes(productos, (data) =>
    prisma.producto.createMany({ data }),
  );
  await crearPorLotes(clientes, (data) => prisma.cliente.createMany({ data }));
  await crearPorLotes(saldos, (data) =>
    prisma.saldoCliente.createMany({ data }),
  );

  console.info("Insertando ventas, cuotas, abonos y libros auxiliares...");
  await crearPorLotes(ventas, (data) => prisma.venta.createMany({ data }));
  await crearPorLotes(detalles, (data) =>
    prisma.detalleVenta.createMany({ data }),
  );
  await crearPorLotes(planes, (data) => prisma.planPago.createMany({ data }));
  await crearPorLotes(cuotas, (data) => prisma.cuota.createMany({ data }));
  await crearPorLotes(evaluaciones, (data) =>
    prisma.evaluacionRiesgo.createMany({ data }),
  );
  await crearPorLotes(abonos, (data) => prisma.abono.createMany({ data }));
  await crearPorLotes(aplicaciones, (data) =>
    prisma.aplicacionAbono.createMany({ data }),
  );
  await crearPorLotes(movimientosSaldo, (data) =>
    prisma.movimientoSaldo.createMany({ data }),
  );
  await crearPorLotes(movimientosInventario, (data) =>
    prisma.movimientoInventario.createMany({ data }),
  );

  const verificaciones = await Promise.all(
    usuarios.map((usuario) =>
      argon2.verify(usuario.hashContrasena, contrasenaCarga),
    ),
  );
  if (verificaciones.some((valida) => !valida))
    throw new Error("No fue posible verificar todas las cuentas de carga.");

  console.info("\nCarga de volumen completada.");
  console.info(
    `Clientas: ${clientes.length} | Productos: ${productos.length} | Ventas: ${ventas.length}`,
  );
  console.info(
    `Cuotas: ${cuotas.length} | Abonos: ${abonos.length} | Movimientos de saldo: ${movimientosSaldo.length}`,
  );
  console.info(`Tiempo: ${((Date.now() - inicio) / 1_000).toFixed(1)} s`);
  console.info("Cuentas verificadas:");
  perfiles.forEach(({ correo, rol }) => console.info(`- ${rol}: ${correo}`));
  console.info(`Contrasena local: ${contrasenaCarga}\n`);
}

principal()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
