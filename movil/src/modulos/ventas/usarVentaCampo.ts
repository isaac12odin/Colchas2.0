import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";

import { crearIdLocal } from "../../api";
import { encolarOperaciones, leerCache, leerJornada } from "../../almacenLocal";
import type { Jornada, ProductoMovil } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import { fechaSugeridaPlanPago } from "../../utilidades/fechaLocal";
import { parsearDineroCapturado } from "../../utilidades/dinero";
import {
  calcularImportes,
  cambiarCantidadCarrito,
  crearDatosVenta,
  descontarCatalogo,
  filtrarCatalogo,
  proyectarSaldoVenta,
  validarVenta,
  type LineaCarrito,
  type MetodoPago,
  type PasoVenta,
  type Periodicidad,
  type TipoVenta,
} from "./dominioVenta";

export interface ParametrosVenta {
  clienteId?: string;
  cliente?: string;
  rutaId?: string;
  fecha?: string;
  numeroTarjeta?: string;
}

export function usarVentaCampo(parametros: ParametrosVenta, es: boolean) {
  const [catalogo, establecerCatalogo] = useState<ProductoMovil[]>([]);
  const [busqueda, establecerBusqueda] = useState("");
  const [carrito, establecerCarrito] = useState<LineaCarrito[]>([]);
  const [tipo, establecerTipo] = useState<TipoVenta>(
    parametros.clienteId ? "CREDITO" : "CONTADO",
  );
  const [anticipo, establecerAnticipo] = useState("0");
  const [metodoAnticipo, establecerMetodoAnticipo] =
    useState<MetodoPago>("EFECTIVO");
  const [numeroTarjeta, establecerNumeroTarjeta] = useState(
    parametros.numeroTarjeta ?? "",
  );
  const [cuota, establecerCuota] = useState("");
  const [periodicidad, establecerPeriodicidad] =
    useState<Periodicidad>("SEMANAL");
  const [primerVencimiento, establecerPrimerVencimiento] = useState(() =>
    fechaSugeridaPlanPago(),
  );
  const [paso, establecerPaso] = useState<PasoVenta>("PRODUCTOS");
  const [guardando, establecerGuardando] = useState(false);

  useEffect(() => {
    void leerCache<ProductoMovil[]>("catalogo_productos").then((datos) =>
      establecerCatalogo(datos ?? []),
    );
  }, []);

  const visibles = useMemo(
    () => filtrarCatalogo(catalogo, busqueda),
    [catalogo, busqueda],
  );
  const importes = useMemo(
    () => calcularImportes(carrito, tipo, anticipo),
    [carrito, tipo, anticipo],
  );

  function cambiarCantidad(producto: ProductoMovil, cambio: number) {
    establecerCarrito((actual) =>
      cambiarCantidadCarrito(actual, producto, cambio),
    );
  }

  function continuarPago() {
    if (!carrito.length) {
      Alert.alert(
        es ? "Agrega al menos un producto" : "Add at least one product",
      );
      return;
    }
    establecerPaso("PAGO");
  }

  function revisar() {
    const error = validarVenta({
      carrito,
      tipo,
      clienteId: parametros.clienteId,
      total: importes.total,
      anticipo: importes.anticipoNumero,
      anticipoValido: importes.anticipoValido,
      numeroTarjeta,
      cuota,
      primerVencimiento,
    });
    if (error === "PRODUCTO") {
      return Alert.alert(es ? "Agrega un producto" : "Add a product");
    }
    if (error === "ANTICIPO") {
      return Alert.alert(es ? "Anticipo inválido" : "Invalid deposit");
    }
    if (error === "CREDITO") {
      return Alert.alert(
        es ? "Completa el crédito" : "Complete credit details",
        es
          ? "Indica cuota y primer vencimiento."
          : "Enter the installment and first due date.",
      );
    }
    if (error === "TARJETA") {
      return Alert.alert(
        es ? "Asigna la tarjeta" : "Assign the card",
        es
          ? "Escribe el número que tú usarás para identificar este crédito."
          : "Enter the number you will use to identify this credit.",
      );
    }
    establecerPaso("CONFIRMAR");
  }

  async function confirmar() {
    if (guardando) return;
    establecerGuardando(true);
    try {
      const operacionId = crearIdLocal();
      const datos = crearDatosVenta({
        clienteId: parametros.clienteId,
        tipo,
        anticipo: importes.anticipoNumero,
        numeroTarjeta,
        carrito,
        periodicidad,
        cuota,
        primerVencimiento,
        fechaVenta: new Date().toISOString(),
        metodoAnticipo,
      });
      const catalogoActualizado = descontarCatalogo(catalogo, carrito);
      const jornada = await obtenerProyeccionJornada(
        parametros,
        importes.financiado,
        importes.financiado > 0
          ? {
              periodicidad,
              montoCuota: parsearDineroCapturado(cuota) ?? 0,
              primerVencimiento,
            }
          : undefined,
      );
      await encolarOperaciones([{ id: operacionId, tipo: "VENTA", datos }], {
        caches: [{ clave: "catalogo_productos", datos: catalogoActualizado }],
        ...(jornada && parametros.rutaId && parametros.fecha
          ? {
              jornada: {
                rutaId: parametros.rutaId,
                fecha: parametros.fecha,
                datos: jornada,
              },
            }
          : {}),
      });
      Alert.alert(
        es ? "Venta protegida en el equipo" : "Sale secured on device",
        `${dinero.format(importes.total)} · ${es ? "Folio local" : "Local receipt"} ${operacionId.slice(-8).toUpperCase()}\n${es ? "Se enviará una sola vez al sincronizar." : "It will be sent exactly once when synchronized."}`,
        [{ text: es ? "Listo" : "Done", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        es ? "No se pudo guardar" : "Unable to save",
        error instanceof Error ? error.message : "Error",
      );
    } finally {
      establecerGuardando(false);
    }
  }

  return {
    catalogo,
    visibles,
    busqueda,
    carrito,
    tipo,
    anticipo,
    metodoAnticipo,
    numeroTarjeta,
    cuota,
    periodicidad,
    primerVencimiento,
    paso,
    guardando,
    permiteCredito: Boolean(parametros.clienteId),
    ...importes,
    establecerBusqueda,
    establecerTipo,
    establecerAnticipo,
    establecerMetodoAnticipo,
    establecerNumeroTarjeta,
    establecerCuota,
    establecerPeriodicidad,
    establecerPrimerVencimiento,
    continuarPago,
    volverProductos: () => establecerPaso("PRODUCTOS"),
    editar: () => establecerPaso("PAGO"),
    cambiarCantidad,
    revisar,
    confirmar,
  };
}

async function obtenerProyeccionJornada(
  parametros: ParametrosVenta,
  financiado: number,
  plan?: {
    periodicidad: Periodicidad;
    montoCuota: number;
    primerVencimiento: string;
  },
): Promise<Jornada | null> {
  if (!parametros.rutaId || !parametros.fecha || !parametros.clienteId) {
    return null;
  }
  const jornada = await leerJornada(parametros.rutaId, parametros.fecha);
  return jornada
    ? proyectarSaldoVenta(jornada, parametros.clienteId, financiado, plan)
    : null;
}

export type ControlVenta = ReturnType<typeof usarVentaCampo>;
