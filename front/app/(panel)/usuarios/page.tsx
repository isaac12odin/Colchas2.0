"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Edit3, KeyRound, Plus, ShieldCheck } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import { EncabezadoPagina, MensajeError, Modal } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";
import {
  BotonGenerarContrasena,
  CampoContrasena,
  RequisitosContrasena,
} from "@/componentes/CampoContrasena";

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
  const { t, idioma, usuario: usuarioSesion } = usarAplicacion();
  const es = idioma === "es";
  const [usuarios, establecerUsuarios] = useState<Usuario[]>([]);
  const [modal, establecerModal] = useState(false);
  const [usuarioEditar, establecerUsuarioEditar] = useState<Usuario | null>(
    null,
  );
  const [usuarioRestablecer, establecerUsuarioRestablecer] =
    useState<Usuario | null>(null);
  const [contrasenaTemporal, establecerContrasenaTemporal] = useState("");
  const [contrasenaRestablecida, establecerContrasenaRestablecida] =
    useState("");
  const [confirmacionRestablecida, establecerConfirmacionRestablecida] =
    useState("");
  const [contrasenaAdministrador, establecerContrasenaAdministrador] =
    useState("");
  const [mensaje, establecerMensaje] = useState("");
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
  usarDatosVivos(cargar);
  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      await api("/usuarios", { method: "POST", body: JSON.stringify(datos) });
      establecerModal(false);
      establecerContrasenaTemporal("");
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  async function editarUsuario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuarioEditar) return;
    const formulario = new FormData(evento.currentTarget);
    const rol = formulario.get("rol");
    try {
      await api(`/usuarios/${usuarioEditar.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombre: formulario.get("nombre"),
          ...(rol ? { rol } : {}),
        }),
      });
      establecerUsuarioEditar(null);
      await cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  async function restablecerContrasena(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuarioRestablecer) return;
    if (contrasenaRestablecida !== confirmacionRestablecida) {
      establecerError(
        es ? "Las contraseñas no coinciden." : "Passwords do not match.",
      );
      return;
    }
    try {
      await api(`/usuarios/${usuarioRestablecer.id}/restablecer-contrasena`, {
        method: "POST",
        body: JSON.stringify({
          contrasenaAdministrador,
          contrasenaTemporal: contrasenaRestablecida,
        }),
      });
      establecerMensaje(
        es
          ? `Contraseña actualizada para ${usuarioRestablecer.nombre}. Sus sesiones fueron cerradas.`
          : `Password updated for ${usuarioRestablecer.nombre}. Their sessions were closed.`,
      );
      establecerUsuarioRestablecer(null);
      establecerContrasenaAdministrador("");
      establecerContrasenaRestablecida("");
      establecerConfirmacionRestablecida("");
      await cargar();
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
            data-capacitacion="usuarios.nuevo.abrir"
            onClick={() => establecerModal(true)}
          >
            <Plus size={18} />
            {t.nuevo}
          </button>
        }
      />
      {error && <MensajeError mensaje={error} />}
      {mensaje && (
        <div
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          data-capacitacion="usuarios.resultado"
        >
          {mensaje}
        </div>
      )}
      <div
        className="panel overflow-hidden"
        data-capacitacion="usuarios.listado"
      >
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
                <tr key={u.id} data-capacitacion="usuarios.registro">
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
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {u.ultimoAcceso
                      ? new Date(u.ultimoAcceso).toLocaleString(
                          es ? "es-MX" : "en-US",
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="boton-secundario px-3"
                        data-capacitacion="usuarios.registro.editar"
                        onClick={() => establecerUsuarioEditar(u)}
                        title={es ? "Editar usuario" : "Edit user"}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="boton-secundario px-3"
                        data-capacitacion="usuarios.registro.restablecer-contrasena"
                        onClick={() => {
                          establecerError("");
                          establecerUsuarioRestablecer(u);
                        }}
                        title={es ? "Cambiar contraseña" : "Change password"}
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        className="boton-secundario"
                        data-capacitacion="usuarios.registro.alternar-estado"
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
                    </div>
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
        <form
          onSubmit={crear}
          className="space-y-4"
          data-capacitacion="usuarios.nuevo.formulario"
        >
          <label>
            <span className="etiqueta">{es ? "Nombre" : "Name"}</span>
            <input
              name="nombre"
              className="campo"
              data-capacitacion="usuarios.nuevo.nombre"
              required
            />
          </label>
          <label>
            <span className="etiqueta">{es ? "Correo" : "Email"}</span>
            <input
              name="correo"
              className="campo"
              data-capacitacion="usuarios.nuevo.correo"
              type="email"
              required
            />
          </label>
          <label>
            <span className="etiqueta">{es ? "Rol" : "Role"}</span>
            <select
              name="rol"
              className="campo"
              data-capacitacion="usuarios.nuevo.rol"
            >
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
          <div>
            <label htmlFor="usuario-contrasena-temporal" className="etiqueta">
              {es ? "Contraseña (mínimo 6)" : "Password (minimum 6)"}
            </label>
            <CampoContrasena
              id="usuario-contrasena-temporal"
              name="contrasenaTemporal"
              className="campo"
              data-capacitacion="usuarios.nuevo.contrasena-temporal"
              autoComplete="new-password"
              value={contrasenaTemporal}
              onChange={(evento) =>
                establecerContrasenaTemporal(evento.target.value)
              }
              minLength={6}
              required
            />
          </div>
          <RequisitosContrasena valor={contrasenaTemporal} />
          <BotonGenerarContrasena
            alGenerar={establecerContrasenaTemporal}
            dataCapacitacion="usuarios.nuevo.generar-clave"
          />
          <p className="text-xs leading-5 text-slate-500">
            {es
              ? "La clave queda lista para usarse; no se pedirá cambiarla al entrar."
              : "This password is final; no first-login change is required."}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerModal(false)}
            >
              {t.cancelar}
            </button>
            <button
              className="boton-primario"
              data-capacitacion="usuarios.nuevo.guardar"
            >
              {t.guardar}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        abierto={Boolean(usuarioEditar)}
        cerrar={() => establecerUsuarioEditar(null)}
        titulo={es ? "Editar usuario" : "Edit user"}
      >
        {usuarioEditar && (
          <form
            onSubmit={editarUsuario}
            className="space-y-4"
            data-capacitacion="usuarios.edicion.formulario"
          >
            <label>
              <span className="etiqueta">{es ? "Nombre" : "Name"}</span>
              <input
                name="nombre"
                className="campo"
                data-capacitacion="usuarios.edicion.nombre"
                defaultValue={usuarioEditar.nombre}
                required
              />
            </label>
            <label>
              <span className="etiqueta">{es ? "Rol" : "Role"}</span>
              <select
                name="rol"
                className="campo"
                data-capacitacion="usuarios.edicion.rol"
                defaultValue={usuarioEditar.rol}
                disabled={usuarioEditar.id === usuarioSesion?.id}
              >
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="CONTABLE">Contable</option>
                <option value="VENDEDOR">Vendedor</option>
                <option value="ALMACENISTA">Almacenista</option>
                <option value="COBRADOR">Cobrador</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="boton-secundario"
                onClick={() => establecerUsuarioEditar(null)}
              >
                {t.cancelar}
              </button>
              <button
                className="boton-primario"
                data-capacitacion="usuarios.edicion.guardar"
              >
                {t.guardar}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        abierto={Boolean(usuarioRestablecer)}
        cerrar={() => establecerUsuarioRestablecer(null)}
        titulo={`${es ? "Restablecer contraseña" : "Reset password"} · ${usuarioRestablecer?.nombre ?? ""}`}
      >
        <form
          onSubmit={restablecerContrasena}
          className="space-y-4"
          data-capacitacion="usuarios.contrasena.formulario"
        >
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {es
              ? "Se cerrarán las sesiones del usuario y podrá entrar directamente con la nueva contraseña."
              : "The user's sessions will close and the new password will work immediately."}
          </p>
          <div>
            <label
              htmlFor="restablecer-contrasena-administrador"
              className="etiqueta"
            >
              {es
                ? "Tu contraseña de administrador"
                : "Your administrator password"}
            </label>
            <CampoContrasena
              id="restablecer-contrasena-administrador"
              name="contrasenaAdministrador"
              data-capacitacion="usuarios.contrasena.administrador"
              value={contrasenaAdministrador}
              onChange={(evento) =>
                establecerContrasenaAdministrador(evento.target.value)
              }
              autoComplete="current-password"
              minLength={6}
              required
            />
          </div>
          <div>
            <label
              htmlFor="restablecer-contrasena-temporal"
              className="etiqueta"
            >
              {es ? "Nueva contraseña" : "New password"}
            </label>
            <CampoContrasena
              id="restablecer-contrasena-temporal"
              name="contrasenaTemporal"
              data-capacitacion="usuarios.contrasena.temporal"
              value={contrasenaRestablecida}
              onChange={(evento) =>
                establecerContrasenaRestablecida(evento.target.value)
              }
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div>
            <label
              htmlFor="restablecer-contrasena-confirmacion"
              className="etiqueta"
            >
              {es ? "Confirmar contraseña" : "Confirm password"}
            </label>
            <CampoContrasena
              id="restablecer-contrasena-confirmacion"
              data-capacitacion="usuarios.contrasena.confirmacion"
              value={confirmacionRestablecida}
              onChange={(evento) =>
                establecerConfirmacionRestablecida(evento.target.value)
              }
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <RequisitosContrasena valor={contrasenaRestablecida} />
          <BotonGenerarContrasena
            alGenerar={(clave) => {
              establecerContrasenaRestablecida(clave);
              establecerConfirmacionRestablecida(clave);
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerUsuarioRestablecer(null)}
            >
              {t.cancelar}
            </button>
            <button
              className="boton-primario"
              data-capacitacion="usuarios.contrasena.confirmar"
            >
              {es
                ? "Restablecer y cerrar sesiones"
                : "Reset and close sessions"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
