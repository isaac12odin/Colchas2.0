import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { api, crearIdLocal, esFalloRealRed } from "../../api";
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
import {
  parsearDineroCapturado,
  redondearMoneda,
} from "../../utilidades/dinero";
import { fechaSugeridaPlanPago } from "../../utilidades/fechaLocal";
import { resolverProyeccionPendiente } from "../../utilidades/cacheOperativa";
import type {
  MetodoPago,
  Periodicidad,
  TipoVenta,
} from "../ventas/dominioVenta";
import {
  type BorradorNuevoPedido,
  crearDatosNuevoPedido,
  crearDatosEntrega,
  pedidosDelCliente,
  proyectarEntregaEnJornada,
  siguienteEstado,
  totalPedido,
  validarEntrega,
} from "./dominioPedidos";
import { cargarPedidosPermitidos } from "./cargaPedidosPermitida";

export interface ParametrosPedidos {
  clienteId?: string;
  rutaId?: string;
  fecha?: string;
}

async function consultarTodosLosPedidos() {
  const pedidos: PedidoMovil[] = [];
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const respuesta = await api<{
      datos: PedidoMovil[];
      paginacion?: { totalPaginas: number };
    }>(`/pedidos?pagina=${pagina}&limite=100`);
    pedidos.push(...respuesta.datos);
    totalPaginas = respuesta.paginacion?.totalPaginas ?? 1;
    pagina += 1;
  } while (pagina <= totalPaginas);
  return pedidos;
}

