import type { FormEventHandler } from "react";
import {
  BotonGenerarContrasena,
  CampoContrasena,
  RequisitosContrasena,
} from "@/componentes/CampoContrasena";
import { MensajeError, Modal } from "@/componentes/ui";

export interface UsuarioAdministrable {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: string | null;
  debeCambiarContrasena: boolean;
}

interface PropiedadesModalesUsuarios {
  es: boolean;
  cancelar: string;
  guardar: string;
  nuevoAbierto: boolean;
  usuarioEditar: UsuarioAdministrable | null;
  usuarioRestablecer: UsuarioAdministrable | null;
  usuarioSesionId?: string;
  error: string;
  operacion: "CREAR" | "EDITAR" | "RESTABLECER" | string | null;
  contrasenaTemporal: string;
  contrasenaAdministrador: string;
  contrasenaRestablecida: string;
  confirmacionRestablecida: string;
  cerrarNuevo: () => void;
  cerrarEdicion: () => void;
  cerrarRestablecimiento: () => void;
  alCrear: FormEventHandler<HTMLFormElement>;
  alEditar: FormEventHandler<HTMLFormElement>;
  alRestablecer: FormEventHandler<HTMLFormElement>;
  cambiarContrasenaTemporal: (valor: string) => void;
  cambiarContrasenaAdministrador: (valor: string) => void;
  cambiarContrasenaRestablecida: (valor: string) => void;
  cambiarConfirmacionRestablecida: (valor: string) => void;
}

