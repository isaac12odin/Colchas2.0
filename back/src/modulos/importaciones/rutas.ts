import { raw, Router } from "express";
import { DiaSemana, Prisma, RolUsuario } from "@prisma/client";
import { z } from "zod";
import ExcelJS from "exceljs";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import {
  cifrarCampo,
  descifrarCampo,
  hashBusqueda,
  normalizarTelefono,
  VERSION_HASH_BUSQUEDA,
} from "../../compartido/cifrado.js";
import { dineroNoNegativo, dineroPositivo } from "../../compartido/dinero.js";

export const rutasImportaciones = Router();
rutasImportaciones.use(autenticar, permitirPermiso("IMPORTACIONES_EJECUTAR"));

const MIMES_EXCEL = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
];
const recibirExcelBinario = raw({ type: MIMES_EXCEL, limit: "8mb" });

async function buscarClientePorTelefono(
  tx: Prisma.TransactionClient,
  telefono: string,
) {
  const actual = await tx.cliente.findFirst({
    where: {
      telefonoHash: hashBusqueda(telefono),
      telefonoHashVersion: VERSION_HASH_BUSQUEDA,
    },
    include: { saldo: true },
  });
  if (actual) return actual;
  const legados = await tx.cliente.findMany({
    where: {
      telefonoHashVersion: 0,
      telefonoUltimos4: telefono.slice(-4),
    },
    include: { saldo: true },
    take: 100,
  });
  return (
    legados.find(
      (cliente) =>
        normalizarTelefono(descifrarCampo(cliente.telefonoCifrado)) ===
        telefono,
    ) ?? null
  );
}

function texto(valor: ExcelJS.CellValue) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object" && "result" in valor)
    return String(valor.result ?? "").trim();
  if (typeof valor === "object" && "text" in valor)
    return String(valor.text ?? "").trim();
  return String(valor).trim();
}

function numero(valor: ExcelJS.CellValue, campo: string, fila: number) {
  const convertido = Number(texto(valor) || 0);
  if (!Number.isFinite(convertido) || convertido < 0)
    throw new ErrorAplicacion(
      "IMPORTACION_INVALIDA",
      `${campo} invalido en la fila ${fila}.`,
      422,
    );
  return convertido;
}

function numeroMonetario(
  valor: ExcelJS.CellValue,
  campo: string,
  fila: number,
  positivo = false,
) {
  const convertido = Number(texto(valor) || 0);
  const validado = (positivo ? dineroPositivo : dineroNoNegativo).safeParse(
    convertido,
  );
  if (!validado.success)
    throw new ErrorAplicacion(
      "IMPORTACION_INVALIDA",
      `${campo} debe ser finito y usar máximo dos decimales en la fila ${fila}.`,
      422,
    );
  return validado.data;
}

function filas(hoja?: ExcelJS.Worksheet) {
  if (!hoja) return [];
  const resultado: ExcelJS.Row[] = [];
  hoja.eachRow((fila, indice) => {
    const valores = Array.isArray(fila.values)
      ? fila.values
      : Object.values(fila.values);
    if (
      indice > 1 &&
      valores.some((valor) => texto(valor as ExcelJS.CellValue))
    )
      resultado.push(fila);
  });
  return resultado;
}

async function resolverCategoriaImportada(
  tx: Prisma.TransactionClient,
  nombreRecibido: string,
) {
  const nombre = nombreRecibido || "Sin clasificar";
  const existente = await tx.categoriaProducto.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
  });
  if (existente)
    return existente.activo
      ? existente
      : tx.categoriaProducto.update({
          where: { id: existente.id },
          data: { activo: true },
        });
  return tx.categoriaProducto.create({ data: { nombre, orden: 100 } });
}

function diaSemana(valor: string) {
  const normalizado = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (!Object.values(DiaSemana).includes(normalizado as DiaSemana))
    throw new ErrorAplicacion(
      "DIA_INVALIDO",
      `Dia de ruta invalido: ${valor}.`,
      422,
    );
  return normalizado as DiaSemana;
}

function agregarEncabezado(hoja: ExcelJS.Worksheet, columnas: string[]) {
  hoja.addRow(columnas);
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F62FE" },
  };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  columnas.forEach((_, indice) => {
    hoja.getColumn(indice + 1).width = 22;
  });
}

