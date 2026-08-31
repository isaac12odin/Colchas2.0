"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Download,
  LockKeyhole,
  Moon,
  Smartphone,
  Sun,
} from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import type { UsuarioSesion } from "@/lib/tipos";
import { usarAplicacion } from "@/componentes/proveedores";
import { obtenerRutaInicialWeb } from "@/lib/permisos";
import { CampoContrasena } from "@/componentes/CampoContrasena";

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
      }>("/auth/iniciar-sesion", {
        method: "POST",
        body: JSON.stringify({
          correo,
          contrasena,
          cliente: "WEB",
          codigoMfa: codigoMfa || undefined,
        }),
      });
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
      <div className="grid min-h-screen place-items-center text-sm text-slate-600">
        Vektra…
      </div>
    );

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.12fr_.88fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 text-white lg:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/brand/vektra-motion.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-label="Animación de Vektra"
        />
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="relative flex h-full min-h-screen flex-col justify-between p-10 xl:p-14">
          <Image
            src="/brand/vektra-logo.webp"
            alt="Vektra · Precision in Motion"
            width={360}
            height={180}
            priority
            className="h-32 w-auto object-contain object-left brightness-0 invert drop-shadow-lg"
          />
          <p className="max-w-lg text-lg font-medium leading-8 text-white drop-shadow-md">
            {es
              ? "Control administrativo, ventas e inventario con información de la operación al día."
              : "Administrative, sales, and inventory control with current operating data."}
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
        <div className="flex justify-end gap-2 p-3 sm:p-5">
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
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-start px-5 pb-6 sm:justify-center sm:px-7 sm:pb-16 lg:pb-24">
          <div className="mb-2 lg:hidden">
            <Image
              src="/brand/vektra-logo.webp"
              alt="Vektra · Precision in Motion"
              width={260}
              height={120}
              priority
              className="h-16 w-auto object-contain object-left dark:brightness-0 dark:invert sm:h-20"
            />
          </div>
          <div className="mb-4 sm:mb-6">
            <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-marca-50 text-marca-600 dark:bg-marca-900/40 sm:mb-3 sm:h-11 sm:w-11">
              <LockKeyhole size={22} />
            </div>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {es ? "Bienvenido de nuevo" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 sm:mt-2 sm:text-base">
              {es
                ? "Ingresa para consultar la operación de hoy."
                : "Sign in to review today’s operation."}
            </p>
          </div>
          <form onSubmit={enviar} className="space-y-3 sm:space-y-5">
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
                    establecerCodigoMfa(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoFocus
                  required
                />
              </label>
            )}
            <div className="block">
              <label htmlFor="contrasena-login" className="etiqueta">
                {es ? "Contraseña" : "Password"}
              </label>
              <CampoContrasena
                id="contrasena-login"
                className="campo"
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => establecerContrasena(e.target.value)}
                required
                minLength={6}
              />
            </div>
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
          <div className="mt-4 flex items-start gap-2 border-t pt-3 text-xs leading-5 text-slate-600 dark:text-slate-300 sm:mt-6 sm:pt-5">
            <Smartphone className="mt-0.5 shrink-0" size={16} />
            <div className="w-full">
              <p>
                {es
                  ? "Almacenistas y cobradores ingresan únicamente desde la aplicación móvil Vektra."
                  : "Warehouse and collection staff sign in only through the Vektra mobile app."}
              </p>
              <a
                href="/descargas/vektra.apk"
                download="Vektra-Android.apk"
                className="boton-secundario mt-3 w-full justify-center"
              >
                <Download size={16} />
                {es
                  ? "Descargar Vektra para Android"
                  : "Download Vektra for Android"}
              </a>
            </div>
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-slate-600 dark:text-slate-300 sm:mt-7">
            {es
              ? "La sesión está protegida con cifrado de transporte y controles por rol."
              : "Your session is protected with transport encryption and role-based access."}
          </p>
        </div>
      </section>
    </main>
  );
}
