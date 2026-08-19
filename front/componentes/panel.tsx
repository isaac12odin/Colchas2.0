"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  Languages,
  Layers3,
  LogOut,
  Menu,
  Moon,
  PackageCheck,
  ShoppingCart,
  RotateCcw,
  WalletCards,
  BellRing,
  Settings,
  Route,
  Sun,
  Users,
  X,
} from "lucide-react";
import { usarAplicacion } from "./proveedores";
import { api } from "@/lib/api";
import {
  obtenerRutaInicialWeb,
  puedeAccederModuloWeb,
  puedeAccederRutaWeb,
  type ModuloWeb,
} from "@/lib/permisos";

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
];

export function Panel({ children }: { children: React.ReactNode }) {
  const {
    usuario,
    cargandoSesion,
    cerrarSesion,
    t,
    alternarIdioma,
    oscuro,
    alternarTema,
  } = usarAplicacion();
  const [abierto, establecerAbierto] = useState(false);
  const [totalAlertas, establecerTotalAlertas] = useState(0);
  const ruta = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!cargandoSesion && !usuario) router.replace("/");
    else if (usuario?.debeCambiarContrasena && ruta !== "/perfil")
      router.replace("/perfil");
    else if (usuario && !puedeAccederRutaWeb(usuario.rol, ruta))
      router.replace(obtenerRutaInicialWeb(usuario.rol));
  }, [cargandoSesion, usuario, router, ruta]);
  useEffect(() => {
    if (!usuario) return;
    const actualizar = () =>
      void api<{ totales: { total: number } }>("/alertas")
        .then((respuesta) => establecerTotalAlertas(respuesta.totales.total))
        .catch(() => undefined);
    actualizar();
    const intervalo = window.setInterval(actualizar, 120_000);
    return () => window.clearInterval(intervalo);
  }, [usuario]);

  if (cargandoSesion || !usuario)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Cargando Nexo…
      </div>
    );
  if (usuario.debeCambiarContrasena && ruta !== "/perfil")
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Protegiendo tu cuenta…
      </div>
    );
  if (!puedeAccederRutaWeb(usuario.rol, ruta))
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Aplicando permisos de tu rol…
      </div>
    );
  const opciones = navegacion.filter((opcion) =>
    puedeAccederModuloWeb(usuario.rol, opcion.clave),
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {abierto && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => establecerAbierto(false)}
          aria-label="Cerrar menu"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r bg-white transition-transform dark:bg-slate-950 lg:sticky lg:top-0 lg:h-screen lg:w-auto ${abierto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-18 items-center justify-between px-5 py-5">
          <Link
            href={obtenerRutaInicialWeb(usuario.rol)}
            className="flex items-center gap-3 font-semibold"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-marca-500 text-white">
              <Layers3 size={20} />
            </span>
            Nexo
          </Link>
          <button
            className="lg:hidden"
            onClick={() => establecerAbierto(false)}
          >
            <X />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {opciones.map((opcion) => {
            const Icono = opcion.icono;
            const activa =
              ruta === opcion.href || ruta.startsWith(`${opcion.href}/`);
            return (
              <Link
                key={opcion.href}
                href={opcion.href}
                onClick={() => establecerAbierto(false)}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${activa ? "bg-marca-50 text-marca-700 dark:bg-marca-900/30 dark:text-blue-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}
              >
                <Icono size={19} />
                {t[opcion.clave]}
                {opcion.clave === "alertas" && totalAlertas > 0 && (
                  <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {totalAlertas > 99 ? "99+" : totalAlertas}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <Link
            href="/perfil"
            className="block rounded-lg p-1 hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <p className="truncate text-sm font-semibold">{usuario.nombre}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {usuario.rol.toLowerCase()} · Perfil
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
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur dark:bg-slate-950/90 sm:px-7">
          <button
            className="boton-secundario px-3 lg:hidden"
            onClick={() => establecerAbierto(true)}
          >
            <Menu size={19} />
          </button>
          <div className="ml-auto flex gap-2">
            <button
              className="boton-secundario px-3"
              onClick={alternarIdioma}
              title={t.idioma}
            >
              <Languages size={18} />
            </button>
            <button
              className="boton-secundario px-3"
              onClick={alternarTema}
              title={t.tema}
            >
              {oscuro ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        {usuario.debeCambiarContrasena && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Cambia la contraseña temporal{" "}
            <Link href="/perfil" className="font-bold underline">
              desde tu perfil
            </Link>{" "}
            antes de operar en producción.
          </div>
        )}
        <main className="mx-auto max-w-[1500px] p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
