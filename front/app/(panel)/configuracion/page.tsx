"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Download, Edit3, FileSpreadsheet, History, MapPin, Plus, Upload } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import type { Pagina } from "@/lib/tipos";
import { EncabezadoPagina, EstadoVacio, MensajeError, Modal, Paginador } from "@/componentes/ui";

interface Localidad { id: string; nombre: string; estado: string; activo: boolean }
interface Auditoria {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  datosAntes: unknown;
  datosDespues: unknown;
  ip: string | null;
  creadoEn: string;
  usuario: { nombre: string; correo: string } | null;
}

function archivoBase64(archivo: File) {
  return new Promise<string>((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error("No se pudo leer el Excel."));
    lector.onload = () => resolver(String(lector.result).split(",")[1] ?? "");
    lector.readAsDataURL(archivo);
  });
}

export default function PaginaConfiguracion() {
  const [pestana, establecerPestana] = useState<"localidades" | "importacion" | "auditoria">("localidades");
  const [localidades, establecerLocalidades] = useState<Localidad[]>([]);
  const [localidadEditar, establecerLocalidadEditar] = useState<Localidad | "nueva" | null>(null);
  const [auditoria, establecerAuditoria] = useState<Pagina<Auditoria> | null>(null);
  const [pagina, establecerPagina] = useState(1);
  const [resultado, establecerResultado] = useState<Record<string, number> | null>(null);
  const [cargando, establecerCargando] = useState(false);
  const [error, establecerError] = useState("");

  const cargar = useCallback(() => {
    api<{ datos: Localidad[] }>("/localidades?incluirInactivas=true")
      .then((r) => establecerLocalidades(r.datos))
      .catch((e) => establecerError(e.message));
    api<Pagina<Auditoria>>(`/auditoria?pagina=${pagina}&limite=20`)
      .then(establecerAuditoria)
      .catch((e) => establecerError(e.message));
  }, [pagina]);
  useEffect(cargar, [cargar]);

  async function guardarLocalidad(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const cuerpo = { nombre: formulario.get("nombre"), estado: formulario.get("estado") };
    try {
      if (localidadEditar === "nueva")
        await api("/localidades", { method: "POST", body: JSON.stringify(cuerpo) });
      else if (localidadEditar)
        await api(`/localidades/${localidadEditar.id}`, { method: "PATCH", body: JSON.stringify(cuerpo) });
      establecerLocalidadEditar(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  async function alternar(localidad: Localidad) {
    try {
      await api(`/localidades/${localidad.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !localidad.activo }),
      });
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  async function importar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const archivo = formulario.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) return;
    establecerCargando(true);
    establecerError("");
    try {
      const respuesta = await api<{ resumen: Record<string, number> }>("/importaciones/excel", {
        method: "POST",
        body: JSON.stringify({ archivoBase64: await archivoBase64(archivo) }),
      });
      establecerResultado(respuesta.resumen);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerCargando(false);
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Configuración empresarial" descripcion="Catálogos maestros, importación inicial y trazabilidad administrativa." accion={pestana === "localidades" ? <button className="boton-primario" onClick={() => establecerLocalidadEditar("nueva")}><Plus size={17} /> Localidad</button> : undefined} />
      {error && <MensajeError mensaje={error} />}
      <div className="mb-5 flex flex-wrap gap-2"><button className={pestana === "localidades" ? "boton-primario" : "boton-secundario"} onClick={() => establecerPestana("localidades")}><MapPin size={17} /> Localidades</button><button className={pestana === "importacion" ? "boton-primario" : "boton-secundario"} onClick={() => establecerPestana("importacion")}><FileSpreadsheet size={17} /> Importar Excel</button><button className={pestana === "auditoria" ? "boton-primario" : "boton-secundario"} onClick={() => establecerPestana("auditoria")}><History size={17} /> Auditoría</button></div>
      {pestana === "localidades" && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{localidades.map((localidad) => <article key={localidad.id} className={`panel flex items-center justify-between gap-3 p-5 ${localidad.activo ? "" : "opacity-60"}`}><div><h2 className="font-semibold">{localidad.nombre}</h2><p className="text-sm text-slate-500">{localidad.estado} · {localidad.activo ? "Activa" : "Inactiva"}</p></div><div className="flex gap-2"><button className="boton-secundario px-3" onClick={() => establecerLocalidadEditar(localidad)}><Edit3 size={16} /></button><button className="text-xs font-semibold text-blue-600" onClick={() => void alternar(localidad)}>{localidad.activo ? "Baja" : "Reactivar"}</button></div></article>)}</section>}
      {pestana === "importacion" && <section className="grid gap-6 lg:grid-cols-2"><div className="panel p-6"><Download className="text-blue-600" /><h2 className="mt-4 text-lg font-semibold">1. Descarga la plantilla</h2><p className="mt-2 text-sm leading-6 text-slate-500">Incluye hojas para localidades, productos, clientes, saldos, tarjetas y rutas, con instrucciones. No cambies sus encabezados.</p><a className="boton-secundario mt-5" href="/api/importaciones/plantilla.xlsx"><Download size={17} /> Descargar XLSX</a></div><div className="panel p-6"><Upload className="text-blue-600" /><h2 className="mt-4 text-lg font-semibold">2. Valida e importa</h2><p className="mt-2 text-sm leading-6 text-slate-500">Todo se procesa en una sola transacción. Si una fila falla, no se guarda nada y podrás corregir el archivo.</p><form onSubmit={importar} className="mt-5 space-y-4"><input name="archivo" className="campo py-2" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /><button className="boton-primario" disabled={cargando}><Upload size={17} /> {cargando ? "Validando…" : "Importar de forma segura"}</button></form>{resultado && <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><strong>Importación completada</strong><p className="mt-1">{Object.entries(resultado).map(([clave, valor]) => `${clave}: ${valor}`).join(" · ")}</p></div>}</div></section>}
      {pestana === "auditoria" && <section className="panel overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="px-4 py-3">Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Cambios</th></tr></thead><tbody className="divide-y">{auditoria?.datos.map((registro) => <tr key={registro.id}><td className="px-4 py-3">{new Date(registro.creadoEn).toLocaleString("es-MX")}</td><td>{registro.usuario?.nombre ?? "Sistema"}<p className="text-xs text-slate-500">{registro.usuario?.correo}</p></td><td><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950">{registro.accion}</span></td><td>{registro.entidad}<p className="max-w-32 truncate font-mono text-xs text-slate-400">{registro.entidadId}</p></td><td><details><summary className="cursor-pointer text-xs font-semibold text-blue-600">Ver detalle</summary><pre className="mt-2 max-w-md overflow-auto rounded bg-slate-950 p-3 text-[10px] text-slate-100">{JSON.stringify({ antes: registro.datosAntes, despues: registro.datosDespues }, null, 2)}</pre></details></td></tr>)}</tbody></table></div>{auditoria?.datos.length === 0 && <EstadoVacio texto="No hay movimientos auditados." />}{auditoria && <Paginador pagina={auditoria.paginacion.pagina} totalPaginas={auditoria.paginacion.totalPaginas} cambiar={establecerPagina} />}</section>}
      <Modal abierto={Boolean(localidadEditar)} cerrar={() => establecerLocalidadEditar(null)} titulo={localidadEditar === "nueva" ? "Nueva localidad" : "Editar localidad"}><form onSubmit={guardarLocalidad} className="space-y-4"><label><span className="etiqueta">Nombre</span><input name="nombre" className="campo" defaultValue={localidadEditar === "nueva" ? "" : localidadEditar?.nombre} required /></label><label><span className="etiqueta">Estado</span><input name="estado" className="campo" defaultValue={localidadEditar === "nueva" ? "" : localidadEditar?.estado} required /></label><div className="flex justify-end gap-2"><button type="button" className="boton-secundario" onClick={() => establecerLocalidadEditar(null)}>Cancelar</button><button className="boton-primario">Guardar</button></div></form></Modal>
    </>
  );
}
