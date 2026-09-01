"use client";

import {
  BarChart3,
  BellRing,
  Boxes,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Languages,
  LogOut,
  Menu,
  Moon,
  PackageCheck,
  RotateCcw,
  Route,
  Settings,
  ShoppingCart,
  Sun,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  type ModuloWeb,
  esRolExclusivoMovil,
  obtenerRutaInicialWeb,
  puedeAccederModuloWeb,
  puedeAccederRutaWeb,
} from "@/lib/permisos";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import { obtenerPracticaWebSegura } from "@/modulos/capacitacion/indicePracticasWeb";
import { AccionesRapidas } from "./AccionesRapidas";
import { BuscadorGlobal } from "./BuscadorGlobal";
import { usarAplicacion } from "./proveedores";

const CargadorEntrenadorPantallaReal = dynamic(
  () =>
    import("@/modulos/capacitacion/CargadorEntrenadorPantallaReal").then(
      (modulo) => modulo.CargadorEntrenadorPantallaReal,
    ),
  {
    ssr: false,
    loading: () => (
      <aside
        className="m-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
        aria-live="polite"
      >
        Vektra…
      </aside>
    ),
  },
);

const navegacion: Array<{
  href: string;
  clave: ModuloWeb;
  icono: typeof Users;
}> = [
  {
    href: "/inicio",
    clave: "inicio",
    icono: BarChart3,
  },
  {
    href: "/clientes",
    clave: "clientes",
    icono: Users,
  },
  {
    href: "/ventas",
    clave: "ventas",
    icono: CreditCard,
  },
  {
    href: "/inventario",
    clave: "inventario",
    icono: Boxes,
  },
  {
    href: "/rutas",
    clave: "rutas",
    icono: Route,
  },
  {
    href: "/pedidos",
    clave: "pedidos",
    icono: PackageCheck,
  },
  { href: "/compras", clave: "compras", icono: ShoppingCart },
  { href: "/devoluciones", clave: "devoluciones", icono: RotateCcw },
  { href: "/cortes", clave: "cortes", icono: WalletCards },
  { href: "/alertas", clave: "alertas", icono: BellRing },
  {
    href: "/reportes",
    clave: "reportes",
    icono: ClipboardList,
  },
  {
    href: "/usuarios",
    clave: "usuarios",
    icono: Users,
  },
  { href: "/configuracion", clave: "configuracion", icono: Settings },
  { href: "/capacitacion", clave: "capacitacion", icono: GraduationCap },
];

const principalesPorRol: Record<
  import("@/lib/tipos").Rol,
  readonly ModuloWeb[]
> = {
  ADMINISTRADOR: ["inicio", "clientes", "ventas", "inventario", "pedidos"],
  CONTABLE: ["inicio", "clientes", "ventas", "cortes", "reportes"],
  VENDEDOR: ["inicio", "ventas", "clientes", "pedidos"],
  ALMACENISTA: ["inicio", "inventario", "pedidos", "compras"],
  COBRADOR: ["inicio", "rutas", "clientes", "pedidos", "cortes"],
};

