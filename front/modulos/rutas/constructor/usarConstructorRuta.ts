import { useEffect, useMemo, useState, type FormEvent } from "react";

import { api, ErrorApi } from "@/lib/api";
import type { RutaWeb } from "../tipos";
import type { ClienteRuta, CobradorRuta, LocalidadRuta } from "./tipos";

export function usarConstructorRuta({
  abierto,
  ruta,
  es,
  alCerrar,
  alGuardar,
}: {
  abierto: boolean;
  ruta?: RutaWeb;
  es: boolean;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const [localidades, establecerLocalidades] = useState<LocalidadRuta[]>([]);
  const [cobradores, establecerCobradores] = useState<CobradorRuta[]>([]);
  const [clientes, establecerClientes] = useState<ClienteRuta[]>([]);
  const [nombre, establecerNombre] = useState("");
  const [dia, establecerDia] = useState("LUNES");
  const [cobradorId, establecerCobradorId] = useState("");
  const [notas, establecerNotas] = useState("");
  const [localidadesSeleccionadas, establecerLocalidadesSeleccionadas] =
    useState<string[]>([]);
  const [clientesOrdenados, establecerClientesOrdenados] = useState<string[]>(
    [],
  );
  const [cargando, establecerCargando] = useState(false);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState("");

  useEffect(() => {
    if (!abierto) return;
    const localidadesIniciales =
      ruta?.localidades.map(({ localidad }) => localidad.id) ?? [];
    const clientesIniciales =
      ruta?.clientes
        ?.filter(({ cliente }) => Number(cliente.saldo?.saldoActual ?? 0) > 0)
        .sort((a, b) => a.orden - b.orden)
        .map(({ clienteId }) => clienteId) ?? [];
    establecerNombre(ruta?.nombre ?? "");
    establecerDia(ruta?.diaSemana ?? "LUNES");
    establecerCobradorId(ruta?.cobradorId ?? ruta?.cobrador?.id ?? "");
    establecerNotas(ruta?.notas ?? "");
    establecerLocalidadesSeleccionadas(localidadesIniciales);
    establecerClientesOrdenados(clientesIniciales);
    establecerError("");
    establecerCargando(true);
    void Promise.all([
      api<{ datos: LocalidadRuta[] }>("/localidades"),
      api<{ datos: CobradorRuta[] }>("/usuarios"),
      api<{ datos: ClienteRuta[] }>("/rutas/clientes-con-saldo"),
    ])
      .then(([respuestaLocalidades, respuestaUsuarios, respuestaClientes]) => {
        establecerLocalidades(respuestaLocalidades.datos);
        establecerCobradores(
          respuestaUsuarios.datos.filter(
            (usuario) => usuario.rol === "COBRADOR" && usuario.activo,
          ),
        );
        establecerClientes(respuestaClientes.datos);
        const clientesCargados = new Map(
          respuestaClientes.datos.map((cliente) => [cliente.id, cliente]),
        );
        establecerClientesOrdenados(
          clientesIniciales.filter((clienteId) => {
            const cliente = clientesCargados.get(clienteId);
            return Boolean(
              cliente &&
                localidadesIniciales.includes(cliente.localidadId) &&
                Number(cliente.saldo?.saldoActual ?? 0) > 0,
            );
          }),
        );
      })
      .catch((errorCarga) =>
        establecerError(
          errorCarga instanceof Error
            ? errorCarga.message
            : es
              ? "No fue posible cargar la ruta."
              : "The route could not be loaded.",
        ),
      )
      .finally(() => establecerCargando(false));
  }, [abierto, es, ruta]);

  const clientesPorId = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes],
  );

  function alternarLocalidad(id: string) {
    const nuevas = localidadesSeleccionadas.includes(id)
      ? localidadesSeleccionadas.filter((actual) => actual !== id)
      : [...localidadesSeleccionadas, id];
    establecerLocalidadesSeleccionadas(nuevas);
    establecerClientesOrdenados((actuales) =>
      actuales.filter((clienteId) => {
        const cliente = clientesPorId.get(clienteId);
        return Boolean(cliente && nuevas.includes(cliente.localidadId));
      }),
    );
  }

  function alternarCliente(id: string) {
    establecerClientesOrdenados((actuales) =>
      actuales.includes(id)
        ? actuales.filter((actual) => actual !== id)
        : [...actuales, id],
    );
  }

  const puedeGuardar =
    nombre.trim().length >= 3 &&
    localidadesSeleccionadas.length > 0 &&
    clientesOrdenados.length > 0 &&
    !cargando &&
    !guardando;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!puedeGuardar) return;
    establecerGuardando(true);
    establecerError("");
    try {
      await api(ruta ? `/rutas/${ruta.id}` : "/rutas", {
        method: ruta ? "PATCH" : "POST",
        body: JSON.stringify({
          nombre: nombre.trim(),
          diaSemana: dia,
          notas: notas.trim() || undefined,
          cobradorId: cobradorId || null,
          localidadIds: localidadesSeleccionadas,
          clienteIds: clientesOrdenados,
          incluirClientesLocalidades: false,
        }),
      });
      alCerrar();
      alGuardar();
    } catch (errorGuardado) {
      establecerError(
        errorGuardado instanceof ErrorApi
          ? errorGuardado.message
          : es
            ? "No fue posible guardar la ruta."
            : "The route could not be saved.",
      );
    } finally {
      establecerGuardando(false);
    }
  }

  return {
    localidades,
    cobradores,
    clientes,
    clientesPorId,
    nombre,
    dia,
    cobradorId,
    notas,
    localidadesSeleccionadas,
    clientesOrdenados,
    cargando,
    guardando,
    error,
    puedeGuardar,
    establecerNombre,
    establecerDia,
    establecerCobradorId,
    establecerNotas,
    establecerClientesOrdenados,
    alternarLocalidad,
    alternarCliente,
    enviar,
  };
}
