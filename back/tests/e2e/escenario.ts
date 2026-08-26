import { randomUUID } from "node:crypto";

import argon2 from "argon2";
import { DiaSemana, RolUsuario } from "@prisma/client";

import { cifrarCampo, hashBusqueda } from "../../src/compartido/cifrado.js";
import { prisma } from "../../src/infraestructura/prisma.js";
import { crearTokenAcceso } from "../../src/seguridad/tokens.js";
import { asegurarUrlBasePruebas } from "../../scripts/base-pruebas.js";

/**
 * Fábrica aislada para pruebas con PostgreSQL real.
 * Todos los registros creados quedan identificados por UUID y se eliminan en
 * orden inverso a sus dependencias. Nunca limpia por fechas ni tablas completas.
 */
export class EscenarioPrueba {
  readonly marca = randomUUID().replaceAll("-", "").slice(0, 12);
  readonly usuarioIds = new Set<string>();
  readonly localidadIds = new Set<string>();
  readonly clienteIds = new Set<string>();
  readonly productoIds = new Set<string>();
  readonly categoriaProductoIds = new Set<string>();
  readonly proveedorIds = new Set<string>();
  readonly rutaIds = new Set<string>();
  readonly importacionesEsperadas: Array<{
    localidadNombre: string;
    localidadEstado: string;
    productoSku: string;
    clienteTarjeta: string;
    rutaNombre: string;
  }> = [];
  private secuenciaUsuarios = 0;
  private secuenciaRutas = 0;

  async crearUsuario(rol: RolUsuario) {
    this.secuenciaUsuarios += 1;
    const usuario = await prisma.usuario.create({
      data: {
        nombre: `E2E ${rol} ${this.secuenciaUsuarios} ${this.marca}`,
        correo: `${rol.toLowerCase()}-${this.secuenciaUsuarios}-${this.marca}@e2e.nexo.local`,
        hashContrasena: "hash-inutilizable-fuera-de-pruebas",
        rol,
        debeCambiarContrasena: false,
      },
    });
    this.usuarioIds.add(usuario.id);
    return {
      ...usuario,
      token: crearTokenAcceso({
        sub: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        debeCambiarContrasena: false,
        tokenVersion: usuario.tokenVersion,
      }),
    };
  }

  async crearUsuarioAutenticable(
    rol: RolUsuario,
    contrasena: string,
    debeCambiarContrasena = false,
  ) {
    this.secuenciaUsuarios += 1;
    const usuario = await prisma.usuario.create({
      data: {
        nombre: `E2E Login ${rol} ${this.secuenciaUsuarios} ${this.marca}`,
        correo: `login-${rol.toLowerCase()}-${this.secuenciaUsuarios}-${this.marca}@e2e.nexo.local`,
        hashContrasena: await argon2.hash(contrasena, {
          type: argon2.argon2id,
          memoryCost: 8_192,
          timeCost: 2,
          parallelism: 1,
        }),
        rol,
        debeCambiarContrasena,
      },
    });
    this.usuarioIds.add(usuario.id);
    return usuario;
  }

  async crearLocalidad(indice = 1) {
    const localidad = await prisma.localidad.create({
      data: {
        nombre: `E2E Localidad ${indice} ${this.marca}`,
        estado: "Estado de prueba",
      },
    });
    this.localidadIds.add(localidad.id);
    return localidad;
  }

  async crearCliente(
    localidadId: string,
    opciones: { indice?: number; saldo?: number; tarjeta?: string } = {},
  ) {
    const indice = opciones.indice ?? 1;
    const digitos = [...this.marca]
      .map((caracter) => (Number.parseInt(caracter, 16) % 10).toString())
      .join("");
    const telefono = `555${digitos.slice(0, 4)}${String(indice).padStart(3, "0")}`;
    const saldo = opciones.saldo ?? 0;
    const cliente = await prisma.cliente.create({
      data: {
        nombreCompleto: `E2E Cliente ${indice} ${this.marca}`,
        telefonoCifrado: cifrarCampo(telefono),
        telefonoHash: hashBusqueda(telefono),
        telefonoUltimos4: telefono.slice(-4),
        direccionCifrada: cifrarCampo(
          `Avenida Automatizada ${indice}, colonia Integridad ${this.marca}`,
        ),
        localidadId,
        numeroTarjeta: opciones.tarjeta,
        limiteCredito: 50_000,
        notas: `E2E:${this.marca}`,
        saldo: {
          create: {
            saldoActual: saldo,
            totalCargos: saldo,
          },
        },
      },
    });
    this.clienteIds.add(cliente.id);
    return { ...cliente, telefono };
  }

