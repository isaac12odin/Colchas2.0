import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { api, crearIdLocal, esFalloRealRed } from "../../api";
import {
  contarOperaciones,
  encolarOperaciones,
  guardarJornada,
  leerJornada,
} from "../../almacenLocal";
import type { ClienteJornada, Jornada } from "../../tipos";
import { usarDatosVivosMovil } from "../../usarDatosVivosMovil";
import { fechaCalendarioLocal } from "../../utilidades/fechaLocal";
import { resolverProyeccionPendiente } from "../../utilidades/cacheOperativa";
import {
  aplicarVisitaLocal,
  agregarClienteExtraordinario,
  calcularResumenJornada,
  crearOperacionesVisita,
  cuotaEsperada,
  type MetodoAbono,
  type ResultadoVisita,
} from "./dominioJornada";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export type ModoCliente = "ACCIONES" | "COBRO";

export function usarJornadaRuta(rutaId: string, es: boolean) {
  const fecha = fechaCalendarioLocal();
  const [jornada, establecerJornada] = useState<Jornada | null>(null);
  const [cargando, establecerCargando] = useState(true);
  const [offline, establecerOffline] = useState(false);
  const [pendientes, establecerPendientes] = useState(0);
  const [errorCarga, establecerErrorCarga] = useState("");
  const [cliente, establecerCliente] = useState<ClienteJornada | null>(null);
  const [modo, establecerModo] = useState<ModoCliente>("ACCIONES");
  const [monto, establecerMonto] = useState("");
  const [metodo, establecerMetodo] = useState<MetodoAbono>("EFECTIVO");
  const [referencia, establecerReferencia] = useState("");
  const [notas, establecerNotas] = useState("");
  const [guardando, establecerGuardando] = useState(false);

  const cargar = useCallback(async () => {
    establecerCargando(true);
    try {
      const totalPendientes = await contarOperaciones();
      if (totalPendientes > 0) {
        const local = await leerJornada(rutaId, fecha);
        const proyeccion = await resolverProyeccionPendiente({
          pendientes: totalPendientes,
          cachePrincipal: local,
          revalidarSesion: () => api("/auth/sesion"),
        });
        if (proyeccion.usar) {
          establecerJornada(proyeccion.datos);
          establecerPendientes(totalPendientes);
          establecerOffline(proyeccion.offline);
          establecerErrorCarga("");
          return;
        }
      }
      const remota = await api<Jornada>(
        `/rutas/${rutaId}/jornada?fecha=${new Date(`${fecha}T12:00:00`).toISOString()}`,
      );
      establecerJornada(remota);
      await guardarJornada(rutaId, fecha, remota);
      establecerOffline(false);
      establecerErrorCarga("");
    } catch (error) {
      if (esFalloRealRed(error)) {
        establecerJornada(await leerJornada(rutaId, fecha));
        establecerOffline(true);
        establecerErrorCarga("");
      } else {
        establecerJornada(null);
        establecerOffline(false);
        establecerErrorCarga(
          error instanceof Error
            ? error.message
            : es
              ? "El servidor rechazó la jornada."
              : "The server rejected the route schedule.",
        );
      }
    } finally {
      establecerCargando(false);
      establecerPendientes(await contarOperaciones());
    }
  }, [rutaId, fecha, es]);

  usarDatosVivosMovil(cargar);

  const resumen = useMemo(() => calcularResumenJornada(jornada), [jornada]);

  function abrirCliente(seleccionado: ClienteJornada) {
    establecerCliente(seleccionado);
    establecerModo("ACCIONES");
    establecerMonto(String(cuotaEsperada(seleccionado) || ""));
    establecerMetodo("EFECTIVO");
    establecerReferencia("");
    establecerNotas("");
  }

  async function agregarExtraordinario(seleccionado: ClienteJornada) {
    if (!jornada) return;
    const nueva = agregarClienteExtraordinario(jornada, seleccionado);
    establecerJornada(nueva);
    await guardarJornada(rutaId, fecha, nueva);
    abrirCliente({
      ...seleccionado,
      fueraDeRuta: true,
      orden: nueva.clientes.length,
    });
  }

  async function guardarVisita(resultado: ResultadoVisita, pago = 0) {
    if (!cliente || !jornada || guardando) return;
    if (
      resultado === "PAGO" &&
      (!(pago > 0) || pago > Number(cliente.saldo?.saldoActual ?? 0))
    ) {
      return Alert.alert(
        es ? "Revisa el monto" : "Check the amount",
        es
          ? "Debe ser mayor a cero y no superar el saldo."
          : "It must be greater than zero and not exceed the balance.",
      );
    }

    establecerGuardando(true);
    try {
      const visitaId = crearIdLocal();
      const fechaVisita = new Date().toISOString();
      const operaciones = crearOperacionesVisita({
        visitaId,
        abonoId: resultado === "PAGO" ? crearIdLocal() : undefined,
        rutaId,
        clienteId: cliente.id,
        fechaProgramada: new Date(`${fecha}T12:00:00`).toISOString(),
        fechaVisita,
        resultado,
        monto: pago,
        metodo,
        referencia: referencia || undefined,
        notas: notas || undefined,
      });
      const nueva = aplicarVisitaLocal(
        jornada,
        cliente.id,
        resultado,
        pago,
        fechaVisita,
      );
      await encolarOperaciones(operaciones, {
        jornada: { rutaId, fecha, datos: nueva },
      });
      establecerJornada(nueva);
      establecerPendientes(await contarOperaciones());
      establecerCliente(null);
      mostrarRecibo(resultado, pago, visitaId, es);
    } catch (error) {
      Alert.alert(
        es ? "No se pudo guardar" : "Unable to save",
        error instanceof Error ? error.message : "Error",
      );
    } finally {
      establecerGuardando(false);
    }
  }

  function confirmarResultado(resultado: Exclude<ResultadoVisita, "PAGO">) {
    Alert.alert(
      resultado === "NO_PAGO"
        ? es
          ? "Registrar que no pagó"
          : "Record no payment"
        : es
          ? "Registrar ausencia"
          : "Record absence",
      es
        ? "Esta acción quedará en el historial de la ruta."
        : "This action will remain in the route history.",
      [
        { text: es ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: es ? "Confirmar" : "Confirm",
          onPress: () => void guardarVisita(resultado),
        },
      ],
    );
  }

  return {
    rutaId,
    fecha,
    jornada,
    cargando,
    offline,
    pendientes,
    errorCarga,
    resumen,
    cliente,
    modo,
    monto,
    metodo,
    referencia,
    notas,
    guardando,
    abrirCliente,
    agregarExtraordinario,
    cerrarCliente: () => establecerCliente(null),
    mostrarCobro: () => establecerModo("COBRO"),
    mostrarAcciones: () => establecerModo("ACCIONES"),
    establecerMonto,
    establecerMetodo,
    establecerReferencia,
    establecerNotas,
    guardarVisita,
    confirmarResultado,
  };
}

function mostrarRecibo(
  resultado: ResultadoVisita,
  monto: number,
  visitaId: string,
  es: boolean,
) {
  Alert.alert(
    resultado === "PAGO"
      ? es
        ? "Abono guardado"
        : "Payment saved"
      : es
        ? "Visita guardada"
        : "Visit saved",
    resultado === "PAGO"
      ? `${dinero.format(monto)} · ${es ? "Recibo local" : "Local receipt"} ${visitaId.slice(-8).toUpperCase()}\n${es ? "Protegido en este equipo hasta sincronizar." : "Secured on this device until synchronization."}`
      : es
        ? "La ruta y el récord del cliente se actualizarán al sincronizar."
        : "The route and customer record will update during sync.",
  );
}

export type ControlJornada = ReturnType<typeof usarJornadaRuta>;
