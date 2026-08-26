import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { api, crearIdLocal, obtenerConectividad } from "../../api";
import {
  contarOperaciones,
  encolarOperaciones,
  guardarCache,
  leerCache,
  leerJornada,
} from "../../almacenLocal";
import type { Jornada, PedidoMovil, ProveedorMovil } from "../../tipos";
import { usarDatosVivosMovil } from "../../usarDatosVivosMovil";
import { dinero } from "../../utilidades/formato";
import { redondearMoneda } from "../../utilidades/dinero";
import type { Periodicidad, TipoVenta } from "../ventas/dominioVenta";
import {
  crearDatosEntrega,
  pedidosDelCliente,
  proyectarEntregaEnJornada,
  siguienteEstado,
  totalPedido,
  validarEntrega,
} from "./dominioPedidos";

export interface ParametrosPedidos {
  clienteId?: string;
  rutaId?: string;
  fecha?: string;
}

const fechaInicial = new Date(Date.now() + 7 * 86_400_000)
  .toISOString()
  .slice(0, 10);

export function usarPedidosMoviles(parametros: ParametrosPedidos, es: boolean) {
  const [pedidos, establecerPedidos] = useState<PedidoMovil[]>([]);
  const [cargando, establecerCargando] = useState(true);
  const [offline, establecerOffline] = useState(false);
  const [porConfirmar, establecerPorConfirmar] = useState(0);
  const [entrega, establecerEntrega] = useState<PedidoMovil | null>(null);
  const [gestion, establecerGestion] = useState<PedidoMovil | null>(null);
  const [tipo, establecerTipo] = useState<TipoVenta>("CREDITO");
  const [anticipo, establecerAnticipo] = useState("0");
  const [numeroTarjeta, establecerNumeroTarjeta] = useState("");
  const [cuota, establecerCuota] = useState("");
  const [periodicidad, establecerPeriodicidad] =
    useState<Periodicidad>("SEMANAL");
  const [fechaPlan, establecerFechaPlan] = useState(fechaInicial);
  const [guardando, establecerGuardando] = useState(false);
  const [proveedores, establecerProveedores] = useState<ProveedorMovil[]>([]);
  const [proveedoresPorItem, establecerProveedoresPorItem] = useState<
    Record<string, string>
  >({});

  const cargar = useCallback(async () => {
    establecerCargando(true);
    try {
      const pendientes = await contarOperaciones();
      establecerPorConfirmar(pendientes);
      if (pendientes > 0) {
        const [pedidosLocales, proveedoresLocales, red] = await Promise.all([
          leerCache<PedidoMovil[]>("pedidos_moviles"),
          leerCache<ProveedorMovil[]>("proveedores_moviles"),
          obtenerConectividad().catch(() => ({ conectada: false })),
        ]);
        if (pedidosLocales || proveedoresLocales) {
          establecerPedidos(pedidosLocales ?? []);
          establecerProveedores(proveedoresLocales ?? []);
          establecerOffline(!red.conectada);
          return;
        }
      }
      const [respuesta, catalogo] = await Promise.all([
        api<{ datos: PedidoMovil[] }>("/pedidos"),
        api<{ datos: ProveedorMovil[] }>("/proveedores/opciones"),
      ]);
      const activos = respuesta.datos.filter(
        (pedido) => !["ENTREGADO", "CANCELADO"].includes(pedido.estado),
      );
      establecerPedidos(activos);
      establecerProveedores(catalogo.datos);
      await Promise.all([
        guardarCache("pedidos_moviles", activos),
        guardarCache("proveedores_moviles", catalogo.datos),
      ]);
      establecerOffline(false);
    } catch {
      establecerPedidos(
        (await leerCache<PedidoMovil[]>("pedidos_moviles")) ?? [],
      );
      establecerProveedores(
        (await leerCache<ProveedorMovil[]>("proveedores_moviles")) ?? [],
      );
      establecerOffline(true);
    } finally {
      establecerCargando(false);
    }
  }, []);

  usarDatosVivosMovil(cargar);
  const visibles = useMemo(
    () => pedidosDelCliente(pedidos, parametros.clienteId),
    [pedidos, parametros.clienteId],
  );

  async function avanzar(pedido: PedidoMovil) {
    if (offline) {
      return Alert.alert(
        es ? "Necesitas conexión" : "Connection required",
        es
          ? "Los movimientos de almacén se confirman contra la existencia del servidor."
          : "Warehouse movements must be validated against server stock.",
      );
    }
    try {
      const estado = siguienteEstado[pedido.estado];
      const actualizado = await api<{ estado: string }>(
        `/pedidos/${pedido.id}/estado`,
        {
          method: "PATCH",
          body: JSON.stringify({ estado }),
        },
      );
      const pedidosActualizados = pedidos.map((actual) =>
        actual.id === pedido.id
          ? { ...actual, estado: actualizado.estado ?? estado }
          : actual,
      );
      establecerPedidos(pedidosActualizados);
      await guardarCache("pedidos_moviles", pedidosActualizados);
      await cargar();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Error");
    }
  }

  function abrirGestion(pedido: PedidoMovil) {
    establecerGestion(pedido);
    establecerProveedoresPorItem(
      Object.fromEntries(
        pedido.items.map((item) => [item.id, item.proveedor?.id ?? ""]),
      ),
    );
  }

  async function confirmarProveedor() {
    if (!gestion || guardando) return;
    if (offline)
      return Alert.alert(
        es ? "Necesitas conexión" : "Connection required",
        es
          ? "La asignación del proveedor se valida en el servidor para evitar compras duplicadas."
          : "Supplier assignment is validated by the server to prevent duplicate purchases.",
      );
    if (gestion.items.some((item) => !proveedoresPorItem[item.id]))
      return Alert.alert(es ? "Falta un proveedor" : "Supplier required");
    establecerGuardando(true);
    try {
      await api(`/pedidos/${gestion.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({
          estado: "PEDIDO_PROVEEDOR",
          proveedores: gestion.items.map((item) => ({
            itemPedidoId: item.id,
            proveedorId: proveedoresPorItem[item.id],
          })),
        }),
      });
      establecerGestion(null);
      await cargar();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Error");
    } finally {
      establecerGuardando(false);
    }
  }

  function abrirEntrega(pedido: PedidoMovil) {
    establecerEntrega(pedido);
    establecerTipo("CREDITO");
    establecerAnticipo("0");
    establecerNumeroTarjeta(pedido.cliente?.numeroTarjeta ?? "");
    establecerCuota("");
    establecerPeriodicidad("SEMANAL");
    establecerFechaPlan(fechaInicial);
  }

  async function confirmarEntrega() {
    if (!entrega || guardando) return;
    const total = totalPedido(entrega);
    const anticipoNumero = Number(anticipo || 0);
    const error = validarEntrega(
      total,
      tipo,
      anticipoNumero,
      cuota,
      fechaPlan,
      numeroTarjeta,
    );
    if (error === "ANTICIPO") {
      return Alert.alert(es ? "Anticipo inválido" : "Invalid deposit");
    }
    if (error === "PLAN") {
      return Alert.alert(
        es ? "Completa el plan de pago" : "Complete the payment plan",
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
    if (entrega.items.some((item) => !item.proveedor)) {
      return Alert.alert(
        es ? "Falta el proveedor" : "Supplier required",
        es
          ? "Administración, Contabilidad o Almacén deben asignarlo antes de que puedas entregar."
          : "Administration, Accounting, or Warehouse must assign it before delivery.",
      );
    }

    establecerGuardando(true);
    try {
      const datos = crearDatosEntrega({
        pedidoId: entrega.id,
        tipo,
        anticipo: anticipoNumero,
        total,
        numeroTarjeta,
        periodicidad,
        cuota,
        fecha: fechaPlan,
        fechaEntrega: new Date().toISOString(),
      });
      const actualizados = pedidos.filter((pedido) => pedido.id !== entrega.id);
      const jornada = await obtenerProyeccionJornada(
        parametros,
        entrega.id,
        tipo === "CREDITO" ? redondearMoneda(total - anticipoNumero) : 0,
      );
      const operacionId = crearIdLocal();
      await encolarOperaciones([{ id: operacionId, tipo: "ENTREGA", datos }], {
        caches: [{ clave: "pedidos_moviles", datos: actualizados }],
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
      establecerPedidos(actualizados);
      establecerEntrega(null);
      Alert.alert(
        es ? "Entrega guardada" : "Delivery saved",
        `${dinero.format(total)} · ${es ? "Folio local" : "Local receipt"} ${operacionId.slice(-8).toUpperCase()}\n${es ? "La venta, el saldo y el stock se confirmarán al sincronizar." : "Sale, balance, and stock will be confirmed during sync."}`,
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
    visibles,
    cargando,
    offline,
    porConfirmar,
    entrega,
    gestion,
    tipo,
    anticipo,
    numeroTarjeta,
    cuota,
    periodicidad,
    fechaPlan,
    guardando,
    proveedores,
    proveedoresPorItem,
    cargar,
    avanzar,
    abrirGestion,
    cerrarGestion: () => establecerGestion(null),
    confirmarProveedor,
    abrirEntrega,
    cerrarEntrega: () => establecerEntrega(null),
    confirmarEntrega,
    establecerTipo,
    establecerAnticipo,
    establecerNumeroTarjeta,
    establecerCuota,
    establecerPeriodicidad,
    establecerFechaPlan,
    establecerProveedor: (itemId: string, proveedorId: string) =>
      establecerProveedoresPorItem((actual) => ({
        ...actual,
        [itemId]: proveedorId,
      })),
  };
}

async function obtenerProyeccionJornada(
  parametros: ParametrosPedidos,
  pedidoId: string,
  montoFinanciado: number,
): Promise<Jornada | null> {
  if (!parametros.rutaId || !parametros.fecha || !parametros.clienteId) {
    return null;
  }
  const jornada = await leerJornada(parametros.rutaId, parametros.fecha);
  return jornada
    ? proyectarEntregaEnJornada(
        jornada,
        parametros.clienteId,
        pedidoId,
        montoFinanciado,
      )
    : null;
}

export type ControlPedidos = ReturnType<typeof usarPedidosMoviles>;
