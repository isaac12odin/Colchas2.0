import { type FormEvent, useEffect, useState } from "react";

import { Modal } from "@/componentes/ui";
import { api } from "@/lib/api";
import type { RutaWeb } from "./tipos";

interface Localidad {
  id: string;
  nombre: string;
  estado: string;
}

interface Cobrador {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}

export function CrearRutaModal({
  abierto,
  es,
  cancelar,
  guardar,
  ruta,
  alCerrar,
  alCrear,
}: {
  abierto: boolean;
  es: boolean;
  cancelar: string;
  guardar: string;
  ruta?: RutaWeb;
  alCerrar: () => void;
  alCrear: () => void;
}) {
  const [localidades, establecerLocalidades] = useState<Localidad[]>([]);
  const [cobradores, establecerCobradores] = useState<Cobrador[]>([]);
  const [cobradorId, establecerCobradorId] = useState("");
  const [seleccionadas, establecerSeleccionadas] = useState<string[]>([]);
  const [buscarLocalidad, establecerBuscarLocalidad] = useState("");
  const [nombre, establecerNombre] = useState("");
  const [dia, establecerDia] = useState("LUNES");
  const [notas, establecerNotas] = useState("");
  const [guardando, establecerGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    void api<{ datos: Localidad[] }>("/localidades").then((respuesta) =>
      establecerLocalidades(respuesta.datos),
    );
    void api<{ datos: Cobrador[] }>("/usuarios").then((respuesta) =>
      establecerCobradores(
        respuesta.datos.filter(
          (usuario) => usuario.rol === "COBRADOR" && usuario.activo,
        ),
      ),
    );
    establecerNombre(ruta?.nombre ?? "");
    establecerDia(ruta?.diaSemana ?? "LUNES");
    establecerNotas(ruta?.notas ?? "");
    establecerCobradorId(ruta?.cobradorId ?? ruta?.cobrador?.id ?? "");
    establecerSeleccionadas(
      ruta?.localidades.map(({ localidad }) => localidad.id) ?? [],
    );
  }, [abierto, ruta]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!seleccionadas.length || !cobradorId || guardando) return;
    establecerGuardando(true);
    try {
      await api(ruta ? `/rutas/${ruta.id}` : "/rutas", {
        method: ruta ? "PATCH" : "POST",
        body: JSON.stringify({
          nombre,
          diaSemana: dia,
          notas: notas || undefined,
          cobradorId,
          localidadIds: seleccionadas,
          incluirClientesLocalidades: true,
        }),
      });
      alCerrar();
      alCrear();
    } finally {
      establecerGuardando(false);
    }
  }

  function alternar(id: string) {
    establecerSeleccionadas((actuales) =>
      actuales.includes(id)
        ? actuales.filter((actual) => actual !== id)
        : [...actuales, id],
    );
  }

  return (
    <Modal
      abierto={abierto}
      cerrar={alCerrar}
      titulo={
        ruta
          ? es
            ? "Configurar ruta"
            : "Configure route"
          : es
            ? "Nueva ruta multilocalidad"
            : "New multi-location route"
      }
    >
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="etiqueta">
              {es ? "Nombre de ruta" : "Route name"}
            </span>
            <input
              className="campo"
              value={nombre}
              onChange={(evento) => establecerNombre(evento.target.value)}
              required
              minLength={3}
            />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Día de cobranza" : "Collection day"}
            </span>
            <select
              className="campo"
              value={dia}
              onChange={(evento) => establecerDia(evento.target.value)}
            >
              {[
                "LUNES",
                "MARTES",
                "MIERCOLES",
                "JUEVES",
                "VIERNES",
                "SABADO",
                "DOMINGO",
              ].map((valor) => (
                <option key={valor}>{valor}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span className="etiqueta">
            {es ? "Cobrador responsable" : "Assigned collector"}
          </span>
          <select
            className="campo"
            value={cobradorId}
            onChange={(evento) => establecerCobradorId(evento.target.value)}
            required
          >
            <option value="">
              {es ? "Selecciona un cobrador" : "Select a collector"}
            </option>
            {cobradores.map((cobrador) => (
              <option key={cobrador.id} value={cobrador.id}>
                {cobrador.nombre} · {cobrador.correo}
              </option>
            ))}
          </select>
          {!cobradores.length && (
            <p className="mt-1 text-xs text-amber-700">
              {es
                ? "Primero crea un usuario con rol Cobrador."
                : "Create a user with the Collector role first."}
            </p>
          )}
        </label>
        <fieldset>
          <legend className="etiqueta">
            {es
              ? "Localidades incluidas (una o varias)"
              : "Included locations (one or more)"}
          </legend>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border p-3">
            <input
              className="campo mb-2"
              value={buscarLocalidad}
              onChange={(evento) =>
                establecerBuscarLocalidad(evento.target.value)
              }
              placeholder={
                es
                  ? "Buscar por localidad o estado"
                  : "Search location or state"
              }
            />
            {localidades
              .filter((localidad) =>
                `${localidad.nombre} ${localidad.estado}`
                  .toLocaleLowerCase("es-MX")
                  .includes(buscarLocalidad.toLocaleLowerCase("es-MX")),
              )
              .map((localidad) => (
                <label
                  key={localidad.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(localidad.id)}
                    onChange={() => alternar(localidad.id)}
                  />
                  <span>
                    <strong>{localidad.nombre}</strong>
                    <span className="ml-2 text-xs text-slate-500">
                      {localidad.estado}
                    </span>
                  </span>
                </label>
              ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {seleccionadas.length}{" "}
            {es
              ? "localidad(es). Sus clientas activas se sincronizarán con la ruta."
              : "location(s). Their active customers will be synchronized."}
          </p>
        </fieldset>
        <label>
          <span className="etiqueta">
            {es ? "Notas opcionales" : "Optional notes"}
          </span>
          <textarea
            className="campo min-h-20 py-3"
            value={notas}
            onChange={(evento) => establecerNotas(evento.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="boton-secundario" onClick={alCerrar}>
            {cancelar}
          </button>
          <button
            disabled={!seleccionadas.length || !cobradorId || guardando}
            className="boton-primario disabled:opacity-50"
          >
            {guardando ? (es ? "Guardando…" : "Saving…") : guardar}
          </button>
        </div>
      </form>
    </Modal>
  );
}
