"use client";

import { FormEvent, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import { EncabezadoPagina, MensajeError } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";
import {
  BotonGenerarContrasena,
  CampoContrasena,
  RequisitosContrasena,
} from "@/componentes/CampoContrasena";

export default function PaginaPerfil() {
  const { usuario, establecerUsuario, cerrarSesion, idioma } = usarAplicacion();
  const es = idioma === "es";
  const [error, establecerError] = useState("");
  const [enviando, establecerEnviando] = useState(false);
  const [configuracionMfa, establecerConfiguracionMfa] = useState<{
    secreto: string;
    uri: string;
  } | null>(null);
  const [mensaje, establecerMensaje] = useState("");
  const [contrasenaActual, establecerContrasenaActual] = useState("");
  const [nuevaContrasena, establecerNuevaContrasena] = useState("");
  const [confirmacion, establecerConfirmacion] = useState("");
  const [contrasenaMfa, establecerContrasenaMfa] = useState("");
  const [codigoDesactivarMfa, establecerCodigoDesactivarMfa] = useState("");
  const [procesandoMfa, establecerProcesandoMfa] = useState(false);
  async function cambiar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    if (form.get("nuevaContrasena") !== form.get("confirmacion"))
      return establecerError(
        es
          ? "Las contraseñas nuevas no coinciden."
          : "The new passwords do not match.",
      );
    establecerEnviando(true);
    establecerError("");
    try {
      await api("/auth/cambiar-contrasena", {
        method: "POST",
        body: JSON.stringify({
          contrasenaActual: form.get("contrasenaActual"),
          nuevaContrasena: form.get("nuevaContrasena"),
        }),
      });
      await cerrarSesion();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerEnviando(false);
    }
  }
  async function iniciarMfa() {
    establecerError("");
    establecerProcesandoMfa(true);
    try {
      establecerConfiguracionMfa(
        await api<{ secreto: string; uri: string }>("/auth/mfa/iniciar", {
          method: "POST",
          body: "{}",
        }),
      );
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerProcesandoMfa(false);
    }
  }
  async function confirmarMfa(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    establecerError("");
    establecerProcesandoMfa(true);
    try {
      const respuesta = await api<{
        usuario: NonNullable<typeof usuario>;
      }>("/auth/mfa/confirmar", {
        method: "POST",
        body: JSON.stringify({ codigo: form.get("codigo") }),
      });
      establecerUsuario(respuesta.usuario);
      establecerConfiguracionMfa(null);
      establecerMensaje(
        es
          ? "Segundo factor habilitado. Las demás sesiones fueron cerradas."
          : "Two-factor authentication enabled. Other sessions were signed out.",
      );
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerProcesandoMfa(false);
    }
  }
  async function desactivarMfa(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    establecerError("");
    establecerProcesandoMfa(true);
    try {
      await api("/auth/mfa/deshabilitar", {
        method: "POST",
        body: JSON.stringify({
          contrasena: contrasenaMfa,
          codigo: codigoDesactivarMfa,
        }),
      });
      await cerrarSesion();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerProcesandoMfa(false);
    }
  }
  return (
    <>
      <EncabezadoPagina
        titulo={es ? "Mi perfil" : "My profile"}
        descripcion={
          es
            ? "Cuenta, rol y credenciales de acceso."
            : "Account, role, and sign-in credentials."
        }
      />
      {error && <MensajeError mensaje={error} />}
      {mensaje && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {mensaje}
        </div>
      )}
      {usuario?.debeCambiarContrasena && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          {es
            ? "La contraseña que recibiste es temporal. Crea una propia para desbloquear los módulos de trabajo; al guardarla volverás a iniciar sesión."
            : "The password you received is temporary. Create your own to unlock work modules; after saving it you will sign in again."}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="panel h-fit p-6">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-marca-50 text-marca-600 dark:bg-marca-900/30">
            <ShieldCheck />
          </div>
          <h2 className="mt-5 text-lg font-semibold">{usuario?.nombre}</h2>
          <p className="mt-1 text-sm text-slate-500">{usuario?.correo}</p>
          <span className="mt-4 inline-block rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950">
            {usuario?.rol}
          </span>
        </section>
        <section className="panel p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <KeyRound className="text-marca-500" />
            <div>
              <h2 className="font-semibold">
                {es ? "Cambiar contraseña" : "Change password"}
              </h2>
              <p className="text-sm text-slate-500">
                {es
                  ? "Al guardarla se cerrarán todas tus sesiones."
                  : "Saving it will close all your sessions."}
              </p>
            </div>
          </div>
          <form onSubmit={cambiar} className="max-w-lg space-y-4">
            <div>
              <label htmlFor="perfil-contrasena-actual" className="etiqueta">
                {es ? "Contraseña actual" : "Current password"}
              </label>
              <CampoContrasena
                id="perfil-contrasena-actual"
                name="contrasenaActual"
                className="campo"
                autoComplete="current-password"
                value={contrasenaActual}
                onChange={(evento) =>
                  establecerContrasenaActual(evento.target.value)
                }
                minLength={6}
                required
              />
            </div>
            <div>
              <label htmlFor="perfil-contrasena-nueva" className="etiqueta">
                {es
                  ? "Nueva contraseña (mínimo 12)"
                  : "New password (minimum 12)"}
              </label>
              <CampoContrasena
                id="perfil-contrasena-nueva"
                name="nuevaContrasena"
                className="campo"
                autoComplete="new-password"
                value={nuevaContrasena}
                onChange={(evento) =>
                  establecerNuevaContrasena(evento.target.value)
                }
                minLength={12}
                required
              />
            </div>
            <div>
              <label
                htmlFor="perfil-contrasena-confirmacion"
                className="etiqueta"
              >
                {es ? "Confirmar nueva contraseña" : "Confirm new password"}
              </label>
              <CampoContrasena
                id="perfil-contrasena-confirmacion"
                name="confirmacion"
                className="campo"
                autoComplete="new-password"
                value={confirmacion}
                onChange={(evento) =>
                  establecerConfirmacion(evento.target.value)
                }
                minLength={12}
                required
              />
            </div>
            <RequisitosContrasena valor={nuevaContrasena} />
            <BotonGenerarContrasena
              texto={
                es
                  ? "Generar y confirmar clave segura"
                  : "Generate secure password"
              }
              alGenerar={(clave) => {
                establecerNuevaContrasena(clave);
                establecerConfirmacion(clave);
              }}
            />
            <button disabled={enviando} className="boton-primario">
              {enviando
                ? "…"
                : es
                  ? "Actualizar y cerrar sesiones"
                  : "Update and sign out"}
            </button>
          </form>
        </section>
        {usuario?.rol === "ADMINISTRADOR" && !usuario.debeCambiarContrasena && (
          <section className="panel p-6 sm:p-8 lg:col-start-2">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="text-marca-500" />
              <div>
                <h2 className="font-semibold">
                  {es
                    ? "Autenticación de dos factores"
                    : "Two-factor authentication"}
                </h2>
                <p className="text-sm text-slate-500">
                  {es
                    ? "Protege la cuenta administrativa aunque alguien conozca la contraseña."
                    : "Protects the administrator account even if someone knows the password."}
                </p>
              </div>
            </div>
            {usuario.mfaHabilitado ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                  {es
                    ? "Activo · se solicitará un código nuevo al iniciar sesión."
                    : "Active · a new code will be requested when signing in."}
                </div>
                <details className="max-w-lg rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {es
                      ? "Desactivar segundo factor"
                      : "Disable two-factor authentication"}
                  </summary>
                  <form onSubmit={desactivarMfa} className="mt-4 space-y-4">
                    <p className="text-sm leading-6 text-slate-500">
                      {es
                        ? "Confirma con tu contraseña y el código actual. Por seguridad, cerrarás sesión al terminar."
                        : "Confirm with your password and current code. For security, you will be signed out afterwards."}
                    </p>
                    <div>
                      <label htmlFor="mfa-contrasena" className="etiqueta">
                        {es ? "Contraseña actual" : "Current password"}
                      </label>
                      <CampoContrasena
                        id="mfa-contrasena"
                        value={contrasenaMfa}
                        onChange={(evento) =>
                          establecerContrasenaMfa(evento.target.value)
                        }
                        autoComplete="current-password"
                        minLength={6}
                        required
                      />
                    </div>
                    <label>
                      <span className="etiqueta">
                        {es
                          ? "Código actual de 6 dígitos"
                          : "Current 6-digit code"}
                      </span>
                      <input
                        value={codigoDesactivarMfa}
                        onChange={(evento) =>
                          establecerCodigoDesactivarMfa(
                            evento.target.value.replace(/\D/g, ""),
                          )
                        }
                        className="campo text-center font-mono tracking-[.35em]"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                      />
                    </label>
                    <button
                      disabled={procesandoMfa}
                      className="boton-secundario border-red-300 text-red-700 dark:text-red-300"
                    >
                      {procesandoMfa
                        ? es
                          ? "Procesando…"
                          : "Processing…"
                        : es
                          ? "Confirmar y cerrar sesiones"
                          : "Confirm and sign out"}
                    </button>
                  </form>
                </details>
              </div>
            ) : configuracionMfa ? (
              <form onSubmit={confirmarMfa} className="max-w-lg space-y-4">
                <p className="text-sm leading-6 text-slate-500">
                  {es
                    ? "Agrega esta clave en Google Authenticator, Microsoft Authenticator, 1Password o equivalente."
                    : "Add this key to Google Authenticator, Microsoft Authenticator, 1Password, or an equivalent app."}
                </p>
                <div className="rounded-lg bg-slate-950 p-4 text-white">
                  <p className="break-all text-center font-mono text-sm tracking-widest">
                    {configuracionMfa.secreto}
                  </p>
                  <button
                    type="button"
                    className="mx-auto mt-3 block rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold hover:bg-slate-800"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(configuracionMfa.secreto)
                        .then(() =>
                          establecerMensaje(
                            es
                              ? "Clave del autenticador copiada."
                              : "Authenticator key copied.",
                          ),
                        )
                        .catch(() =>
                          establecerError(
                            es
                              ? "No se pudo copiar automáticamente. Selecciona la clave manualmente."
                              : "Could not copy automatically. Select the key manually.",
                          ),
                        );
                    }}
                  >
                    {es ? "Copiar clave" : "Copy key"}
                  </button>
                </div>
                <label>
                  <span className="etiqueta">
                    {es ? "Código actual de 6 dígitos" : "Current 6-digit code"}
                  </span>
                  <input
                    name="codigo"
                    className="campo text-center font-mono tracking-[.35em]"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </label>
                <button disabled={procesandoMfa} className="boton-primario">
                  {procesandoMfa
                    ? es
                      ? "Activando…"
                      : "Enabling…"
                    : es
                      ? "Confirmar y activar"
                      : "Confirm and enable"}
                </button>
              </form>
            ) : (
              <button
                className="boton-primario"
                disabled={procesandoMfa}
                onClick={() => void iniciarMfa()}
              >
                {procesandoMfa
                  ? es
                    ? "Preparando…"
                    : "Preparing…"
                  : es
                    ? "Configurar segundo factor"
                    : "Set up two-factor authentication"}
              </button>
            )}
          </section>
        )}
      </div>
    </>
  );
}
