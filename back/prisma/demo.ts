import "dotenv/config";

import argon2 from "argon2";
import { DiaSemana, RolUsuario } from "@prisma/client";

import { cifrarCampo, hashBusqueda } from "../src/compartido/cifrado.js";
import { prisma } from "../src/infraestructura/prisma.js";
import { recalcularRiesgoCliente } from "../src/modulos/cobranza/riesgo.js";
import { registrarAbono } from "../src/modulos/cobranza/servicio.js";
import { crearVenta } from "../src/modulos/ventas/servicio.js";
import {
  asegurarEntornoDemo,
  CORREOS_DEMO,
  limpiarDatosDemo,
  MARCA_DEMO,
} from "./demo-soporte.js";

const contrasenaDemo = process.env.DEMO_PASSWORD ?? "DemoNexo2026!";

const perfiles = [
  {
    correo: CORREOS_DEMO[0]!,
    nombre: "Administración Demo",
    rol: RolUsuario.ADMINISTRADOR,
  },
  {
    correo: CORREOS_DEMO[1]!,
    nombre: "Contabilidad Demo",
    rol: RolUsuario.CONTABLE,
  },
  { correo: CORREOS_DEMO[2]!, nombre: "Ventas Demo", rol: RolUsuario.VENDEDOR },
  {
    correo: CORREOS_DEMO[3]!,
    nombre: "Almacén Demo",
    rol: RolUsuario.ALMACENISTA,
  },
  {
    correo: CORREOS_DEMO[4]!,
    nombre: "Cobranza Demo",
    rol: RolUsuario.COBRADOR,
  },
];

const catalogo = [
  [
    "DEMO-COLCHA-KS",
    "Colcha reversible king size",
    "Nube Hogar",
    780,
    1_390,
    18,
    5,
  ],
  ["DEMO-EDREDON-QS", "Edredón matrimonial", "Nube Hogar", 620, 1_150, 14, 4],
  ["DEMO-SABANA-QS", "Juego de sábanas queen", "Casa Clara", 260, 520, 22, 6],
  ["DEMO-TOALLA-4", "Juego de cuatro toallas", "Casa Clara", 210, 450, 9, 3],
  ["DEMO-ALMOHADA", "Almohada memory foam", "Descanso MX", 310, 650, 1, 5],
  ["DEMO-COBIJA", "Cobija térmica individual", "Abrigo", 190, 390, 12, 4],
] as const;

