export interface EstadoSesionPersistida {
  accessToken: string | null;
  refreshToken: string | null;
  usuarioLocal: string | null;
  usuarioIdLocal: string | null;
}

export interface SesionNueva<TUsuario> {
  usuario: TUsuario;
  accessToken: string;
  refreshToken: string;
}

export interface PuertoSesionSegura<TUsuario> {
  validarVinculacion: (usuario: TUsuario) => Promise<void>;
  leerEstado: () => Promise<EstadoSesionPersistida>;
  guardarTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  guardarIdentidad: (usuario: TUsuario) => Promise<void>;
  prepararIntegridad: (usuario: TUsuario) => Promise<void>;
  restaurarEstado: (estado: EstadoSesionPersistida) => Promise<void>;
}

/**
 * Confirma una sesión móvil como una pequeña transacción compensable.
 * La vinculación se valida antes de cualquier escritura y, si SecureStore o
 * el enrolamiento fallan, se restaura exactamente la sesión anterior.
 */
export async function confirmarSesionSegura<TUsuario>(
  nueva: SesionNueva<TUsuario>,
  puerto: PuertoSesionSegura<TUsuario>,
) {
  await puerto.validarVinculacion(nueva.usuario);
  const anterior = await puerto.leerEstado();
  try {
    await puerto.guardarTokens(nueva.accessToken, nueva.refreshToken);
    await puerto.guardarIdentidad(nueva.usuario);
    await puerto.prepararIntegridad(nueva.usuario);
  } catch (error) {
    try {
      await puerto.restaurarEstado(anterior);
    } catch {
      throw new Error(
        "No fue posible confirmar ni restaurar la sesión local. Cierre la aplicación y contacte al administrador.",
      );
    }
    throw error;
  }
}
