import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import {
  api,
  ErrorApi,
  guardarTokens,
  limpiarTokens,
  prepararIntegridadDispositivo,
} from "./api";
import type { Usuario } from "./tipos";
import {
  confirmarSesionSegura,
  type EstadoSesionPersistida,
} from "./seguridad/transaccionSesion";

interface Contexto {
  usuario: Usuario | null;
  cargando: boolean;
  sesionOffline: boolean;
  idioma: "es" | "en";
  alternarIdioma: () => void;
  iniciar: (
    correo: string,
    contrasena: string,
    codigoMfa?: string,
  ) => Promise<boolean>;
  salir: () => Promise<void>;
}

const Sesion = createContext<Contexto | null>(null);
const opcionesSeguras = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function validarVinculacion(usuario: Usuario) {
  const vinculada = await SecureStore.getItemAsync("usuario_id_local");
  if (vinculada && vinculada !== usuario.id)
    throw new Error(
      "Este equipo conserva una bitácora de otro usuario. Un administrador debe revocarlo y completar la transferencia controlada antes de cambiar de cuenta.",
    );
}

async function persistirIdentidad(usuario: Usuario) {
  await Promise.all([
    SecureStore.setItemAsync("usuario_id_local", usuario.id, opcionesSeguras),
    SecureStore.setItemAsync(
      "usuario_local",
      JSON.stringify(usuario),
      opcionesSeguras,
    ),
  ]);
}

async function guardarIdentidad(usuario: Usuario) {
  await validarVinculacion(usuario);
  await persistirIdentidad(usuario);
}

async function leerEstadoSesion(): Promise<EstadoSesionPersistida> {
  const [accessToken, refreshToken, usuarioLocal, usuarioIdLocal] =
    await Promise.all([
      SecureStore.getItemAsync("access_token"),
      SecureStore.getItemAsync("refresh_token"),
      SecureStore.getItemAsync("usuario_local"),
      SecureStore.getItemAsync("usuario_id_local"),
    ]);
  return { accessToken, refreshToken, usuarioLocal, usuarioIdLocal };
}

async function restaurarItem(clave: string, valor: string | null) {
  if (valor === null) await SecureStore.deleteItemAsync(clave);
  else await SecureStore.setItemAsync(clave, valor, opcionesSeguras);
}

async function restaurarEstadoSesion(estado: EstadoSesionPersistida) {
  await Promise.all([
    restaurarItem("access_token", estado.accessToken),
    restaurarItem("refresh_token", estado.refreshToken),
    restaurarItem("usuario_local", estado.usuarioLocal),
    restaurarItem("usuario_id_local", estado.usuarioIdLocal),
  ]);
}

function requiereIntegridadOffline(usuario: Usuario) {
  return usuario.rol === "ADMINISTRADOR" || usuario.rol === "COBRADOR";
}

async function borrarCredenciales() {
  await Promise.all([
    limpiarTokens(),
    SecureStore.deleteItemAsync("usuario_local"),
  ]);
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, establecerUsuario] = useState<Usuario | null>(null);
  const [cargando, establecerCargando] = useState(true);
  const [sesionOffline, establecerSesionOffline] = useState(false);
  const [idioma, establecerIdioma] = useState<"es" | "en">("es");

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync("access_token"),
      SecureStore.getItemAsync("idioma"),
      SecureStore.getItemAsync("usuario_local"),
    ])
      .then(async ([token, guardado, identidadLocal]) => {
        if (guardado === "en") establecerIdioma("en");
        if (!token) return;
        try {
          const respuesta = await api<{ usuario: Usuario }>("/auth/sesion");
          await guardarIdentidad(respuesta.usuario);
          if (requiereIntegridadOffline(respuesta.usuario))
            await prepararIntegridadDispositivo();
          establecerUsuario(respuesta.usuario);
          establecerSesionOffline(false);
        } catch (error) {
          // Para poder iniciar la jornada sin cobertura se conserva la última
          // identidad validada. Un rechazo real del servidor sí elimina sesión.
          if (
            error instanceof ErrorApi &&
            error.estado === 0 &&
            identidadLocal
          ) {
            establecerUsuario(JSON.parse(identidadLocal));
            establecerSesionOffline(true);
          } else {
            await borrarCredenciales();
          }
        }
      })
      .finally(() => establecerCargando(false));
  }, []);

  async function iniciar(
    correo: string,
    contrasena: string,
    codigoMfa?: string,
  ) {
    const respuesta = await api<{
      usuario?: Usuario;
      accessToken?: string;
      refreshToken?: string;
      mfaRequerido?: boolean;
    }>("/auth/iniciar-sesion", {
      method: "POST",
      body: JSON.stringify({ correo, contrasena, cliente: "MOVIL", codigoMfa }),
    });
    if (respuesta.mfaRequerido) return true;
    if (!respuesta.usuario || !respuesta.accessToken || !respuesta.refreshToken)
      throw new Error("La respuesta de inicio de sesión está incompleta.");
    try {
      await confirmarSesionSegura(
        {
          usuario: respuesta.usuario,
          accessToken: respuesta.accessToken,
          refreshToken: respuesta.refreshToken,
        },
        {
          validarVinculacion,
          leerEstado: leerEstadoSesion,
          guardarTokens,
          guardarIdentidad: persistirIdentidad,
          prepararIntegridad: async (usuario) => {
            if (requiereIntegridadOffline(usuario))
              await prepararIntegridadDispositivo();
          },
          restaurarEstado: restaurarEstadoSesion,
        },
      );
    } catch (error) {
      // El backend ya emitió esta sesión. Aunque nunca se persista localmente,
      // se revoca para no dejar un refresh token huérfano y activo.
      await api("/auth/cerrar-sesion", {
        method: "POST",
        body: JSON.stringify({ refreshToken: respuesta.refreshToken }),
      }).catch(() => undefined);
      throw error;
    }
    establecerUsuario(respuesta.usuario);
    establecerSesionOffline(false);
    return false;
  }

  async function salir() {
    await api("/auth/cerrar-sesion", {
      method: "POST",
      body: JSON.stringify({
        refreshToken: await SecureStore.getItemAsync("refresh_token"),
      }),
    }).catch(() => undefined);
    await borrarCredenciales();
    establecerUsuario(null);
    establecerSesionOffline(false);
  }

  function alternarIdioma() {
    establecerIdioma((actual) => {
      const nuevo = actual === "es" ? "en" : "es";
      void SecureStore.setItemAsync("idioma", nuevo);
      return nuevo;
    });
  }

  return (
    <Sesion.Provider
      value={{
        usuario,
        cargando,
        sesionOffline,
        idioma,
        alternarIdioma,
        iniciar,
        salir,
      }}
    >
      {children}
    </Sesion.Provider>
  );
}

export function usarSesion() {
  const valor = useContext(Sesion);
  if (!valor) throw new Error("Sesion no disponible");
  return valor;
}
