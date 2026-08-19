"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers3, LockKeyhole, Moon, Sun } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import type { UsuarioSesion } from "@/lib/tipos";
import { usarAplicacion } from "@/componentes/proveedores";
import { obtenerRutaInicialWeb } from "@/lib/permisos";

export default function InicioSesion() {
  const {
    usuario,
    cargandoSesion,
    establecerUsuario,
    idioma,
    alternarIdioma,
    oscuro,
    alternarTema,
  } = usarAplicacion();
  const router = useRouter();
  const [correo, establecerCorreo] = useState("");
  const [contrasena, establecerContrasena] = useState("");
  const [codigoMfa, establecerCodigoMfa] = useState("");
  const [mfaRequerido, establecerMfaRequerido] = useState(false);
  const [error, establecerError] = useState("");
  const [enviando, establecerEnviando] = useState(false);
  const es = idioma === "es";

  useEffect(() => {
    if (usuario) router.replace(obtenerRutaInicialWeb(usuario.rol));
  }, [usuario, router]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    establecerEnviando(true);
    establecerError("");
    try {
      const respuesta = await api<{
        usuario?: UsuarioSesion;
        mfaRequerido?: boolean;
      }>(
        "/auth/iniciar-sesion",
        {
          method: "POST",
          body: JSON.stringify({
            correo,
            contrasena,
            cliente: "WEB",
            codigoMfa: codigoMfa || undefined,
          }),
        },
      );
      if (respuesta.mfaRequerido) {
        establecerMfaRequerido(true);
        return;
      }
      if (!respuesta.usuario) throw new Error("Respuesta de sesión incompleta");
      establecerUsuario(respuesta.usuario);
      router.replace(obtenerRutaInicialWeb(respuesta.usuario.rol));
    } catch (err) {
      establecerError(
        err instanceof ErrorApi
          ? err.message
          : es
            ? "No fue posible iniciar sesión."
            : "Unable to sign in.",
      );
    } finally {
      establecerEnviando(false);
    }
  }

  if (cargandoSesion || usuario)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Nexo…
      </div>
    );

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden bg-marca-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-marca-500/30 blur-3xl" />
        <div className="relative flex items-center gap-3 text-lg font-semibold">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-marca-700">
            <Layers3 size={22} />
          </span>
          Nexo
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.25em] text-blue-200">
            {es ? "Cobranza inteligente" : "Smarter collections"}
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08]">
            {es
              ? "Tu operación completa, clara y en movimiento."
              : "Your whole operation, clear and moving."}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100">
            {es
              ? "Clientes, rutas, ventas e inventario en un sistema diseñado para trabajar rápido incluso donde no hay señal."
              : "Customers, routes, sales, and inventory in a system designed to move fast—even without a signal."}
          </p>
        </div>
        <p className="relative text-sm text-blue-200">Nexo Cobranza · 2026</p>
      </section>

      <section className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
        <div className="flex justify-end gap-2 p-5">
          <button
            onClick={alternarIdioma}
            className="boton-secundario"
            aria-label="Cambiar idioma"
          >
            {es ? "EN" : "ES"}
          </button>
          <button
            onClick={alternarTema}
            className="boton-secundario px-3"
            aria-label="Cambiar tema"
          >
            {oscuro ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-7 pb-24">
          <div className="mb-9 lg:hidden">
            <div className="flex items-center gap-3 text-xl font-semibold">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-marca-500 text-white">
                <Layers3 size={22} />
              </span>
              Nexo
            </div>
          </div>
          <div className="mb-8">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-marca-50 text-marca-600 dark:bg-marca-900/40">
              <LockKeyhole size={22} />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {es ? "Bienvenido de nuevo" : "Welcome back"}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {es
                ? "Ingresa para consultar la operación de hoy."
                : "Sign in to review today’s operation."}
            </p>
          </div>
          <form onSubmit={enviar} className="space-y-5">
            <label className="block">
              <span className="etiqueta">
                {es ? "Correo electrónico" : "Email address"}
              </span>
              <input
                className="campo"
                type="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => establecerCorreo(e.target.value)}
                required
              />
            </label>
            {mfaRequerido && (
              <label className="block">
                <span className="etiqueta">
                  {es ? "Código del autenticador" : "Authenticator code"}
                </span>
                <input
                  className="campo text-center font-mono text-lg tracking-[.35em]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={codigoMfa}
                  onChange={(e) =>
                    establecerCodigoMfa(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoFocus
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="etiqueta">{es ? "Contraseña" : "Password"}</span>
              <input
                className="campo"
                type="password"
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => establecerContrasena(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                {error}
              </div>
            )}
            <button disabled={enviando} className="boton-primario w-full">
              {enviando
                ? es
                  ? "Ingresando…"
                  : "Signing in…"
                : es
                  ? "Iniciar sesión"
                  : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="mt-7 text-center text-xs leading-5 text-slate-400">
            {es
              ? "La sesión está protegida con cifrado de transporte y controles por rol."
              : "Your session is protected with transport encryption and role-based access."}
          </p>
        </div>
      </section>
    </main>
  );
}