export function Panel({ children }: { children: React.ReactNode }) {
  const {
    usuario,
    cargandoSesion,
    cerrarSesion,
    t,
    idioma,
    alternarIdioma,
    oscuro,
    alternarTema,
  } = usarAplicacion();
  const [abierto, establecerAbierto] = useState(false);
  const [totalAlertas, establecerTotalAlertas] = useState(0);
  const ruta = usePathname();
  const parametros = useSearchParams();
  const router = useRouter();
  const practicaSolicitada = parametros.get("practica");
  const practicaSegura = usuario
    ? obtenerPracticaWebSegura(practicaSolicitada, ruta, usuario.rol)
    : null;
  const practicaInvalida = Boolean(
    !cargandoSesion && usuario && practicaSolicitada && !practicaSegura,
  );
  const enPracticaReal = Boolean(practicaSegura);
  const actualizarAlertas = useCallback(() => {
    if (!usuario || usuario.debeCambiarContrasena) return;
    return api<{ totales: { total: number } }>("/alertas")
      .then((respuesta) => establecerTotalAlertas(respuesta.totales.total))
      .catch(() => undefined);
  }, [usuario]);
  usarDatosVivos(actualizarAlertas, { recursos: ["alertas"] });

  useEffect(() => {
    if (!cargandoSesion && !usuario) router.replace("/");
    else if (usuario?.debeCambiarContrasena && ruta !== "/perfil")
      router.replace("/perfil");
    else if (usuario && esRolExclusivoMovil(usuario.rol)) void cerrarSesion();
    else if (usuario && !puedeAccederRutaWeb(usuario.rol, ruta))
      router.replace(obtenerRutaInicialWeb(usuario.rol));
  }, [cargandoSesion, usuario, router, ruta, cerrarSesion]);
  useEffect(() => {
    if (!usuario) return;
    void actualizarAlertas();
  }, [usuario, actualizarAlertas]);
  useEffect(() => {
    if (!practicaInvalida) return;
    const siguientes = new URLSearchParams(parametros.toString());
    siguientes.delete("practica");
    const consulta = siguientes.toString();
    router.replace(consulta ? `${ruta}?${consulta}` : ruta);
  }, [parametros, practicaInvalida, router, ruta]);

  if (cargandoSesion || !usuario)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-600">
        {idioma === "es" ? "Cargando Vektra…" : "Loading Vektra…"}
      </div>
    );
  if (esRolExclusivoMovil(usuario.rol))
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-600">
        {idioma === "es"
          ? "Este puesto utiliza la aplicación móvil de Vektra…"
          : "This role uses the Vektra mobile application…"}
      </div>
    );
  if (usuario.debeCambiarContrasena && ruta !== "/perfil")
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-600">
        {idioma === "es"
          ? "Protegiendo tu cuenta antes de continuar…"
          : "Securing your account before continuing…"}
      </div>
    );
  if (!puedeAccederRutaWeb(usuario.rol, ruta))
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-600">
        {idioma === "es"
          ? "Aplicando permisos de tu rol…"
          : "Applying your role permissions…"}
      </div>
    );
  const opcionesPermitidas = navegacion.filter((opcion) =>
    puedeAccederModuloWeb(usuario.rol, opcion.clave),
  );
  const clavesPrincipales = principalesPorRol[usuario.rol];
  const opciones = opcionesPermitidas.filter((opcion) =>
    clavesPrincipales.includes(opcion.clave),
  );
  const herramientas = opcionesPermitidas.filter(
    (opcion) => !clavesPrincipales.includes(opcion.clave),
  );
  const paginaActual = opcionesPermitidas.find(
    (opcion) => ruta === opcion.href || ruta.startsWith(`${opcion.href}/`),
  );
  const tituloPagina = paginaActual
    ? t[paginaActual.clave]
    : ruta === "/perfil"
      ? idioma === "es"
        ? "Perfil"
        : "Profile"
      : "Vektra";

  const enlaceNavegacion = (
    opcion: (typeof navegacion)[number],
    compacto = false,
  ) => {
    const Icono = opcion.icono;
    const activa = ruta === opcion.href || ruta.startsWith(`${opcion.href}/`);
    return (
      <Link
        key={opcion.href}
        href={opcion.href}
        onClick={() => establecerAbierto(false)}
        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
          activa
            ? "bg-marca-50 text-marca-700 dark:bg-marca-900/30 dark:text-blue-200"
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
        } ${compacto ? "min-h-10 text-[13px]" : ""}`}
      >
        <Icono size={compacto ? 17 : 19} />
        {t[opcion.clave]}
        {opcion.clave === "alertas" && totalAlertas > 0 && (
          <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
            {totalAlertas > 99 ? "99+" : totalAlertas}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {abierto && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => establecerAbierto(false)}
          aria-label={idioma === "es" ? "Cerrar menú" : "Close menu"}
        />
      )}
      <aside
        id="menu-principal"
        className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r bg-white transition-transform dark:bg-slate-950 lg:sticky lg:top-0 lg:h-screen lg:w-auto ${abierto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-18 items-center justify-between px-5 py-5">
          <Link
            href={obtenerRutaInicialWeb(usuario.rol)}
            className="flex items-center"
          >
            <Image
              src="/brand/vektra-logo.webp"
              alt="Vektra · Precision in Motion"
              width={156}
              height={64}
              priority
              className="h-12 w-auto object-contain object-left"
            />
          </Link>
          <button
            type="button"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg lg:hidden"
            onClick={() => establecerAbierto(false)}
            aria-label={idioma === "es" ? "Cerrar menú" : "Close menu"}
          >
            <X aria-hidden />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
            {idioma === "es" ? "Mi trabajo" : "My work"}
          </p>
          <div className="space-y-1">
            {opciones.map((opcion) => enlaceNavegacion(opcion))}
          </div>
          {herramientas.length > 0 && (
            <details
              className="group mt-5"
              open={herramientas.some((opcion) => ruta === opcion.href)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900">
                {idioma === "es" ? "Más herramientas" : "More tools"}
                <ChevronDown
                  className="transition group-open:rotate-180"
                  size={16}
                />
              </summary>
              <div className="mt-1 space-y-1">
                {herramientas.map((opcion) => enlaceNavegacion(opcion, true))}
              </div>
            </details>
          )}
        </nav>
        <div className="border-t p-4">
          <div className="mb-3 grid grid-cols-2 gap-2 lg:hidden">
            <button
              type="button"
              className="boton-secundario px-3"
              onClick={alternarIdioma}
              aria-label={t.idioma}
            >
              <Languages size={17} /> {idioma === "es" ? "EN" : "ES"}
            </button>
            <button
              type="button"
              className="boton-secundario px-3"
              onClick={alternarTema}
              aria-label={t.tema}
            >
              {oscuro ? <Sun size={17} /> : <Moon size={17} />}
              {oscuro
                ? idioma === "es"
                  ? "Claro"
                  : "Light"
                : idioma === "es"
                  ? "Oscuro"
                  : "Dark"}
            </button>
          </div>
          <Link
            href="/perfil"
            className="block rounded-lg p-1 hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <p className="truncate text-sm font-semibold">{usuario.nombre}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {usuario.rol.toLowerCase()} ·{" "}
              {idioma === "es" ? "Perfil" : "Profile"}
            </p>
          </Link>
          <button
            onClick={cerrarSesion}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 dark:text-slate-300"
          >
            <LogOut size={17} />
            {t.salir}
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur dark:bg-slate-950/90 sm:px-7">
          <button
            className="boton-secundario relative px-3 lg:hidden"
            onClick={() => establecerAbierto(true)}
            aria-label={
              totalAlertas > 0
                ? idioma === "es"
                  ? `Abrir menú, ${totalAlertas} alerta${totalAlertas === 1 ? "" : "s"} pendiente${totalAlertas === 1 ? "" : "s"}`
                  : `Open menu, ${totalAlertas} pending alert${totalAlertas === 1 ? "" : "s"}`
                : idioma === "es"
                  ? "Abrir menú"
                  : "Open menu"
            }
            aria-controls="menu-principal"
            aria-expanded={abierto}
            data-testid="menu-movil"
          >
            <Menu aria-hidden size={19} />
            {totalAlertas > 0 && (
              <span
                className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white"
                aria-hidden
                data-testid="menu-movil-alertas"
              >
                {totalAlertas > 99 ? "99+" : totalAlertas}
              </span>
            )}
          </button>
          <p className="min-w-0 truncate text-sm font-semibold sm:text-base">
            {tituloPagina}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <BuscadorGlobal rol={usuario.rol} idioma={idioma} />
            <AccionesRapidas rol={usuario.rol} idioma={idioma} modo="menu" />
            <Link
              href={`/capacitacion?pantalla=${paginaActual?.clave ?? "inicio"}`}
              className="boton-secundario hidden px-3 sm:inline-flex"
              title={
                idioma === "es" ? "Aprender esta pantalla" : "Learn this screen"
              }
              aria-label={
                idioma === "es" ? "Aprender esta pantalla" : "Learn this screen"
              }
              data-testid="ayuda-contextual"
            >
              <CircleHelp size={18} />
            </Link>
            <Link
              href="/alertas"
              className="boton-secundario relative hidden px-3 sm:inline-flex"
              title={t.alertas}
              aria-label={t.alertas}
            >
              <BellRing size={18} />
              {totalAlertas > 0 && (
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white">
                  {totalAlertas > 99 ? "99+" : totalAlertas}
                </span>
              )}
            </Link>
            <button
              className="boton-secundario hidden px-3 sm:inline-flex"
              onClick={alternarIdioma}
              title={t.idioma}
            >
              <Languages size={18} />
            </button>
            <button
              className="boton-secundario hidden px-3 sm:inline-flex"
              onClick={alternarTema}
              title={t.tema}
            >
              {oscuro ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <div
          className={
            enPracticaReal
              ? "flex min-w-0 flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-4 xl:px-4"
              : ""
          }
          data-testid={
            enPracticaReal ? "layout-practica-sin-traslape" : undefined
          }
        >
          {practicaSegura && (
            <div
              className="sticky top-16 z-10 order-1 border-y border-amber-300 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50 xl:col-span-2"
              role="status"
              data-testid="banner-practica-segura"
            >
              <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide sm:text-sm">
                  <GraduationCap className="shrink-0" size={19} />
                  {idioma === "es"
                    ? "MODO PRÁCTICA · NADA SE GUARDARÁ EN LA BASE DE DATOS"
                    : "PRACTICE MODE · NOTHING WILL BE SAVED TO THE DATABASE"}
                </p>
                <Link
                  href={ruta}
                  className="rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-black dark:bg-amber-100 dark:text-amber-950"
                >
                  {idioma === "es" ? "Salir de práctica" : "Exit practice"}
                </Link>
              </div>
            </div>
          )}
          <main
            className={`mx-auto w-full max-w-[1500px] p-4 sm:p-7 ${enPracticaReal ? "order-2 pb-40 lg:pb-28 xl:order-1 xl:pb-7" : "pb-24 sm:pb-24 lg:pb-7"}`}
            data-pantalla-operativa
          >
            {practicaInvalida ? (
              <section
                className="panel mx-auto max-w-xl p-6 text-center"
                role="alert"
                data-testid="practica-invalida-bloqueada"
              >
                <h1 className="text-xl font-black">
                  {idioma === "es"
                    ? "Práctica no reconocida"
                    : "Unknown practice"}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {idioma === "es"
                    ? "Se retiró el identificador inválido antes de habilitar cualquier acción."
                    : "The invalid identifier was removed before enabling any action."}
                </p>
              </section>
            ) : (
              children
            )}
          </main>
          {practicaSegura && (
            <div className="order-1 min-w-0 xl:sticky xl:top-[7.75rem] xl:order-2 xl:self-start xl:py-4">
              <CargadorEntrenadorPantallaReal
                usuarioId={usuario.id}
                rol={usuario.rol}
                leccionId={practicaSegura.id}
                ruta={ruta}
                idioma={idioma}
              />
            </div>
          )}
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid border-t bg-white/95 px-1 pb-[max(0.3rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-slate-950/95 lg:hidden"
        style={{
          gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))`,
        }}
        aria-label={idioma === "es" ? "Accesos principales" : "Main shortcuts"}
      >
        {opciones.map((opcion) => {
          const Icono = opcion.icono;
          const activa =
            ruta === opcion.href || ruta.startsWith(`${opcion.href}/`);
          return (
            <Link
              key={`movil-${opcion.href}`}
              href={opcion.href}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold ${
                activa ? "text-blue-700 dark:text-blue-300" : "text-slate-500"
              }`}
            >
              <Icono size={19} />
              <span className="max-w-full truncate">{t[opcion.clave]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
