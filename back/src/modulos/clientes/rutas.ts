import { Router } from "express";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";
import { esquemaPaginacion, crearPagina } from "../../compartido/paginacion.js";
import {
  cifrarCampo,
  descifrarCampo,
  hashBusqueda,
  normalizarTelefono,
} from "../../compartido/cifrado.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { auditar } from "../../compartido/auditoria.js";
import { coincideCliente } from "./busqueda.js";
import { ocultarCostosDeVenta } from "../ventas/presentacion.js";
import { filtroClientesDelActor } from "../../seguridad/alcanceDatos.js";

export const rutasClientes = Router();
rutasClientes.use(autenticar);

function rolSinCostos(rol: RolUsuario) {
  return rol === RolUsuario.COBRADOR || rol === RolUsuario.VENDEDOR;
}

const esquemaCliente = z.object({
  nombreCompleto: z.string().trim().min(3).max(180),
  telefono: z.string().trim().min(7).max(30),
  direccion: z.string().trim().min(5).max(500),
  localidadId: z.string().uuid(),
  limiteCredito: z.coerce.number().min(0).max(99_999_999).default(0),
  notas: z.string().trim().max(1000).optional(),
});

function presentarCliente<
  T extends { telefonoCifrado: string; direccionCifrada: string },
>(cliente: T) {
  const { telefonoCifrado, direccionCifrada, ...publico } = cliente;
  return {
    ...publico,
    telefono: descifrarCampo(telefonoCifrado),
    direccion: descifrarCampo(direccionCifrada),
  };
}