rutasImportaciones.get("/plantilla.xlsx", async (_req, res) => {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Vektra";
  agregarEncabezado(libro.addWorksheet("Localidades"), ["Nombre", "Estado"]);
  agregarEncabezado(libro.addWorksheet("Productos"), [
    "SKU",
    "Nombre",
    "Marca",
    "Categoria",
    "CodigoBarras",
    "CodigoQR",
    "Existencia",
    "ExistenciaMinima",
    "PrecioCompra",
    "PrecioVenta",
  ]);
  agregarEncabezado(libro.addWorksheet("Clientes"), [
    "Nombre",
    "Telefono",
    "Direccion",
    "Localidad",
    "Estado",
    "SaldoInicial",
    "NumeroTarjeta",
    "LimiteCredito",
  ]);
  agregarEncabezado(libro.addWorksheet("Rutas"), [
    "Nombre",
    "Dia",
    "LocalidadesSeparadasPorPuntoYComa",
    "CorreoCobradorOpcional",
  ]);
  agregarEncabezado(libro.addWorksheet("RutaClientes"), [
    "Ruta",
    "NumeroTarjeta",
    "Telefono",
  ]);
  const instrucciones = libro.addWorksheet("LEEME");
  instrucciones.addRows([
    ["Importación inicial segura de Vektra"],
    ["1. No cambie los nombres de las hojas ni encabezados."],
    ["2. Importe localidades antes de referenciarlas en clientes o rutas."],
    ["3. Una tarjeta solo se acepta cuando SaldoInicial es mayor que cero."],
    ["4. Para RutaClientes use tarjeta o telefono; no necesita ambos."],
    [
      "5. Sin CorreoCobradorOpcional la ruta queda disponible sólo para cobranza administrativa en web.",
    ],
    [
      "6. La importacion es transaccional: si una fila falla no se guarda ninguna.",
    ],
  ]);
  instrucciones.getColumn(1).width = 95;
  instrucciones.getRow(1).font = {
    bold: true,
    size: 16,
    color: { argb: "FF0F62FE" },
  };
  const buffer = await libro.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="plantilla-importacion-vektra.xlsx"',
  );
  res.send(Buffer.from(buffer));
});

