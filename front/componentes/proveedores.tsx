"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, limpiarEstadoApi } from "@/lib/api";
import {
  notificarSesionInvalidada,
  suscribirSesionInvalidada,
} from "@/lib/eventosDatos";
import { Idioma, textos } from "@/lib/i18n";
import type { UsuarioSesion } from "@/lib/tipos";

interface ContextoAplicacion {
  usuario: UsuarioSesion | null;
  cargandoSesion: boolean;
  establecerUsuario: (usuario: UsuarioSesion | null) => void;
  cerrarSesion: () => Promise<void>;
  idioma: Idioma;
  alternarIdioma: () => void;
  t: Record<keyof (typeof textos)["es"], string>;
  oscuro: boolean;
  alternarTema: () => void;
}

const Contexto = createContext<ContextoAplicacion | null>(null);
let sesionInicialEnCurso: Promise<{ usuario: UsuarioSesion }> | null = null;

function consultarSesionInicial() {
  if (sesionInicialEnCurso) return sesionInicialEnCurso;
  sesionInicialEnCurso = api<{ usuario: UsuarioSesion }>(
    "/auth/sesion",
  ).finally(() => {
    sesionInicialEnCurso = null;
  });
  return sesionInicialEnCurso;
}

export function Proveedores({ children }: { children: React.ReactNode }) {
  const [usuario, establecerUsuario] = useState<UsuarioSesion | null>(null);
  const [cargandoSesion, establecerCargando] = useState(true);
  const [idioma, establecerIdioma] = useState<Idioma>("es");
  const [oscuro, establecerOscuro] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let montado = true;
    const idiomaGuardado = localStorage.getItem("idioma") as Idioma | null;
    const temaGuardado = localStorage.getItem("tema") === "oscuro";
    if (idiomaGuardado && textos[idiomaGuardado]) {
      establecerIdioma(idiomaGuardado);
      document.documentElement.lang = idiomaGuardado;
    }
    establecerOscuro(temaGuardado);
    document.documentElement.classList.toggle("dark", temaGuardado);
    const cancelarSesionInvalidada = suscribirSesionInvalidada(() => {
      if (!montado) return;
      limpiarEstadoApi();
      establecerUsuario(null);
      establecerCargando(false);
      router.replace("/");
    });
    consultarSesionInicial()
      .then((respuesta) => {
        if (montado) establecerUsuario(respuesta.usuario);
      })
      .catch(() => {
        if (montado) establecerUsuario(null);
      })
      .finally(() => {
        if (montado) establecerCargando(false);
      });
    return () => {
      montado = false;
      cancelarSesionInvalidada();
    };
  }, [router]);

  const alternarTema = useCallback(() => {
    establecerOscuro((actual) => {
      const siguiente = !actual;
      document.documentElement.classList.toggle("dark", siguiente);
      localStorage.setItem("tema", siguiente ? "oscuro" : "claro");
      return siguiente;
    });
  }, []);
  const alternarIdioma = useCallback(() => {
    establecerIdioma((actual) => {
      const siguiente = actual === "es" ? "en" : "es";
      localStorage.setItem("idioma", siguiente);
      document.documentElement.lang = siguiente;
      return siguiente;
    });
  }, []);
  const cerrarSesion = useCallback(async () => {
    await api("/auth/cerrar-sesion", { method: "POST", body: "{}" }).catch(
      () => undefined,
    );
    limpiarEstadoApi();
    notificarSesionInvalidada({ motivo: "CIERRE_SESION" });
    establecerUsuario(null);
    router.replace("/");
  }, [router]);

  const valor = useMemo(
    () => ({
      usuario,
      cargandoSesion,
      establecerUsuario,
      cerrarSesion,
      idioma,
      alternarIdioma,
      t: textos[idioma],
      oscuro,
      alternarTema,
    }),
    [
      usuario,
      cargandoSesion,
      cerrarSesion,
      idioma,
      alternarIdioma,
      oscuro,
      alternarTema,
    ],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarAplicacion() {
  const contexto = useContext(Contexto);
  if (!contexto)
    throw new Error("El contexto de aplicacion no esta disponible.");
  return contexto;
}