rutasClientes.get(
  "/",
  permitir(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.VENDEDOR,
    RolUsuario.COBRADOR,
  ),
  async (req, res) => {
    const { pagina, limite, buscar } = esquemaPaginacion.parse(req.query);
    const alcance = filtroClientesDelActor(req.usuario!);
    if (buscar) {
      const candidatos = await prisma.cliente.findMany({
        where: { activo: true, ...alcance },
        include: {
          localidad: true,
          saldo: true,
          evaluacionesRiesgo: { take: 1, orderBy: { calculadaEn: "desc" } },
        },
        orderBy: { nombreCompleto: "asc" },
        take: 5_000,
      });
      const encontrados = candidatos
        .map(presentarCliente)
        .filter((cliente) => coincideCliente(cliente, buscar));
      res.json(
        crearPagina(
          encontrados.slice((pagina - 1) * limite, pagina * limite),
          encontrados.length,
          pagina,
          limite,
        ),
      );
      return;
    }
    const [clientes, total] = await prisma.$transaction([
      prisma.cliente.findMany({
        where: { activo: true, ...alcance },
        include: {
          localidad: true,
          saldo: true,
          evaluacionesRiesgo: { take: 1, orderBy: { calculadaEn: "desc" } },
        },
        orderBy: { nombreCompleto: "asc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.cliente.count({ where: { activo: true, ...alcance } }),
    ]);
    res.json(
      crearPagina(clientes.map(presentarCliente), total, pagina, limite),
    );
  },
);

rutasClientes.get(
  "/:id",
  permitir(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.VENDEDOR,
    RolUsuario.COBRADOR,
  ),
  async (req, res) => {
    const cliente = await prisma.cliente.findFirst({
      where: {
        id: String(req.params.id),
        ...filtroClientesDelActor(req.usuario!),
      },
      include: {
        localidad: true,
        saldo: true,
        rutas: { where: { activo: true }, include: { ruta: true } },
        ventas: {
          orderBy: { fechaVenta: "desc" },
          take: 50,
          include: {
            detalles: { include: { producto: true } },
            planPago: { include: { cuotas: true } },
            devoluciones: {
              where: { estado: "REGISTRADA" },
              select: {
                id: true,
                folio: true,
                tipo: true,
                totalDevuelto: true,
                aplicadoSaldo: true,
                montoReembolsado: true,
                creadoEn: true,
              },
            },
          },
        },
        abonos: {
          orderBy: { fechaAbono: "desc" },
          take: 100,
          include: { anuladoPor: { select: { nombre: true } } },
        },
        pedidos: {
          orderBy: { creadoEn: "desc" },
          take: 50,
          include: {
            items: {
              include: { proveedor: { select: { nombre: true } } },
            },
            venta: { select: { folio: true } },
          },
        },
        movimientosSaldo: { orderBy: { creadoEn: "desc" }, take: 100 },
        evaluacionesRiesgo: { take: 1, orderBy: { calculadaEn: "desc" } },
      },
    });
    if (!cliente)
      throw new ErrorAplicacion(
        "CLIENTE_NO_ENCONTRADO",
        "No se encontro el cliente.",
        404,
      );
    const presentado = presentarCliente(cliente);
    res.json(
      rolSinCostos(req.usuario!.rol)
        ? {
            ...presentado,
            ventas: presentado.ventas.map(ocultarCostosDeVenta),
          }
        : presentado,
    );
  },
);

rutasClientes.post(
  "/",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE, RolUsuario.VENDEDOR),
  async (req, res) => {
    const datos = esquemaCliente.parse(req.body);
    const telefono = normalizarTelefono(datos.telefono);
    const cliente = await prisma.cliente.create({
      data: {
        nombreCompleto: datos.nombreCompleto,
        telefonoCifrado: cifrarCampo(telefono),
        telefonoHash: hashBusqueda(telefono),
        telefonoUltimos4: telefono.slice(-4),
        direccionCifrada: cifrarCampo(datos.direccion),
        localidadId: datos.localidadId,
        limiteCredito: datos.limiteCredito,
        notas: datos.notas,
        saldo: { create: {} },
      },
      include: { localidad: true, saldo: true },
    });
    await auditar(req, "CREAR", "Cliente", cliente.id, undefined, {
      ...cliente,
      telefonoCifrado: "[CIFRADO]",
      direccionCifrada: "[CIFRADO]",
    });
    res.status(201).json(presentarCliente(cliente));
  },
);

rutasClientes.patch(
  "/:id/tarjeta",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE, RolUsuario.VENDEDOR),
  async (req, res) => {
    const { numeroTarjeta } = z
      .object({ numeroTarjeta: z.string().trim().min(3).max(30) })
      .parse(req.body);
    const antes = await prisma.cliente.findUniqueOrThrow({
      where: { id: String(req.params.id) },
      include: { saldo: true },
    });
    if (!antes.activo)
      throw new ErrorAplicacion(
        "CLIENTE_INACTIVO",
        "No se puede asignar tarjeta a un cliente inactivo.",
        422,
      );
    if (Number(antes.saldo?.saldoActual ?? 0) <= 0)
      throw new ErrorAplicacion(
        "TARJETA_SIN_SALDO",
        "La tarjeta sólo se captura cuando existe saldo pendiente.",
        422,
      );
    const cliente = await prisma.cliente.update({
      where: { id: antes.id },
      data: { numeroTarjeta },
      include: { localidad: true, saldo: true },
    });
    await auditar(
      req,
      "ASIGNAR_TARJETA",
      "Cliente",
      cliente.id,
      { teniaTarjeta: Boolean(antes.numeroTarjeta) },
      { tieneTarjeta: true },
    );
    res.json(presentarCliente(cliente));
  },
);

rutasClientes.patch(
  "/:id",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE),
  async (req, res) => {
    const datos = esquemaCliente
      .partial()
      .extend({
        numeroTarjeta: z.string().trim().min(3).max(30).nullable().optional(),
        activo: z.boolean().optional(),
      })
      .parse(req.body);
    const antes = await prisma.cliente.findUniqueOrThrow({
      where: { id: String(req.params.id) },
      include: { saldo: true },
    });
    if (datos.numeroTarjeta && Number(antes.saldo?.saldoActual ?? 0) <= 0) {
      throw new ErrorAplicacion(
        "TARJETA_SIN_SALDO",
        "La tarjeta solo puede asignarse a clientes con saldo pendiente.",
        422,
      );
    }
    const telefono = datos.telefono
      ? normalizarTelefono(datos.telefono)
      : undefined;
    const cliente = await prisma.cliente.update({
      where: { id: String(req.params.id) },
      data: {
        nombreCompleto: datos.nombreCompleto,
        localidadId: datos.localidadId,
        limiteCredito: datos.limiteCredito,
        notas: datos.notas,
        numeroTarjeta: datos.numeroTarjeta,
        activo: datos.activo,
        ...(telefono
          ? {
              telefonoCifrado: cifrarCampo(telefono),
              telefonoHash: hashBusqueda(telefono),
              telefonoUltimos4: telefono.slice(-4),
            }
          : {}),
        ...(datos.direccion
          ? { direccionCifrada: cifrarCampo(datos.direccion) }
          : {}),
      },
      include: { localidad: true, saldo: true },
    });
    await auditar(
      req,
      "ACTUALIZAR",
      "Cliente",
      cliente.id,
      { id: antes.id },
      { id: cliente.id },
    );
    res.json(presentarCliente(cliente));
  },
);

rutasClientes.get(
  "/:id/estado-cuenta",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE, RolUsuario.COBRADOR),
  async (req, res) => {
    const [cliente, movimientos] = await prisma.$transaction([
      prisma.cliente.findFirst({
        where: {
          id: String(req.params.id),
          ...filtroClientesDelActor(req.usuario!),
        },
        include: { saldo: true },
      }),
      prisma.movimientoSaldo.findMany({
        where: { clienteId: String(req.params.id) },
        orderBy: { creadoEn: "desc" },
        take: 200,
      }),
    ]);
    if (!cliente)
      throw new ErrorAplicacion(
        "CLIENTE_NO_ENCONTRADO",
        "No se encontro el cliente.",
        404,
      );
    res.json({ cliente: presentarCliente(cliente), movimientos });
  },
);
