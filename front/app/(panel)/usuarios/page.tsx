"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Plus } from "lucide-react";
import { EncabezadoPagina, MensajeError } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";
import { api, ErrorApi } from "@/lib/api";
import type { Pagina } from "@/lib/tipos";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import { FiltrosUsuarios } from "@/modulos/usuarios/FiltrosUsuarios";
import { ListaUsuarios } from "@/modulos/usuarios/ListaUsuarios";
import {
  ModalesUsuarios,
  type UsuarioAdministrable as Usuario,
} from "@/modulos/usuarios/ModalesUsuarios";

type OperacionUsuario = "CREAR" | "EDITAR" | "RESTABLECER" | `ESTADO:${string}`;

const LIMITE_USUARIOS = 15;

function normalizarPagina(
  respuesta: Pagina<Usuario> | { datos: Usuario[] },
  pagina: number,
): Pagina<Usuario> {
  if ("paginacion" in respuesta) return respuesta;
  return {
    datos: respuesta.datos,
    paginacion: {
      pagina,
      limite: LIMITE_USUARIOS,
      total: respuesta.datos.length,
      totalPaginas: 1,
    },
  };
}

export default function PaginaUsuarios() {
  const { t, idioma, usuario: usuarioSesion } = usarAplicacion();
  const es = idioma === "es";
  const [respuesta, establecerRespuesta] = useState<Pagina<Usuario> | null>(
    null,
  );
  const [buscar, establecerBuscar] = useState("");
  const [consulta, establecerConsulta] = useState("");
  const [rol, establecerRol] = useState("");
  const [activo, establecerActivo] = useState("");
  const [pagina, establecerPagina] = useState(1);
  const [cargando, establecerCargando] = useState(true);
  const [modalNuevo, establecerModalNuevo] = useState(false);
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
  const [errorModal, establecerErrorModal] = useState("");
  const [operacion, establecerOperacion] = useState<OperacionUsuario | null>(
    null,
  );
  const solicitudActual = useRef(0);
  const operacionEnCurso = useRef(false);

  const cargar = useCallback(async () => {
    const solicitud = ++solicitudActual.current;
    const parametros = new URLSearchParams({
      pagina: String(pagina),
      limite: String(LIMITE_USUARIOS),
    });
    if (consulta) parametros.set("buscar", consulta);
    if (rol) parametros.set("rol", rol);
    if (activo) parametros.set("activo", activo);
    establecerCargando(true);
    establecerError("");
    try {
      const datos = await api<Pagina<Usuario> | { datos: Usuario[] }>(
        `/usuarios?${parametros.toString()}`,
      );
      if (solicitud !== solicitudActual.current) return;
      const paginaRecibida = normalizarPagina(datos, pagina);
      if (pagina > paginaRecibida.paginacion.totalPaginas) {
        establecerPagina(paginaRecibida.paginacion.totalPaginas);
        establecerRespuesta(null);
      } else establecerRespuesta(paginaRecibida);
    } catch (e) {
      if (solicitud !== solicitudActual.current) return;
      establecerError(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No fue posible cargar los usuarios."
            : "Unable to load users.",
      );
    } finally {
      if (solicitud === solicitudActual.current) establecerCargando(false);
    }
  }, [activo, consulta, es, pagina, rol]);

  useEffect(() => void cargar(), [cargar]);
  usarDatosVivos(cargar);

  async function ejecutarOperacion(
    clave: OperacionUsuario,
    accion: () => Promise<unknown>,
    alFallar: (mensaje: string) => void,
  ) {
    if (operacionEnCurso.current) return false;
    operacionEnCurso.current = true;
    establecerOperacion(clave);
    try {
      await accion();
      return true;
    } catch (e) {
      alFallar(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No fue posible completar la operación."
            : "The operation could not be completed.",
      );
      return false;
    } finally {
      operacionEnCurso.current = false;
      establecerOperacion(null);
    }
  }

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    establecerErrorModal("");
    establecerMensaje("");
    const creado = await ejecutarOperacion(
      "CREAR",
      () => api("/usuarios", { method: "POST", body: JSON.stringify(datos) }),
      establecerErrorModal,
    );
    if (!creado) return;
    establecerModalNuevo(false);
    establecerContrasenaTemporal("");
    establecerMensaje(
      es ? "Usuario creado correctamente." : "User created successfully.",
    );
    await cargar();
  }

  async function editar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuarioEditar) return;
    const formulario = new FormData(evento.currentTarget);
    const rolSeleccionado = formulario.get("rol");
    establecerErrorModal("");
    establecerMensaje("");
    const editado = await ejecutarOperacion(
      "EDITAR",
      () =>
        api(`/usuarios/${usuarioEditar.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            nombre: formulario.get("nombre"),
            ...(rolSeleccionado ? { rol: rolSeleccionado } : {}),
          }),
        }),
      establecerErrorModal,
    );
    if (!editado) return;
    establecerUsuarioEditar(null);
    establecerMensaje(
      es ? "Usuario actualizado correctamente." : "User updated successfully.",
    );
    await cargar();
  }

  async function restablecerContrasena(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuarioRestablecer) return;
    if (contrasenaRestablecida !== confirmacionRestablecida) {
      establecerErrorModal(
        es ? "Las contraseñas no coinciden." : "Passwords do not match.",
      );
      return;
    }
    establecerErrorModal("");
    establecerMensaje("");
    const restablecida = await ejecutarOperacion(
      "RESTABLECER",
      () =>
        api(`/usuarios/${usuarioRestablecer.id}/restablecer-contrasena`, {
          method: "POST",
          body: JSON.stringify({
            contrasenaAdministrador,
            contrasenaTemporal: contrasenaRestablecida,
          }),
        }),
      establecerErrorModal,
    );
    if (!restablecida) return;
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
  }

  async function alternar(usuario: Usuario) {
    if (usuario.id === usuarioSesion?.id && usuario.activo) return;
    if (
      usuario.activo &&
      !window.confirm(
        es
          ? `¿Desactivar la cuenta de ${usuario.nombre}? Ya no podrá iniciar sesión.`
          : `Disable ${usuario.nombre}'s account? They will no longer be able to sign in.`,
      )
    )
      return;
    establecerError("");
    establecerMensaje("");
    const actualizado = await ejecutarOperacion(
      `ESTADO:${usuario.id}`,
      () =>
        api(`/usuarios/${usuario.id}`, {
          method: "PATCH",
          body: JSON.stringify({ activo: !usuario.activo }),
        }),
      establecerError,
    );
    if (!actualizado) return;
    establecerMensaje(
      usuario.activo
        ? es
          ? `Cuenta de ${usuario.nombre} desactivada.`
          : `${usuario.nombre}'s account was disabled.`
        : es
          ? `Cuenta de ${usuario.nombre} activada.`
          : `${usuario.nombre}'s account was enabled.`,
    );
    await cargar();
  }

  function cambiarFiltro(establecer: (valor: string) => void, valor: string) {
    establecer(valor);
    establecerPagina(1);
    establecerRespuesta(null);
  }

  function abrirEdicion(usuario: Usuario) {
    establecerErrorModal("");
    establecerUsuarioEditar(usuario);
  }

  function abrirRestablecimiento(usuario: Usuario) {
    establecerErrorModal("");
    establecerUsuarioRestablecer(usuario);
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
            type="button"
            className="boton-primario"
            data-capacitacion="usuarios.nuevo.abrir"
            disabled={Boolean(operacion)}
            onClick={() => {
              establecerErrorModal("");
              establecerModalNuevo(true);
            }}
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
      <FiltrosUsuarios
        buscar={buscar}
        rol={rol}
        activo={activo}
        es={es}
        alBuscar={establecerBuscar}
        alAplicarBusqueda={() => {
          establecerConsulta(buscar.trim());
          establecerPagina(1);
          establecerRespuesta(null);
        }}
        alLimpiarBusqueda={() => {
          establecerBuscar("");
          cambiarFiltro(establecerConsulta, "");
        }}
        alCambiarRol={(valor) => cambiarFiltro(establecerRol, valor)}
        alCambiarActivo={(valor) => cambiarFiltro(establecerActivo, valor)}
      />
      {cargando && !respuesta && (
        <div
          className="panel p-8 text-center text-sm text-slate-500"
          role="status"
        >
          {es ? "Cargando usuarios…" : "Loading users…"}
        </div>
      )}
      {!cargando && error && !respuesta && (
        <div className="panel p-5 text-center">
          <button className="boton-secundario" onClick={() => void cargar()}>
            {es ? "Reintentar" : "Try again"}
          </button>
        </div>
      )}
      {respuesta && (
        <ListaUsuarios
          respuesta={respuesta}
          cargando={cargando}
          operacionActiva={Boolean(operacion)}
          usuarioSesionId={usuarioSesion?.id}
          es={es}
          editar={abrirEdicion}
          restablecer={abrirRestablecimiento}
          alternarEstado={(usuario) => void alternar(usuario)}
          cambiarPagina={(valor) => {
            establecerPagina(valor);
            establecerRespuesta(null);
          }}
        />
      )}
      <ModalesUsuarios
        es={es}
        cancelar={t.cancelar}
        guardar={t.guardar}
        nuevoAbierto={modalNuevo}
        usuarioEditar={usuarioEditar}
        usuarioRestablecer={usuarioRestablecer}
        usuarioSesionId={usuarioSesion?.id}
        error={errorModal}
        operacion={operacion}
        contrasenaTemporal={contrasenaTemporal}
        contrasenaAdministrador={contrasenaAdministrador}
        contrasenaRestablecida={contrasenaRestablecida}
        confirmacionRestablecida={confirmacionRestablecida}
        cerrarNuevo={() => establecerModalNuevo(false)}
        cerrarEdicion={() => establecerUsuarioEditar(null)}
        cerrarRestablecimiento={() => establecerUsuarioRestablecer(null)}
        alCrear={crear}
        alEditar={editar}
        alRestablecer={restablecerContrasena}
        cambiarContrasenaTemporal={establecerContrasenaTemporal}
        cambiarContrasenaAdministrador={establecerContrasenaAdministrador}
        cambiarContrasenaRestablecida={establecerContrasenaRestablecida}
        cambiarConfirmacionRestablecida={establecerConfirmacionRestablecida}
      />
    </>
  );
}
