"use client";

import { FormEvent, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import { EncabezadoPagina, MensajeError } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";

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
    try {
      establecerConfiguracionMfa(
        await api<{ secreto: string; uri: string }>("/auth/mfa/iniciar", {
          method: "POST",
          body: "{}",
        }),
      );
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  async function confirmarMfa(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    try {
      await api("/auth/mfa/confirmar", {
        method: "POST",
        body: JSON.stringify({ codigo: form.get("codigo") }),
      });
      const sesion = await api<{ usuario: NonNullable<typeof usuario> }>(
        "/auth/sesion",
      );
      establecerUsuario(sesion.usuario);
      establecerConfiguracionMfa(null);
      establecerMensaje("Segundo factor habilitado correctamente.");
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
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
            <label>
              <span className="etiqueta">
                {es ? "Contraseña actual" : "Current password"}
              </span>
              <input
                name="contrasenaActual"
                className="campo"
                type="password"
                minLength={8}
                required
              />
            </label>
            <label>
              <span className="etiqueta">
                {es
                  ? "Nueva contraseña (mínimo 12)"
                  : "New password (minimum 12)"}
              </span>
              <input
                name="nuevaContrasena"
                className="campo"
                type="password"
                minLength={12}
                required
              />
            </label>
            <label>
              <span className="etiqueta">
                {es ? "Confirmar nueva contraseña" : "Confirm new password"}
              </span>
              <input
                name="confirmacion"
                className="campo"
                type="password"
                minLength={12}
                required
              />
            </label>
            <button disabled={enviando} className="boton-primario">
              {enviando
                ? "…"
                : es
                  ? "Actualizar y cerrar sesiones"
                  : "Update and sign out"}
            </button>
          </form>
        </section>
        {usuario?.rol === "ADMINISTRADOR" && (
          <section className="panel p-6 sm:p-8 lg:col-start-2">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="text-marca-500" />
              <div>
                <h2 className="font-semibold">Autenticación de dos factores</h2>
                <p className="text-sm text-slate-500">
                  Protege la cuenta administrativa aunque alguien conozca la contraseña.
                </p>
              </div>
            </div>
            {usuario.mfaHabilitado ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                Activo · se solicitará un código nuevo al iniciar sesión.
              </div>
            ) : configuracionMfa ? (
              <form onSubmit={confirmarMfa} className="max-w-lg space-y-4">
                <p className="text-sm leading-6 text-slate-500">
                  Agrega manualmente esta clave en Google Authenticator, Microsoft Authenticator, 1Password o equivalente.
                </p>
                <div className="rounded-lg bg-slate-950 p-4 text-center font-mono text-sm tracking-widest text-white">
                  {configuracionMfa.secreto}
                </div>
                <label><span className="etiqueta">Código actual de 6 dígitos</span><input name="codigo" className="campo text-center font-mono tracking-[.35em]" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label>
                <button className="boton-primario">Confirmar y activar</button>
              </form>
            ) : (
              <button className="boton-primario" onClick={() => void iniciarMfa()}>
                Configurar segundo factor
              </button>
            )}
          </section>
        )}
      </div>
    </>
  );
}
