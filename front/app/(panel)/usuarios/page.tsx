"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import { EncabezadoPagina, MensajeError, Modal } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: string | null;
  debeCambiarContrasena: boolean;
}

export default function PaginaUsuarios() {
  const { t, idioma } = usarAplicacion();
  const es = idioma === "es";
  const [usuarios, establecerUsuarios] = useState<Usuario[]>([]);
  const [modal, establecerModal] = useState(false);
  const [error, establecerError] = useState("");
  const cargar = useCallback(
    () =>
      api<{ datos: Usuario[] }>("/usuarios")
        .then((r) => establecerUsuarios(r.datos))
        .catch((e) => establecerError(e.message)),
    [],
  );
  useEffect(() => {
    void cargar();
  }, [cargar]);
  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      await api("/usuarios", { method: "POST", body: JSON.stringify(datos) });
      establecerModal(false);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  async function alternar(usuario: Usuario) {
    try {
      await api(`/usuarios/${usuario.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !usuario.activo }),
      });
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  return (
    <>
      <EncabezadoPagina
        titulo={t.usuarios}
        descripcion={
          es
            ? "Accesos separados para administración, ventas, contabilidad, almacén y cobranza."
            : "Separate access for admins, sales, accounting, warehouse, and collections."
        }
        accion={
          <button
            className="boton-primario"
            onClick={() => establecerModal(true)}
          >
            <Plus size={18} />
            {t.nuevo}
          </button>
        }
      />
      {error && <MensajeError mensaje={error} />}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">{es ? "Usuario" : "User"}</th>
                <th className="px-4 py-3">{es ? "Rol" : "Role"}</th>
                <th className="px-4 py-3">{es ? "Estado" : "Status"}</th>
                <th className="px-4 py-3">
                  {es ? "Último acceso" : "Last access"}
                </th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{u.nombre}</p>
                    <p className="text-xs text-slate-500">{u.correo}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950">
                      <ShieldCheck size={14} />
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={u.activo ? "text-emerald-600" : "text-red-600"}
                    >
                      {u.activo
                        ? es
                          ? "Activo"
                          : "Active"
                        : es
                          ? "Inactivo"
                          : "Inactive"}
                    </span>
                    {u.debeCambiarContrasena && (
                      <p className="text-xs text-amber-600">
                        {es ? "Contraseña temporal" : "Temporary password"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {u.ultimoAcceso
                      ? new Date(u.ultimoAcceso).toLocaleString(
                          es ? "es-MX" : "en-US",
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      className="boton-secundario"
                      onClick={() => alternar(u)}
                    >
                      {u.activo
                        ? es
                          ? "Desactivar"
                          : "Disable"
                        : es
                          ? "Activar"
                          : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal
        abierto={modal}
        cerrar={() => establecerModal(false)}
        titulo={es ? "Nuevo usuario" : "New user"}
      >
        <form onSubmit={crear} className="space-y-4">
          <label>
            <span className="etiqueta">{es ? "Nombre" : "Name"}</span>
            <input name="nombre" className="campo" required />
          </label>
          <label>
            <span className="etiqueta">{es ? "Correo" : "Email"}</span>
            <input name="correo" className="campo" type="email" required />
          </label>
          <label>
            <span className="etiqueta">{es ? "Rol" : "Role"}</span>
            <select name="rol" className="campo">
              <option value="ADMINISTRADOR">
                {es ? "Administrador" : "Administrator"}
              </option>
              <option value="CONTABLE">{es ? "Contable" : "Accounting"}</option>
              <option value="VENDEDOR">{es ? "Vendedor" : "Sales"}</option>
              <option value="ALMACENISTA">
                {es ? "Almacenista" : "Warehouse"}
              </option>
              <option value="COBRADOR">{es ? "Cobrador" : "Collector"}</option>
            </select>
          </label>
          <label>
            <span className="etiqueta">
              {es
                ? "Contraseña temporal (mínimo 12)"
                : "Temporary password (minimum 12)"}
            </span>
            <input
              name="contrasenaTemporal"
              className="campo"
              type="password"
              minLength={12}
              required
            />
          </label>
          <p className="text-xs leading-5 text-slate-500">
            {es
              ? "El usuario deberá cambiarla en su primer acceso."
              : "The user must change it at first sign-in."}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerModal(false)}
            >
              {t.cancelar}
            </button>
            <button className="boton-primario">{t.guardar}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