rutasImportaciones.post("/excel", recibirExcelBinario, async (req, res) => {
  // El binario evita mantener simultáneamente File + Data URL + JSON (~33 %
  // extra). Se conserva JSON/Base64 temporalmente para clientes anteriores.
  const contenido = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(
        z
          .object({ archivoBase64: z.string().min(100).max(10_500_000) })
          .parse(req.body).archivoBase64,
        "base64",
      );
  if (contenido.length < 100)
    throw new ErrorAplicacion(
      "EXCEL_VACIO",
      "Seleccione un archivo XLSX con información.",
      422,
    );
  if (contenido.length > 7_500_000)
    throw new ErrorAplicacion(
      "ARCHIVO_GRANDE",
      "El Excel no puede superar 7.5 MB.",
      413,
    );
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(contenido);
  } catch {
    throw new ErrorAplicacion(
      "EXCEL_INVALIDO",
      "No fue posible leer el archivo XLSX.",
      422,
    );
  }

  const resumen = await prisma.$transaction(
    async (tx) => {
      let localidades = 0;
      let productos = 0;
      let clientes = 0;
      let rutas = 0;
      let asignaciones = 0;

      for (const fila of filas(libro.getWorksheet("Localidades"))) {
        const nombre = texto(fila.getCell(1).value);
        const estado = texto(fila.getCell(2).value);
        if (nombre.length < 2 || estado.length < 2)
          throw new ErrorAplicacion(
            "IMPORTACION_INVALIDA",
            `Localidad incompleta en la fila ${fila.number}.`,
            422,
          );
        await tx.localidad.upsert({
          where: { nombre_estado: { nombre, estado } },
          create: { nombre, estado },
          update: { activo: true },
        });
        localidades += 1;
      }

      for (const fila of filas(libro.getWorksheet("Productos"))) {
        const sku = texto(fila.getCell(1).value);
        const nombre = texto(fila.getCell(2).value);
        const marca = texto(fila.getCell(3).value);
        if (sku.length < 2 || nombre.length < 2 || !marca)
          throw new ErrorAplicacion(
            "IMPORTACION_INVALIDA",
            `Producto incompleto en la fila ${fila.number}.`,
            422,
          );
        const existencia = Math.trunc(
          numero(fila.getCell(7).value, "Existencia", fila.number),
        );
        const existente = await tx.producto.findUnique({ where: { sku } });
        const categoria = await resolverCategoriaImportada(
          tx,
          texto(fila.getCell(4).value),
        );
        const producto = await tx.producto.upsert({
          where: { sku },
          create: {
            sku,
            nombre,
            marca,
            categoria: categoria.nombre,
            categoriaId: categoria.id,
            codigoBarras: texto(fila.getCell(5).value) || undefined,
            codigoQr: texto(fila.getCell(6).value) || undefined,
            existencia,
            existenciaMinima: Math.trunc(
              numero(fila.getCell(8).value, "Existencia minima", fila.number),
            ),
            precioCompra: numeroMonetario(
              fila.getCell(9).value,
              "Precio compra",
              fila.number,
            ),
            precioVenta: numeroMonetario(
              fila.getCell(10).value,
              "Precio venta",
              fila.number,
              true,
            ),
          },
          update: {
            nombre,
            marca,
            categoria: categoria.nombre,
            categoriaId: categoria.id,
            codigoBarras: texto(fila.getCell(5).value) || null,
            codigoQr: texto(fila.getCell(6).value) || null,
            existencia,
            existenciaMinima: Math.trunc(
              numero(fila.getCell(8).value, "Existencia minima", fila.number),
            ),
            precioCompra: numeroMonetario(
              fila.getCell(9).value,
              "Precio compra",
              fila.number,
            ),
            precioVenta: numeroMonetario(
              fila.getCell(10).value,
              "Precio venta",
              fila.number,
              true,
            ),
            activo: true,
          },
        });
        const anterior = existente?.existencia ?? 0;
        if (existencia !== anterior)
          await tx.movimientoInventario.create({
            data: {
              productoId: producto.id,
              usuarioId: req.usuario!.id,
              tipo:
                existencia > anterior ? "AJUSTE_POSITIVO" : "AJUSTE_NEGATIVO",
              cantidad: Math.abs(existencia - anterior),
              existenciaAntes: anterior,
              existenciaDespues: existencia,
              referenciaTipo: "IMPORTACION",
              notas: "Importacion inicial desde Excel",
            },
          });
        productos += 1;
      }

      for (const fila of filas(libro.getWorksheet("Clientes"))) {
        const nombreCompleto = texto(fila.getCell(1).value);
        const telefono = normalizarTelefono(texto(fila.getCell(2).value));
        const direccion = texto(fila.getCell(3).value);
        const localidadNombre = texto(fila.getCell(4).value);
        const estado = texto(fila.getCell(5).value);
        const saldoInicial = numeroMonetario(
          fila.getCell(6).value,
          "Saldo inicial",
          fila.number,
        );
        const numeroTarjeta = texto(fila.getCell(7).value) || null;
        if (
          nombreCompleto.length < 3 ||
          telefono.length < 7 ||
          direccion.length < 5
        )
          throw new ErrorAplicacion(
            "IMPORTACION_INVALIDA",
            `Cliente incompleto en la fila ${fila.number}.`,
            422,
          );
        if (numeroTarjeta && saldoInicial <= 0)
          throw new ErrorAplicacion(
            "TARJETA_SIN_SALDO",
            `La tarjeta de la fila ${fila.number} requiere saldo inicial.`,
            422,
          );
        const localidad = await tx.localidad.findUnique({
          where: { nombre_estado: { nombre: localidadNombre, estado } },
        });
        if (!localidad)
          throw new ErrorAplicacion(
            "LOCALIDAD_NO_ENCONTRADA",
            `No existe ${localidadNombre}, ${estado} (fila ${fila.number}).`,
            422,
          );
        const telefonoHash = hashBusqueda(telefono);
        const existente =
          (numeroTarjeta
            ? await tx.cliente.findUnique({
                where: { numeroTarjeta },
                include: { saldo: true },
              })
            : null) ?? (await buscarClientePorTelefono(tx, telefono));
        if (
          existente &&
          Number(existente.saldo?.saldoActual ?? 0) !== saldoInicial
        )
          throw new ErrorAplicacion(
            "SALDO_EXISTENTE",
            `El cliente de la fila ${fila.number} ya tiene un saldo diferente; no se duplico.`,
            409,
          );
        if (existente) {
          await tx.cliente.update({
            where: { id: existente.id },
            data: {
              nombreCompleto,
              telefonoCifrado: cifrarCampo(telefono),
              telefonoHash,
              telefonoHashVersion: VERSION_HASH_BUSQUEDA,
              telefonoUltimos4: telefono.slice(-4),
              direccionCifrada: cifrarCampo(direccion),
              localidadId: localidad.id,
              numeroTarjeta,
              limiteCredito: numeroMonetario(
                fila.getCell(8).value,
                "Limite",
                fila.number,
              ),
              activo: true,
            },
          });
        } else {
          const cliente = await tx.cliente.create({
            data: {
              nombreCompleto,
              telefonoCifrado: cifrarCampo(telefono),
              telefonoHash,
              telefonoHashVersion: VERSION_HASH_BUSQUEDA,
              telefonoUltimos4: telefono.slice(-4),
              direccionCifrada: cifrarCampo(direccion),
              localidadId: localidad.id,
              numeroTarjeta,
              limiteCredito: numeroMonetario(
                fila.getCell(8).value,
                "Limite",
                fila.number,
              ),
              saldo: {
                create: {
                  saldoActual: saldoInicial,
                  totalCargos: saldoInicial,
                },
              },
            },
          });
          if (saldoInicial > 0)
            await tx.movimientoSaldo.create({
              data: {
                clienteId: cliente.id,
                tipo: "AJUSTE_CARGO",
                monto: saldoInicial,
                saldoAnterior: 0,
                saldoNuevo: saldoInicial,
                concepto: "Saldo inicial importado desde Excel",
              },
            });
        }
        clientes += 1;
      }

      for (const fila of filas(libro.getWorksheet("Rutas"))) {
        const nombre = texto(fila.getCell(1).value);
        const dia = diaSemana(texto(fila.getCell(2).value));
        const correoCobrador = texto(fila.getCell(4).value).toLowerCase();
        const nombresLocalidad = texto(fila.getCell(3).value)
          .split(";")
          .map((valor) => valor.trim())
          .filter(Boolean);
        if (nombre.length < 2 || nombresLocalidad.length === 0)
          throw new ErrorAplicacion(
            "IMPORTACION_INVALIDA",
            `Ruta incompleta en la fila ${fila.number}.`,
            422,
          );
        const localidadesRuta = await tx.localidad.findMany({
          where: {
            nombre: { in: nombresLocalidad, mode: "insensitive" },
            activo: true,
          },
        });
        if (localidadesRuta.length !== nombresLocalidad.length)
          throw new ErrorAplicacion(
            "LOCALIDAD_NO_ENCONTRADA",
            `Revise las localidades de la ruta en la fila ${fila.number}.`,
            422,
          );
        const [rutaExistente, cobrador] = await Promise.all([
          tx.ruta.findUnique({ where: { nombre } }),
          correoCobrador
            ? tx.usuario.findFirst({
                where: {
                  correo: correoCobrador,
                  rol: RolUsuario.COBRADOR,
                  activo: true,
                },
                select: { id: true },
              })
            : Promise.resolve(null),
        ]);
        if (correoCobrador && !cobrador)
          throw new ErrorAplicacion(
            "COBRADOR_NO_ENCONTRADO",
            `El cobrador de la ruta en la fila ${fila.number} no existe, está inactivo o no tiene rol COBRADOR.`,
            422,
          );
        const cobradorId = cobrador?.id ?? rutaExistente?.cobradorId ?? null;
        const ruta = await tx.ruta.upsert({
          where: { nombre },
          create: {
            nombre,
            diaSemana: dia,
            cobradorId,
            activa: true,
          },
          update: {
            diaSemana: dia,
            cobradorId,
            activa: true,
          },
        });
        await tx.rutaLocalidad.deleteMany({ where: { rutaId: ruta.id } });
        await tx.rutaLocalidad.createMany({
          data: localidadesRuta.map((localidad, orden) => ({
            rutaId: ruta.id,
            localidadId: localidad.id,
            orden,
          })),
        });
        const clientesRuta = await tx.cliente.findMany({
          where: {
            activo: true,
            localidadId: { in: localidadesRuta.map((l) => l.id) },
          },
          orderBy: { nombreCompleto: "asc" },
        });
        for (let orden = 0; orden < clientesRuta.length; orden += 1)
          await tx.rutaCliente.upsert({
            where: {
              rutaId_clienteId: {
                rutaId: ruta.id,
                clienteId: clientesRuta[orden]!.id,
              },
            },
            create: {
              rutaId: ruta.id,
              clienteId: clientesRuta[orden]!.id,
              orden,
            },
            update: { activo: true, orden },
          });
        rutas += 1;
      }

      for (const fila of filas(libro.getWorksheet("RutaClientes"))) {
        const ruta = await tx.ruta.findUnique({
          where: { nombre: texto(fila.getCell(1).value) },
        });
        const tarjeta = texto(fila.getCell(2).value);
        const telefono = normalizarTelefono(texto(fila.getCell(3).value));
        const cliente = tarjeta
          ? await tx.cliente.findUnique({ where: { numeroTarjeta: tarjeta } })
          : await buscarClientePorTelefono(tx, telefono);
        if (!ruta || !cliente)
          throw new ErrorAplicacion(
            "ASIGNACION_INVALIDA",
            `No se encontro ruta o cliente en la fila ${fila.number}.`,
            422,
          );
        await tx.rutaCliente.upsert({
          where: {
            rutaId_clienteId: { rutaId: ruta.id, clienteId: cliente.id },
          },
          create: { rutaId: ruta.id, clienteId: cliente.id },
          update: { activo: true },
        });
        asignaciones += 1;
      }
      await tx.auditoria.create({
        data: {
          usuarioId: req.usuario!.id,
          accion: "IMPORTAR_EXCEL",
          entidad: "Importacion",
          datosDespues: {
            localidades,
            productos,
            clientes,
            rutas,
            asignaciones,
          },
        },
      });
      return { localidades, productos, clientes, rutas, asignaciones };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 60_000,
    },
  );
  res.status(201).json({ resumen });
});