  async crearProducto(
    opciones: { indice?: number; existencia?: number; precio?: number } = {},
  ) {
    const indice = opciones.indice ?? 1;
    const categoriaId = await this.categoriaProductoId();
    const producto = await prisma.producto.create({
      data: {
        sku: `E2E-${this.marca}-${indice}`,
        nombre: `Producto automatizado ${indice} ${this.marca}`,
        marca: "Nexo E2E",
        categoria: "Pruebas",
        categoriaId,
        codigoBarras: `750${this.marca.slice(0, 8)}${indice}`,
        existencia: opciones.existencia ?? 0,
        existenciaMinima: 2,
        precioCompra: (opciones.precio ?? 100) / 2,
        precioVenta: opciones.precio ?? 100,
      },
    });
    this.productoIds.add(producto.id);
    return producto;
  }

  async categoriaProductoId() {
    const categoria = await prisma.categoriaProducto.upsert({
      where: { nombre: "Pruebas" },
      create: { nombre: "Pruebas", orden: 999 },
      update: { activo: true },
      select: { id: true },
    });
    return categoria.id;
  }

  async crearProveedor(indice = 1) {
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: `E2E Proveedor ${indice} ${this.marca}`,
        contacto: "Contacto de prueba",
        telefono: "5550009999",
        notas: `E2E:${this.marca}`,
      },
    });
    this.proveedorIds.add(proveedor.id);
    return proveedor;
  }

  async crearRuta(
    localidadIds: string[],
    clienteIds: string[],
    diaSemana: DiaSemana = DiaSemana.LUNES,
    cobradorId?: string,
  ) {
    this.secuenciaRutas += 1;
    const ruta = await prisma.ruta.create({
      data: {
        nombre: `E2E Ruta ${this.secuenciaRutas} ${this.marca}`,
        diaSemana,
        cobradorId,
        notas: `E2E:${this.marca}`,
        localidades: {
          create: localidadIds.map((localidadId, orden) => ({
            localidadId,
            orden: orden + 1,
          })),
        },
        clientes: {
          create: clienteIds.map((clienteId, orden) => ({
            clienteId,
            orden: orden + 1,
          })),
        },
      },
    });
    this.rutaIds.add(ruta.id);
    return ruta;
  }

  registrarLocalidad(id: string) {
    this.localidadIds.add(id);
  }

  registrarCliente(id: string) {
    this.clienteIds.add(id);
  }

  registrarProducto(id: string) {
    this.productoIds.add(id);
  }

  registrarCategoriaProducto(id: string) {
    this.categoriaProductoIds.add(id);
  }

  registrarRuta(id: string) {
    this.rutaIds.add(id);
  }

  /**
   * Registra las claves naturales antes de importar. Así la limpieza puede
   * localizar todos los registros aunque el test falle entre la respuesta de
   * importación y las consultas que recuperan sus UUID.
   */
  registrarImportacionEsperada(datos: {
    localidadNombre: string;
    localidadEstado: string;
    productoSku: string;
    clienteTarjeta: string;
    rutaNombre: string;
  }) {
    this.importacionesEsperadas.push(datos);
  }

  async limpiar() {
    for (const importacion of this.importacionesEsperadas) {
      const [localidades, productos, clientes, rutas] = await Promise.all([
        prisma.localidad.findMany({
          where: {
            nombre: importacion.localidadNombre,
            estado: importacion.localidadEstado,
          },
          select: { id: true },
        }),
        prisma.producto.findMany({
          where: { sku: importacion.productoSku },
          select: { id: true },
        }),
        prisma.cliente.findMany({
          where: { numeroTarjeta: importacion.clienteTarjeta },
          select: { id: true },
        }),
        prisma.ruta.findMany({
          where: { nombre: importacion.rutaNombre },
          select: { id: true },
        }),
      ]);
      localidades.forEach(({ id }) => this.localidadIds.add(id));
      productos.forEach(({ id }) => this.productoIds.add(id));
      clientes.forEach(({ id }) => this.clienteIds.add(id));
      rutas.forEach(({ id }) => this.rutaIds.add(id));
    }

    const usuarioIds = [...this.usuarioIds];
    const clienteIds = [...this.clienteIds];
    const productoIds = [...this.productoIds];
    const proveedorIds = [...this.proveedorIds];
    const rutaIds = [...this.rutaIds];

    await prisma.auditoria.deleteMany({
      where: {
        OR: [
          { usuarioId: { in: usuarioIds } },
          { datosDespues: { path: ["marcaE2e"], equals: this.marca } },
        ],
      },
    });
    await prisma.corteCaja.deleteMany({
      where: {
        OR: [
          { usuarioOperadorId: { in: usuarioIds } },
          { cerradoPorId: { in: usuarioIds } },
        ],
      },
    });
    await prisma.operacionSincronizada.deleteMany({
      where: { usuarioId: { in: usuarioIds } },
    });
    await prisma.loteSincronizacion.deleteMany({
      where: { usuarioId: { in: usuarioIds } },
    });
    await prisma.dispositivoSincronizacion.deleteMany({
      where: { usuarioId: { in: usuarioIds } },
    });
    await prisma.aplicacionAbono.deleteMany({
      where: { abono: { clienteId: { in: clienteIds } } },
    });
    await prisma.abono.deleteMany({
      where: {
        OR: [
          { clienteId: { in: clienteIds } },
          { usuarioId: { in: usuarioIds } },
        ],
      },
    });
    await prisma.devolucion.deleteMany({
      where: {
        OR: [
          { clienteId: { in: clienteIds } },
          { autorizadoPorId: { in: usuarioIds } },
          { usuarioOperadorId: { in: usuarioIds } },
        ],
      },
    });
    await prisma.pedidoVenta.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await prisma.venta.deleteMany({
      where: {
        OR: [
          { clienteId: { in: clienteIds } },
          { usuarioId: { in: usuarioIds } },
        ],
      },
    });
    await prisma.visitaCobranza.deleteMany({
      where: {
        OR: [
          { rutaId: { in: rutaIds } },
          { clienteId: { in: clienteIds } },
          { usuarioId: { in: usuarioIds } },
        ],
      },
    });
    await prisma.movimientoSaldo.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await prisma.movimientoInventario.deleteMany({
      where: {
        OR: [
          { productoId: { in: productoIds } },
          { usuarioId: { in: usuarioIds } },
        ],
      },
    });
    await prisma.compra.deleteMany({
      where: {
        OR: [
          { proveedorId: { in: proveedorIds } },
          { usuarioId: { in: usuarioIds } },
        ],
      },
    });
    await prisma.ruta.deleteMany({ where: { id: { in: rutaIds } } });
    await prisma.cliente.deleteMany({ where: { id: { in: clienteIds } } });
    await prisma.producto.deleteMany({ where: { id: { in: productoIds } } });
    await prisma.categoriaProducto.deleteMany({
      where: { id: { in: [...this.categoriaProductoIds] } },
    });
    await prisma.proveedor.deleteMany({
      where: { id: { in: proveedorIds } },
    });
    await prisma.localidad.deleteMany({
      where: { id: { in: [...this.localidadIds] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
  }
}

export function cabeceras(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function asegurarBaseDePruebas() {
  if (process.env.E2E_CONFIRM_DATABASE !== "SI")
    throw new Error(
      "Falta E2E_CONFIRM_DATABASE=SI. Ejecute la suite mediante npm run test:robustas.",
    );
  const valor = process.env.DATABASE_URL;
  if (!valor)
    throw new Error("DATABASE_URL no está configurada para las pruebas.");
  const url = new URL(valor);
  asegurarUrlBasePruebas(valor);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!local && process.env.E2E_ALLOW_REMOTE_DATABASE !== "SI")
    throw new Error(
      "La suite robusta bloqueó una base remota. Use una PostgreSQL local o confirme explícitamente E2E_ALLOW_REMOTE_DATABASE=SI sobre una base desechable.",
    );
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Las pruebas E2E no pueden ejecutarse con NODE_ENV=production.",
    );
}