async function principal() {
  asegurarEntornoDemo();
  await limpiarDatosDemo();

  const hashContrasena = await argon2.hash(contrasenaDemo, {
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
  const categoriaHogar = await prisma.categoriaProducto.upsert({
    where: { nombre: "Hogar" },
    create: { nombre: "Hogar", orden: 20 },
    update: { activo: true },
  });

  const localidades = await Promise.all(
    [
      ["DEMO · Centro", "Puebla"],
      ["DEMO · Cholula", "Puebla"],
      ["DEMO · Atlixco", "Puebla"],
    ].map(([nombre, estado]) =>
      prisma.localidad.create({ data: { nombre: nombre!, estado: estado! } }),
    ),
  );

  const productos = [];
  for (let indice = 0; indice < catalogo.length; indice += 1) {
    const [sku, nombre, marca, compra, venta, existencia, minima] =
      catalogo[indice]!;
    const producto = await prisma.producto.create({
      data: {
        sku,
        nombre,
        marca,
        categoria: "Hogar",
        categoriaId: categoriaHogar.id,
        codigoBarras: `75090000000${indice + 1}`,
        codigoQr: `NEXO-DEMO:${sku}`,
        existencia,
        existenciaMinima: minima,
        precioCompra: compra,
        precioVenta: venta,
      },
    });
    productos.push(producto);
    await prisma.movimientoInventario.create({
      data: {
        productoId: producto.id,
        usuarioId: admin.id,
        tipo: "AJUSTE_POSITIVO",
        cantidad: existencia,
        existenciaAntes: 0,
        existenciaDespues: existencia,
        referenciaTipo: "DEMO",
        notas: MARCA_DEMO,
      },
    });
  }

  const nombres = [
    "María López Hernández",
    "Rosa Martínez Cruz",
    "Patricia Hernández Ruiz",
    "Laura Sánchez Pérez",
    "Claudia Torres Flores",
    "Gabriela Ramírez Díaz",
    "Mónica Castillo Vega",
    "Elena Morales Ortiz",
  ];
  const clientes = [];
  for (let indice = 0; indice < nombres.length; indice += 1) {
    const telefono = `22255501${String(indice + 1).padStart(2, "0")}`;
    const cliente = await prisma.cliente.create({
      data: {
        nombreCompleto: nombres[indice]!,
        telefonoCifrado: cifrarCampo(telefono),
        telefonoHash: hashBusqueda(telefono),
        telefonoUltimos4: telefono.slice(-4),
        direccionCifrada: cifrarCampo(
          `Calle ${10 + indice} número ${100 + indice}, referencia demo`,
        ),
        localidadId: localidades[indice % localidades.length]!.id,
        limiteCredito: 12_000,
        notas: MARCA_DEMO,
        saldo: { create: {} },
      },
    });
    clientes.push(cliente);
  }

  const dias = Object.values(DiaSemana);
  const indiceHoy = (new Date().getDay() + 6) % 7;
  const rutaHoy = await prisma.ruta.create({
    data: {
      nombre: "DEMO · Ruta operativa de hoy",
      diaSemana: dias[indiceHoy]!,
      cobradorId: cobrador.id,
      notas: MARCA_DEMO,
      localidades: {
        create: [
          { localidadId: localidades[0]!.id, orden: 1 },
          { localidadId: localidades[1]!.id, orden: 2 },
        ],
      },
      clientes: {
        create: clientes.slice(0, 6).map((cliente, orden) => ({
          clienteId: cliente.id,
          orden: orden + 1,
        })),
      },
    },
  });
  await prisma.ruta.create({
    data: {
      nombre: "DEMO · Ruta Atlixco",
      diaSemana: DiaSemana.VIERNES,
      cobradorId: cobrador.id,
      notas: MARCA_DEMO,
      localidades: { create: { localidadId: localidades[2]!.id, orden: 1 } },
      clientes: {
        create: clientes.slice(6).map((cliente, orden) => ({
          clienteId: cliente.id,
          orden: orden + 1,
        })),
      },
    },
  });

  const proveedor = await prisma.proveedor.create({
    data: {
      nombre: "DEMO · Textiles del Centro",
      contacto: "Ana Proveedora",
      telefono: "2225559000",
      correo: "ventas@demo-proveedor.local",
      rfc: "DEMO010101AA1",
      notas: MARCA_DEMO,
    },
  });

  const compra = await prisma.compra.create({
    data: {
      folio: "DEMO-COMPRA-001",
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      usuarioId: admin.id,
      total: 950,
      fechaCompra: new Date(Date.now() - 5 * 86_400_000),
      notas: MARCA_DEMO,
      detalles: {
        create: {
          productoId: productos[5]!.id,
          cantidad: 5,
          costoUnitario: 190,
          total: 950,
        },
      },
    },
  });
  const cobijaAntes = productos[5]!.existencia;
  await prisma.producto.update({
    where: { id: productos[5]!.id },
    data: { existencia: { increment: 5 } },
  });
  await prisma.movimientoInventario.create({
    data: {
      productoId: productos[5]!.id,
      usuarioId: admin.id,
      tipo: "ENTRADA_COMPRA",
      cantidad: 5,
      existenciaAntes: cobijaAntes,
      existenciaDespues: cobijaAntes + 5,
      referenciaTipo: "COMPRA",
      referenciaId: compra.id,
      notas: MARCA_DEMO,
    },
  });

  // Las operaciones demo pasan por las mismas reglas temporales que la API:
  // deben quedar dentro de la ventana offline vigente de 36 horas.
  const horasVenta = [30, 24, 12, 2];
  const ventasCredito = [];
  for (let indice = 0; indice < horasVenta.length; indice += 1) {
    const fechaVenta = new Date(Date.now() - horasVenta[indice]! * 3_600_000);
    const venta = await crearVenta(vendedor, {
      clienteId: clientes[indice]!.id,
      numeroTarjeta: `DEMO-${String(indice + 1).padStart(4, "0")}`,
      tipo: "CREDITO",
      descuento: 0,
      anticipo: indice === 1 ? 200 : 0,
      metodoAnticipo: indice === 1 ? "TRANSFERENCIA" : "EFECTIVO",
      fechaVenta,
      notas: MARCA_DEMO,
      items: [{ productoId: productos[indice]!.id, cantidad: 1 }],
      plan: {
        periodicidad: "SEMANAL",
        montoCuota: indice === 0 ? 200 : 150,
        primerVencimiento: new Date(fechaVenta.getTime() + 7 * 86_400_000),
      },
    });
    ventasCredito.push(venta);
  }

  await registrarAbono(cobrador, {
    clienteId: clientes[0]!.id,
    ventaId: ventasCredito[0]!.id,
    monto: 400,
    metodo: "EFECTIVO",
    fechaAbono: new Date(Date.now() - 6 * 3_600_000),
    referencia: "DEMO-ABONO-001",
    notas: MARCA_DEMO,
  });
  await registrarAbono(cobrador, {
    clienteId: clientes[1]!.id,
    ventaId: ventasCredito[1]!.id,
    monto: 300,
    metodo: "TRANSFERENCIA",
    fechaAbono: new Date(Date.now() - 3 * 3_600_000),
    referencia: "DEMO-ABONO-002",
    notas: MARCA_DEMO,
  });
  await crearVenta(vendedor, {
    clienteId: null,
    tipo: "PUBLICO",
    descuento: 0,
    anticipo: 0,
    metodoAnticipo: "TARJETA",
    fechaVenta: new Date(Date.now() - 86_400_000),
    notas: MARCA_DEMO,
    items: [{ productoId: productos[5]!.id, cantidad: 2 }],
  });

  await prisma.pedidoVenta.create({
    data: {
      folio: "DEMO-PEDIDO-001",
      clienteId: clientes[4]!.id,
      estado: "PENDIENTE_PEDIR",
      fechaCompromiso: new Date(Date.now() + 3 * 86_400_000),
      notas: MARCA_DEMO,
      items: {
        create: {
          productoId: productos[0]!.id,
          descripcion: productos[0]!.nombre,
          cantidad: 1,
          precioEstimado: productos[0]!.precioVenta,
        },
      },
    },
  });
  await prisma.pedidoVenta.create({
    data: {
      folio: "DEMO-PEDIDO-002",
      clienteId: clientes[5]!.id,
      estado: "RECIBIDO_ALMACEN",
      fechaCompromiso: new Date(Date.now() - 2 * 86_400_000),
      recibidoEn: new Date(),
      notas: MARCA_DEMO,
      items: {
        create: {
          productoId: productos[3]!.id,
          proveedorId: proveedor.id,
          descripcion: productos[3]!.nombre,
          cantidad: 1,
          precioEstimado: productos[3]!.precioVenta,
        },
      },
    },
  });

  const fechasVisita = [21, 14, 7];
  for (let indice = 0; indice < fechasVisita.length; indice += 1) {
    const fecha = new Date(Date.now() - fechasVisita[indice]! * 86_400_000);
    fecha.setHours(12, 0, 0, 0);
    await prisma.visitaCobranza.create({
      data: {
        rutaId: rutaHoy.id,
        clienteId: clientes[0]!.id,
        usuarioId: cobrador.id,
        fechaProgramada: fecha,
        fechaVisita: fecha,
        resultado: indice === 0 ? "PAGO" : indice === 1 ? "NO_PAGO" : "AUSENTE",
        notas: MARCA_DEMO,
      },
    });
  }

  for (const cliente of clientes)
    await prisma.$transaction((tx) => recalcularRiesgoCliente(tx, cliente.id));

  console.info("\nDatos demo empresariales generados correctamente.");
  console.info(`Clientes: ${clientes.length} · Productos: ${productos.length}`);
  console.info("Usuarios demo:");
  perfiles.forEach(({ correo, rol }) => console.info(`- ${rol}: ${correo}`));
  console.info(`Contraseña local: ${contrasenaDemo}`);
  console.info("Para eliminarlos: npm run datos:demo:limpiar\n");
}

principal()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