export function usarPedidosMoviles(
  parametros: ParametrosPedidos,
  es: boolean,
  puedeConsultarProveedores = false,
) {
  const [pedidos, establecerPedidos] = useState<PedidoMovil[]>([]);
  const [cargando, establecerCargando] = useState(true);
  const [offline, establecerOffline] = useState(false);
  const [porConfirmar, establecerPorConfirmar] = useState(0);
  const [errorCarga, establecerErrorCarga] = useState("");
  const [entrega, establecerEntrega] = useState<PedidoMovil | null>(null);
  const [gestion, establecerGestion] = useState<PedidoMovil | null>(null);
  const [tipo, establecerTipo] = useState<TipoVenta>("CREDITO");
  const [anticipo, establecerAnticipo] = useState("0");
  const [metodoAnticipo, establecerMetodoAnticipo] =
    useState<MetodoPago>("EFECTIVO");
  const [numeroTarjeta, establecerNumeroTarjeta] = useState("");
  const [cuota, establecerCuota] = useState("");
  const [periodicidad, establecerPeriodicidad] =
    useState<Periodicidad>("SEMANAL");
  const [fechaPlan, establecerFechaPlan] = useState(() =>
    fechaSugeridaPlanPago(),
  );
  const [guardando, establecerGuardando] = useState(false);
  const [nuevoAbierto, establecerNuevoAbierto] = useState(false);
  const [creandoPedido, establecerCreandoPedido] = useState(false);
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
        const [pedidosLocales, proveedoresLocales] = await Promise.all([
          leerCache<PedidoMovil[]>("pedidos_moviles"),
          leerCache<ProveedorMovil[]>("proveedores_moviles"),
        ]);
        const proyeccion = await resolverProyeccionPendiente({
          pendientes,
          cachePrincipal: pedidosLocales,
          revalidarSesion: () => api("/auth/sesion"),
        });
        if (proyeccion.usar) {
          establecerPedidos(proyeccion.datos);
          establecerProveedores(
            puedeConsultarProveedores ? (proveedoresLocales ?? []) : [],
          );
          establecerOffline(proyeccion.offline);
          establecerErrorCarga("");
          return;
        }
      }
      const remotos = await cargarPedidosPermitidos({
        puedeConsultarProveedores,
        consultarPedidos: consultarTodosLosPedidos,
        consultarProveedores: async () =>
          (await api<{ datos: ProveedorMovil[] }>("/proveedores/opciones"))
            .datos,
      });
      // Un rechazo del catálogo nunca se reemplaza por una copia anterior.
      const catalogo = remotos.proveedores ?? [];
      const activos = remotos.pedidos.filter(
        (pedido) => !["ENTREGADO", "CANCELADO"].includes(pedido.estado),
      );
      establecerPedidos(activos);
      establecerProveedores(catalogo);
      await Promise.all([
        guardarCache("pedidos_moviles", activos),
        ...(puedeConsultarProveedores
          ? [guardarCache("proveedores_moviles", catalogo)]
          : []),
      ]);
      establecerOffline(false);
      establecerErrorCarga(
        "errorProveedores" in remotos
          ? remotos.errorProveedores instanceof Error
            ? remotos.errorProveedores.message
            : es
              ? "No se pudo consultar el catálogo de proveedores."
              : "The supplier catalog could not be loaded."
          : "",
      );
    } catch (error) {
      if (esFalloRealRed(error)) {
        establecerPedidos(
          (await leerCache<PedidoMovil[]>("pedidos_moviles")) ?? [],
        );
        establecerProveedores(
          puedeConsultarProveedores
            ? ((await leerCache<ProveedorMovil[]>("proveedores_moviles")) ?? [])
            : [],
        );
        establecerOffline(true);
        establecerErrorCarga("");
      } else {
        establecerPedidos([]);
        establecerProveedores([]);
        establecerOffline(false);
        establecerErrorCarga(
          error instanceof Error
            ? error.message
            : es
              ? "El servidor rechazó la consulta de pedidos."
              : "The server rejected the orders request.",
        );
      }
    } finally {
      establecerCargando(false);
    }
  }, [puedeConsultarProveedores, es]);

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

  async function crearPedido(borrador: BorradorNuevoPedido) {
    if (offline) {
      Alert.alert(
        es ? "Necesitas conexión" : "Connection required",
        es
          ? "El pedido debe confirmarse con el servidor para evitar solicitudes duplicadas."
          : "The order must be confirmed by the server to prevent duplicate requests.",
      );
      return false;
    }
    establecerCreandoPedido(true);
    try {
      const creado = await api<PedidoMovil>("/pedidos", {
        method: "POST",
        body: JSON.stringify(crearDatosNuevoPedido(borrador)),
      });
      establecerNuevoAbierto(false);
      await cargar();
      Alert.alert(
        es ? "Pedido creado" : "Order created",
        es
          ? `${creado.folio} quedó pendiente de asignar proveedor. No se creó deuda ni se descontó inventario.`
          : `${creado.folio} is waiting for a supplier. No debt or stock movement was created.`,
      );
      return true;
    } catch (error) {
      Alert.alert(
        es ? "No se pudo crear el pedido" : "Unable to create order",
        error instanceof Error ? error.message : "Error",
      );
      return false;
    } finally {
      establecerCreandoPedido(false);
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
    establecerMetodoAnticipo("EFECTIVO");
    establecerNumeroTarjeta(pedido.cliente?.numeroTarjeta ?? "");
    establecerCuota("");
    establecerPeriodicidad("SEMANAL");
    establecerFechaPlan(fechaSugeridaPlanPago());
  }

  async function confirmarEntrega() {
    if (!entrega || guardando) return;
    const total = totalPedido(entrega);
    const anticipoNumero = parsearDineroCapturado(anticipo);
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
    if (anticipoNumero === null) return;
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
        metodoAnticipo,
      });
      const actualizados = pedidos.filter((pedido) => pedido.id !== entrega.id);
      const jornada = await obtenerProyeccionJornada(
        parametros,
        entrega.id,
        tipo === "CREDITO" ? redondearMoneda(total - anticipoNumero) : 0,
        tipo === "CREDITO" && total - anticipoNumero > 0
          ? {
              periodicidad,
              montoCuota: parsearDineroCapturado(cuota) ?? 0,
              primerVencimiento: fechaPlan,
            }
          : undefined,
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
    errorCarga,
    entrega,
    gestion,
    tipo,
    anticipo,
    metodoAnticipo,
    numeroTarjeta,
    cuota,
    periodicidad,
    fechaPlan,
    guardando,
    nuevoAbierto,
    creandoPedido,
    proveedores,
    proveedoresPorItem,
    cargar,
    abrirNuevo: () => establecerNuevoAbierto(true),
    cerrarNuevo: () => {
      if (!creandoPedido) establecerNuevoAbierto(false);
    },
    crearPedido,
    avanzar,
    abrirGestion,
    cerrarGestion: () => establecerGestion(null),
    confirmarProveedor,
    abrirEntrega,
    cerrarEntrega: () => establecerEntrega(null),
    confirmarEntrega,
    establecerTipo,
    establecerAnticipo,
    establecerMetodoAnticipo,
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
    ? proyectarEntregaEnJornada(
        jornada,
        parametros.clienteId,
        pedidoId,
        montoFinanciado,
        plan,
      )
    : null;
}

export type ControlPedidos = ReturnType<typeof usarPedidosMoviles>;
