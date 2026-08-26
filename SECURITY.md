# Política de seguridad

No publique vulnerabilidades, credenciales, datos de clientes ni evidencia en un issue público.

Reporte de forma privada al propietario del repositorio o al responsable de seguridad designado para la instalación. Incluya versión/commit, componente, impacto, pasos mínimos, evidencia redactada y un medio de contacto. No incluya dumps, tokens funcionales ni PII; acuerde un canal cifrado si hacen falta.

Objetivos iniciales de respuesta: acuse en 2 días hábiles, clasificación en 5 y plan de corrección según severidad. Una crítica con explotación activa se contiene inmediatamente; los plazos pueden cambiar tras evaluar impacto y dependencias.

Versiones soportadas: la versión productiva actual y el parche anterior sólo durante la ventana de rollback declarada. Una app móvil anterior se soporta únicamente si `docs/RELEASE.md` registra compatibilidad; no se prometen parches para builds sin identificación.

Prácticas permitidas sobre entornos propios de prueba: análisis estático, revisión de autorización con datos sintéticos y pruebas de regresión acotadas. Están prohibidos DoS, ingeniería social, acceso persistente, extracción de PII, modificación de saldos reales, prueba contra teléfonos ajenos y publicación antes de coordinar corrección.

Alcance: API, web, app móvil, imágenes oficiales, migraciones, scripts de respaldo/restauración y configuración de proxy incluida en este repositorio. Infraestructura/credenciales de terceros se reportan también al proveedor correspondiente.

Consulte `docs/SEGURIDAD.md` para controles/modelo de amenazas y `docs/runbooks/INCIDENTE_SEGURIDAD.md` para respuesta. Este documento no autoriza pruebas destructivas, acceso a datos ajenos, persistencia ni denegación de servicio.
