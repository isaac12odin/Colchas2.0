import { Edit3, KeyRound, ShieldCheck } from "lucide-react";
import { EstadoVacio, Paginador } from "@/componentes/ui";
import type { Pagina } from "@/lib/tipos";
import type { UsuarioAdministrable } from "./ModalesUsuarios";

export function ListaUsuarios({
  respuesta,
  cargando,
  operacionActiva,
  usuarioSesionId,
  es,
  editar,
  restablecer,
  alternarEstado,
  cambiarPagina,
}: {
  respuesta: Pagina<UsuarioAdministrable>;
  cargando: boolean;
  operacionActiva: boolean;
  usuarioSesionId?: string;
  es: boolean;
  editar: (usuario: UsuarioAdministrable) => void;
  restablecer: (usuario: UsuarioAdministrable) => void;
  alternarEstado: (usuario: UsuarioAdministrable) => void;
  cambiarPagina: (pagina: number) => void;
}) {
  return (
    <div
      className="panel overflow-hidden"
      data-capacitacion="usuarios.listado"
      aria-busy={cargando || undefined}
    >
      <div
        className="border-b px-4 py-3 text-sm text-slate-500"
        aria-live="polite"
      >
        {es
          ? `${respuesta.paginacion.total} usuario${respuesta.paginacion.total === 1 ? "" : "s"}`
          : `${respuesta.paginacion.total} user${respuesta.paginacion.total === 1 ? "" : "s"}`}
      </div>
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
            {respuesta.datos.map((usuario) => {
              const esCuentaPropia = usuario.id === usuarioSesionId;
              return (
                <tr key={usuario.id} data-capacitacion="usuarios.registro">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{usuario.nombre}</p>
                    <p className="text-xs text-slate-500">{usuario.correo}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950">
                      <ShieldCheck size={14} />
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={
                        usuario.activo ? "text-emerald-600" : "text-red-600"
                      }
                    >
                      {usuario.activo
                        ? es
                          ? "Activo"
                          : "Active"
                        : es
                          ? "Inactivo"
                          : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {usuario.ultimoAcceso
                      ? new Date(usuario.ultimoAcceso).toLocaleString(
                          es ? "es-MX" : "en-US",
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="boton-secundario px-3"
                        data-capacitacion="usuarios.registro.editar"
                        disabled={operacionActiva}
                        onClick={() => editar(usuario)}
                        title={es ? "Editar usuario" : "Edit user"}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        className="boton-secundario px-3"
                        data-capacitacion="usuarios.registro.restablecer-contrasena"
                        disabled={operacionActiva}
                        onClick={() => restablecer(usuario)}
                        title={es ? "Cambiar contraseña" : "Change password"}
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        type="button"
                        className="boton-secundario"
                        data-capacitacion="usuarios.registro.alternar-estado"
                        disabled={
                          operacionActiva || (usuario.activo && esCuentaPropia)
                        }
                        title={
                          usuario.activo && esCuentaPropia
                            ? es
                              ? "No puedes desactivar tu propia cuenta"
                              : "You cannot disable your own account"
                            : undefined
                        }
                        onClick={() => alternarEstado(usuario)}
                      >
                        {usuario.activo
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
              );
            })}
          </tbody>
        </table>
      </div>
      {!cargando && respuesta.datos.length === 0 && (
        <EstadoVacio
          texto={
            es
              ? "No se encontraron usuarios con estos filtros."
              : "No users match these filters."
          }
        />
      )}
      <Paginador
        pagina={respuesta.paginacion.pagina}
        totalPaginas={respuesta.paginacion.totalPaginas}
        cambiar={cambiarPagina}
      />
    </div>
  );
}
