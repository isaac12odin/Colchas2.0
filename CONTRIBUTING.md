# Colaborar en Nexo

Nexo maneja deuda, caja, inventario y datos personales. Un cambio correcto conserva los invariantes de `docs/INVARIANTES_NEGOCIO.md`; una pantalla que “parece funcionar” no sustituye las pruebas transaccionales.

## Flujo

1. Abra una rama `feat/`, `fix/`, `docs/` o `chore/` desde `main` verde.
2. Use commits pequeños en imperativo, preferentemente estilo Conventional Commits: `fix(ventas): conserva saldo en reintento`.
3. Actualice prueba y documentación junto al comportamiento. No agregue secretos, respaldos, PII ni artefactos de Playwright.
4. Ejecute `npm run validar:todo` o explique en el PR qué validación externa queda pendiente.
5. Solicite revisión del dueño indicado en `.github/CODEOWNERS`. Migraciones, permisos, criptografía, caja y despliegue requieren revisión explícita.

## Diseño

- Reglas financieras y autorización viven en backend/PostgreSQL, nunca sólo en la interfaz.
- Web y móvil consumen `openapi.yaml`; ejecute `npm run openapi:check` al cambiar rutas.
- Una operación histórica se compensa, no se borra ni se edita.
- Un módulo nuevo respeta `npm run arquitectura:check`. Si necesita una dependencia nueva, documente el porqué en un ADR antes de modificar la lista permitida.
- Comentarios explican decisiones no evidentes: orden de candados, fechas operativas, HMAC, idempotencia y proyecciones. No narran código obvio.

## Branches y liberación

`main` siempre debe ser desplegable. No se permite push directo para cambios productivos: PR, CI verde y aprobación. Las versiones usan SemVer; cambios incompatibles requieren versión mayor y ventana de compatibilidad móvil. Siga `docs/RELEASE.md` y nunca ejecute `prisma migrate dev` en producción.

## Vulnerabilidades

No abra un issue público con detalles explotables. Siga `SECURITY.md`.