/** Formularios sensibles aislados para mantener la pantalla principal legible. */
export function ModalesUsuarios({
  es,
  cancelar,
  guardar,
  nuevoAbierto,
  usuarioEditar,
  usuarioRestablecer,
  usuarioSesionId,
  error,
  operacion,
  contrasenaTemporal,
  contrasenaAdministrador,
  contrasenaRestablecida,
  confirmacionRestablecida,
  cerrarNuevo,
  cerrarEdicion,
  cerrarRestablecimiento,
  alCrear,
  alEditar,
  alRestablecer,
  cambiarContrasenaTemporal,
  cambiarContrasenaAdministrador,
  cambiarContrasenaRestablecida,
  cambiarConfirmacionRestablecida,
}: PropiedadesModalesUsuarios) {
  return (
    <>
      <Modal
        abierto={nuevoAbierto}
        cerrar={cerrarNuevo}
        titulo={es ? "Nuevo usuario" : "New user"}
        bloqueado={operacion === "CREAR"}
      >
        <form
          onSubmit={alCrear}
          className="space-y-4"
          data-capacitacion="usuarios.nuevo.formulario"
        >
          {error && <MensajeError mensaje={error} />}
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
              defaultValue=""
              required
            >
              <option value="" disabled>
                {es
                  ? "Selecciona el acceso necesario"
                  : "Select the required access"}
              </option>
              <option value="CONTABLE">{es ? "Contable" : "Accounting"}</option>
              <option value="VENDEDOR">{es ? "Vendedor" : "Sales"}</option>
              <option value="ALMACENISTA">
                {es ? "Almacenista" : "Warehouse"}
              </option>
              <option value="COBRADOR">{es ? "Cobrador" : "Collector"}</option>
              <option value="ADMINISTRADOR">
                {es ? "Administrador" : "Administrator"}
              </option>
            </select>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {es
                ? "Asigna el menor acceso necesario. Administrador ve y configura todo; resérvalo para responsables del sistema."
                : "Grant only the access needed. Administrator can view and configure everything; reserve it for system owners."}
            </span>
          </label>
          <div>
            <label htmlFor="usuario-contrasena-temporal" className="etiqueta">
              {es
                ? "Contraseña temporal (mínimo 12)"
                : "Temporary password (minimum 12)"}
            </label>
            <CampoContrasena
              id="usuario-contrasena-temporal"
              name="contrasenaTemporal"
              className="campo"
              data-capacitacion="usuarios.nuevo.contrasena-temporal"
              autoComplete="new-password"
              value={contrasenaTemporal}
              onChange={(evento) =>
                cambiarContrasenaTemporal(evento.target.value)
              }
              minLength={12}
              required
            />
          </div>
          <RequisitosContrasena valor={contrasenaTemporal} />
          <BotonGenerarContrasena
            alGenerar={cambiarContrasenaTemporal}
            dataCapacitacion="usuarios.nuevo.generar-clave"
          />
          <p className="text-xs leading-5 text-slate-500">
            {es
              ? "Esta clave es temporal. El usuario deberá crear una propia al iniciar sesión."
              : "This password is temporary. The user must create their own after signing in."}
          </p>
          <AccionesModal
            cancelar={cancelar}
            guardar={
              operacion === "CREAR" ? (es ? "Guardando…" : "Saving…") : guardar
            }
            procesando={operacion === "CREAR"}
            alCancelar={cerrarNuevo}
            dataCapacitacion="usuarios.nuevo.guardar"
          />
        </form>
      </Modal>

      <Modal
        abierto={Boolean(usuarioEditar)}
        cerrar={cerrarEdicion}
        titulo={es ? "Editar usuario" : "Edit user"}
        bloqueado={operacion === "EDITAR"}
      >
        {usuarioEditar && (
          <form
            onSubmit={alEditar}
            className="space-y-4"
            data-capacitacion="usuarios.edicion.formulario"
          >
            {error && <MensajeError mensaje={error} />}
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
                disabled={usuarioEditar.id === usuarioSesionId}
              >
                <option value="CONTABLE">Contable</option>
                <option value="VENDEDOR">Vendedor</option>
                <option value="ALMACENISTA">Almacenista</option>
                <option value="COBRADOR">Cobrador</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {usuarioEditar.id === usuarioSesionId
                  ? es
                    ? "Tu propio rol no se puede cambiar desde esta sesión."
                    : "Your own role cannot be changed from this session."
                  : es
                    ? "Asigna el menor acceso necesario para su trabajo."
                    : "Grant only the access required for their work."}
              </span>
            </label>
            <AccionesModal
              cancelar={cancelar}
              guardar={
                operacion === "EDITAR"
                  ? es
                    ? "Guardando…"
                    : "Saving…"
                  : guardar
              }
              procesando={operacion === "EDITAR"}
              alCancelar={cerrarEdicion}
              dataCapacitacion="usuarios.edicion.guardar"
            />
          </form>
        )}
      </Modal>

      <Modal
        abierto={Boolean(usuarioRestablecer)}
        cerrar={cerrarRestablecimiento}
        titulo={`${es ? "Restablecer contraseña" : "Reset password"} · ${usuarioRestablecer?.nombre ?? ""}`}
        bloqueado={operacion === "RESTABLECER"}
      >
        <form
          onSubmit={alRestablecer}
          className="space-y-4"
          data-capacitacion="usuarios.contrasena.formulario"
        >
          {error && <MensajeError mensaje={error} />}
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {es
              ? "Se cerrarán las sesiones del usuario y podrá entrar directamente con la nueva contraseña."
              : "The user's sessions will close and the new password will work immediately."}
          </p>
          <CampoRestablecimiento
            id="restablecer-contrasena-administrador"
            etiqueta={
              es
                ? "Tu contraseña de administrador"
                : "Your administrator password"
            }
            nombre="contrasenaAdministrador"
            valor={contrasenaAdministrador}
            cambiar={cambiarContrasenaAdministrador}
            autoComplete="current-password"
            dataCapacitacion="usuarios.contrasena.administrador"
            minimo={6}
          />
          <CampoRestablecimiento
            id="restablecer-contrasena-temporal"
            etiqueta={es ? "Nueva contraseña" : "New password"}
            nombre="contrasenaTemporal"
            valor={contrasenaRestablecida}
            cambiar={cambiarContrasenaRestablecida}
            autoComplete="new-password"
            dataCapacitacion="usuarios.contrasena.temporal"
          />
          <CampoRestablecimiento
            id="restablecer-contrasena-confirmacion"
            etiqueta={es ? "Confirmar contraseña" : "Confirm password"}
            valor={confirmacionRestablecida}
            cambiar={cambiarConfirmacionRestablecida}
            autoComplete="new-password"
            dataCapacitacion="usuarios.contrasena.confirmacion"
          />
          <RequisitosContrasena valor={contrasenaRestablecida} />
          <BotonGenerarContrasena
            alGenerar={(clave) => {
              cambiarContrasenaRestablecida(clave);
              cambiarConfirmacionRestablecida(clave);
            }}
          />
          <AccionesModal
            cancelar={cancelar}
            guardar={
              operacion === "RESTABLECER"
                ? es
                  ? "Restableciendo…"
                  : "Resetting…"
                : es
                  ? "Restablecer y cerrar sesiones"
                  : "Reset and close sessions"
            }
            procesando={operacion === "RESTABLECER"}
            alCancelar={cerrarRestablecimiento}
            dataCapacitacion="usuarios.contrasena.confirmar"
          />
        </form>
      </Modal>
    </>
  );
}

function AccionesModal({
  cancelar,
  guardar,
  procesando,
  alCancelar,
  dataCapacitacion,
}: {
  cancelar: string;
  guardar: string;
  procesando: boolean;
  alCancelar: () => void;
  dataCapacitacion: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="boton-secundario"
        disabled={procesando}
        onClick={alCancelar}
      >
        {cancelar}
      </button>
      <button
        className="boton-primario"
        data-capacitacion={dataCapacitacion}
        disabled={procesando}
      >
        {guardar}
      </button>
    </div>
  );
}

function CampoRestablecimiento({
  id,
  etiqueta,
  nombre,
  valor,
  cambiar,
  autoComplete,
  dataCapacitacion,
  minimo = 12,
}: {
  id: string;
  etiqueta: string;
  nombre?: string;
  valor: string;
  cambiar: (valor: string) => void;
  autoComplete: string;
  dataCapacitacion: string;
  minimo?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      <CampoContrasena
        id={id}
        name={nombre}
        data-capacitacion={dataCapacitacion}
        value={valor}
        onChange={(evento) => cambiar(evento.target.value)}
        autoComplete={autoComplete}
        minLength={minimo}
        required
      />
    </div>
  );
}
