# Registro de deuda técnica y riesgos aceptados

Este registro hace visibles los compromisos que permiten avanzar rápido. Una deuda no es “código feo”: es una solución conscientemente limitada que tiene riesgo, contención actual y una condición observable para pagarla. Si no puede describirse así, debe tratarse como defecto o propuesta de arquitectura.

## Política de gestión

- **P0 — inmediata:** riesgo activo de pérdida de datos, fraude, indisponibilidad o exposición. Bloquea liberación.
- **P1 — próxima liberación/producción:** no siempre falla hoy, pero debe resolverse antes del hito o condición indicada.
- **P2 — crecimiento:** se atiende cuando el disparador medible se cumple; adelantarla puede ser sobreingeniería.
- **P3 — mejora:** reduce costo o complejidad sin riesgo operativo cercano.
- Estados: `ABIERTA`, `EN_CURSO`, `MONITOREADA`, `BLOQUEADA_PROVEEDOR`, `ACEPTADA_TEMPORALMENTE` y `CERRADA`.
- Cada deuda tiene un rol responsable, no necesariamente una persona. En cada liberación se revisan P0/P1; mensualmente se revisan disparadores y trimestralmente se revisa todo el registro.
- Cerrar exige evidencia: prueba, migración, métrica, escaneo, simulacro o documento operativo. “Ya no parece necesario” no es evidencia.
- Una entrega que agrega deuda debe registrarla en la misma entrega. No se permiten `TODO` críticos sin ID `DT-nnn` enlazado aquí.

## Resumen actual

| ID | Tema | Prioridad | Estado | Responsable |
| --- | --- | --- | --- | --- |
| DT-001 | Avisos Expo/Metro sin parche compatible | P1 | BLOQUEADA_PROVEEDOR | Móvil/Seguridad |
| DT-002 | Rate limiting y trabajos sólo por instancia | P2 | MONITOREADA | Plataforma |
| DT-003 | Reconciliación automática de proyecciones | P1 | ABIERTA | Backend/Contabilidad |
| DT-004 | Evidencias binarias dentro de PostgreSQL | P2 | ACEPTADA_TEMPORALMENTE | Plataforma |
| DT-005 | Alcance por fila sin PostgreSQL RLS | P2 | MONITOREADA | Backend/Seguridad |
| DT-006 | Contratos cliente/API no generados | P2 | ABIERTA | Backend/Frontend |
| DT-007 | Dispositivo comprometido y attestation | P2 | ACEPTADA_TEMPORALMENTE | Móvil/Seguridad |
| DT-008 | Rotación de cifrado de campos sin automatizar | P1 | ABIERTA | Seguridad/Datos |
| DT-009 | SQLCipher nativo fuera del CI cotidiano | P1 | ABIERTA | Móvil/QA |
| DT-010 | Libros sin particionado ni archivo | P2 | MONITOREADA | Datos |
| DT-011 | Observabilidad operativa aún no conectada | P1 | ABIERTA | Plataforma |
| DT-012 | Folios legibles, no fiscales consecutivos | P1 | ACEPTADA_TEMPORALMENTE | Producto/Contabilidad |
| DT-013 | `Ruta.cobradorId` nullable por compatibilidad | P1 | ABIERTA | Backend/Operación |
| DT-014 | Reportes grandes ejecutados en petición HTTP | P2 | MONITOREADA | Backend/Plataforma |

## DT-001 — Avisos Expo/Metro sin parche compatible

- **Prioridad/estado:** P1 · BLOQUEADA_PROVEEDOR
- **Por qué se aceptó:** Expo SDK 57 es la línea compatible del móvil; la corrección sugerida por npm es un downgrade mayor y no elimina de manera confiable el problema de `image-size`.
- **Riesgo:** recursos maliciosos procesados por herramientas de compilación pueden causar denegación de servicio. No forman parte del runtime backend, pero sí de la cadena de suministro móvil.
- **Contención actual:** backend instalado de forma aislada; compilaciones sólo con recursos controlados; lockfile fijado; auditoría separada de runtime y build.
- **Disparador:** nueva versión Expo/Metro compatible que cierre los advisories o evidencia de explotación en la cadena de build usada.
- **Criterio de salida:** actualizar sin `--force`, pasar Expo Doctor, build iOS/Android, prueba SQLCipher y escaneo de APK/AAB con 0 hallazgos altos aplicables o aceptación formal documentada.

## DT-002 — Rate limiting y trabajos sólo por instancia

- **Prioridad/estado:** P2 · MONITOREADA
- **Por qué se aceptó:** el MVP opera con una instancia API y los límites en memoria son suficientes para pruebas/piloto.
- **Riesgo:** al escalar horizontalmente cada réplica cuenta por separado; tareas programadas podrían duplicarse.
- **Contención actual:** una sola réplica, límites de acceso, transacciones/idempotencia en PostgreSQL.
- **Disparador:** segunda réplica, más de un proceso API o necesidad de trabajos recurrentes distribuidos.
- **Criterio de salida:** Redis/almacén compartido con TTL, claves por operación, elección de líder o cola; prueba con dos instancias que demuestre límite y ejecución única.

## DT-003 — Reconciliación automática de proyecciones

- **Prioridad/estado:** P1 · ABIERTA
- **Por qué se aceptó:** saldo, inventario y libros se actualizan en la misma transacción y las pruebas adversariales cubren carreras/reversas.
- **Riesgo:** una migración manual, defecto futuro o intervención directa podría separar `SaldoCliente`/existencia de sus libros sin detección temprana.
- **Contención actual:** restricciones PostgreSQL, movimientos append-only, pruebas E2E y auditoría administrativa.
- **Disparador:** antes del piloto con dinero real o inmediatamente ante una sola diferencia detectada.
- **Criterio de salida:** comando read-only de reconciliación para saldo e inventario, ejecución nocturna, alerta con IDs afectados, prueba que introduce una diferencia controlada y comprueba su detección. La corrección debe ser autorizada mediante movimiento compensatorio, nunca silenciosa.

## DT-004 — Evidencias binarias dentro de PostgreSQL

- **Prioridad/estado:** P2 · ACEPTADA_TEMPORALMENTE
- **Por qué se aceptó:** simplifica la atomicidad de devoluciones durante el MVP y el volumen actual de fotografías es bajo.
- **Riesgo:** crecimiento de base, backups lentos y respuestas pesadas; retención de PII difícil de separar.
- **Contención actual:** validación de tipo/tamaño/firma, acceso autenticado y respaldo cifrado.
- **Disparador:** más de 5 GB de evidencias, backup mayor a 15 minutos o política de retención distinta a la transacción.
- **Criterio de salida:** almacenamiento de objetos privado con cifrado, hash y metadatos en PostgreSQL, URLs firmadas cortas, política de retención, antivirus y prueba de restauración consistente.

## DT-005 — Alcance por fila sin PostgreSQL RLS

- **Prioridad/estado:** P2 · MONITOREADA
- **Por qué se aceptó:** Prisma/API son el único acceso operativo y los filtros reutilizables producen errores consistentes sin duplicar políticas.
- **Riesgo:** un endpoint nuevo podría omitir el filtro; una integración con acceso directo no hereda la cartera del cobrador.
- **Contención actual:** funciones centrales de alcance, matriz de permisos y E2E con dos cobradores.
- **Disparador:** segunda API, analítica directa, integraciones que consulten tablas, múltiples empresas en la misma base o una omisión real de alcance.
- **Criterio de salida:** políticas RLS versionadas, identidad/empresa inyectada por transacción, rol DB sin `BYPASSRLS`, pruebas positivas/negativas y comparación con filtros de aplicación durante la transición.

## DT-006 — Contratos cliente/API no generados

- **Prioridad/estado:** P2 · ABIERTA
- **Por qué se aceptó:** el monorepo permite coordinar cambios y el número de endpoints todavía es manejable.
- **Riesgo:** Zod, tipos web y tipos móvil pueden divergir; un cliente antiguo puede interpretar mal un cambio.
- **Contención actual:** nombres de dominio comunes, TypeScript, E2E de API y pruebas UI.
- **Disparador:** primer incidente de incompatibilidad, publicación externa de API, tercer cliente o más de dos versiones móviles activas simultáneamente.
- **Criterio de salida:** especificación OpenAPI generada/validada desde contratos canónicos, SDK tipado, verificación de cambios incompatibles en CI y política explícita de versionado/deprecación.

## DT-007 — Dispositivo comprometido y attestation

- **Prioridad/estado:** P2 · ACEPTADA_TEMPORALMENTE
- **Por qué se aceptó:** HMAC con ancla en servidor detecta corrupción/reordenamiento de historia, pero una app puramente software no puede demostrar que el sistema operativo sigue confiable.
- **Riesgo:** malware con sesión y clave del dispositivo podría fabricar operaciones futuras dentro de la cartera y límites del cobrador.
- **Contención actual:** SecureStore, SQLCipher, enrolamiento/revocación, máximo de dispositivos, alcance por fila, precio/costo en servidor, corte y auditoría.
- **Disparador:** operación en dispositivos no administrados, incidente de root/jailbreak o requisito contractual antifraude elevado.
- **Criterio de salida:** MDM obligatorio y, si el modelo de riesgo lo exige, claves hardware-backed/attestation con nonce del servidor, política de bloqueo y simulacro de revocación. Debe documentarse el soporte real por plataforma.

## DT-008 — Rotación de cifrado de campos sin automatizar

- **Prioridad/estado:** P1 · ABIERTA
- **Por qué se aceptó:** una sola clave AES-256-GCM permite cifrar PII de forma clara durante el MVP; cambiarla directamente dejaría datos ilegibles.
- **Riesgo:** compromiso de la clave con rotación lenta o error operativo que inutilice teléfono, dirección y secretos MFA.
- **Contención actual:** clave fuera del código, backups cifrados y procedimiento que prohíbe reemplazo directo.
- **Disparador:** antes de la primera rotación programada, cambio de proveedor de secretos o sospecha de exposición.
- **Criterio de salida:** versionado de clave por registro, lectura dual, migración reentrante por lotes, verificación de conteos/hash, rollback probado y runbook ejecutado sobre restauración desechable.

## DT-009 — SQLCipher nativo fuera del CI cotidiano

- **Prioridad/estado:** P1 · ABIERTA
- **Por qué se aceptó:** la prueba Maestro real existe y fue ejecutada manualmente, pero requiere simulador/dispositivo y build nativo costoso.
- **Riesgo:** una actualización Expo/plugin puede degradar cifrado o migración local sin que las pruebas rápidas lo detecten.
- **Contención actual:** prueba de `PRAGMA cipher_version`, clave incorrecta, integridad y reapertura; TypeScript y HMAC se prueban aparte.
- **Disparador:** antes de cada liberación móvil y ante cualquier cambio en Expo, SQLite, SecureStore o esquema local.
- **Criterio de salida:** trabajo CI en iOS y Android al menos nocturno/release, artefactos de evidencia, fallo obligatorio si SQLCipher no está activo y prueba de actualización desde la versión móvil anterior.

## DT-010 — Libros sin particionado ni archivo

- **Prioridad/estado:** P2 · MONITOREADA
- **Por qué se aceptó:** índices normales simplifican consultas y backups mientras el volumen es moderado.
- **Riesgo:** tablas de movimientos, auditoría y operaciones offline crecerán indefinidamente; vacuum, índices y reportes pueden degradarse.
- **Contención actual:** paginación, límites de consulta, índices por fecha/entidad y snapshots.
- **Disparador:** una tabla mayor a 10 millones de filas, índice mayor que memoria disponible, consulta p95 mayor a 800 ms o backup fuera de ventana.
- **Criterio de salida:** plan probado de particionado mensual/anual, retención legal, archivo verificable, índices por partición y restauración que incluya datos activos más archivo.

## DT-011 — Observabilidad operativa aún no conectada

- **Prioridad/estado:** P1 · ABIERTA
- **Por qué se aceptó:** logs JSON y endpoints de salud permiten desarrollo local, pero no hay una plataforma externa configurada dentro del repositorio.
- **Riesgo:** fallos, latencia, colas offline atascadas o backups ausentes pueden descubrirse por usuarios antes que por operación.
- **Contención actual:** logs redactados, `/salud`, `/salud/listo`, scripts de backup y umbrales documentados.
- **Disparador:** antes de usuarios reales fuera del equipo interno.
- **Criterio de salida:** métricas, logs y errores centralizados; alertas probadas para 5xx, latencia, base, disco, respaldo, sincronización fallida y diferencias de reconciliación; runbook y responsable de guardia.

## DT-012 — Folios legibles, no fiscales consecutivos

- **Prioridad/estado:** P1 · ACEPTADA_TEMPORALMENTE
- **Por qué se aceptó:** los folios actuales son únicos y útiles operativamente; el MVP no se presenta como sistema de facturación fiscal.
- **Riesgo:** no satisfacen series, consecutivos, cancelaciones o timbrado exigidos por autoridad fiscal.
- **Contención actual:** documentación explícita y conservación de snapshots financieros.
- **Disparador:** antes de emitir comprobantes fiscales o usar Nexo como libro contable oficial.
- **Criterio de salida:** requisitos validados por contabilidad, serie/consecutivo transaccional, integración fiscal, estados de cancelación, conciliación y pruebas con ambiente certificado.

## DT-013 — `Ruta.cobradorId` nullable por compatibilidad

- **Prioridad/estado:** P1 · ABIERTA
- **Por qué se aceptó:** la migración no podía inventar responsable para rutas existentes. Dejarlas sin asignar evita filtrar cartera al cobrador equivocado.
- **Riesgo:** Administración puede olvidar asignarlas; la base todavía permite rutas activas sin responsable aunque la API de alta no.
- **Contención actual:** nuevas rutas exigen cobrador activo y los filtros de cobranza excluyen cualquier ruta sin asignación.
- **Disparador:** inmediatamente después de que Administración asigne todas las rutas heredadas.
- **Criterio de salida:** consulta de precondición con cero rutas activas sin cobrador, migración que impida `activa = true` sin `cobradorId`, ajuste del seed y prueba de restricción a nivel PostgreSQL.

## DT-014 — Reportes grandes ejecutados en petición HTTP

- **Prioridad/estado:** P2 · MONITOREADA
- **Por qué se aceptó:** los Excel/PDF actuales se generan rápido con datos de MVP y entregar el archivo en la misma petición simplifica experiencia.
- **Riesgo:** alto consumo de memoria, timeouts y bloqueo del proceso ante reportes masivos.
- **Contención actual:** rangos, paginación en pantallas y backend aislado.
- **Disparador:** exportación mayor a 25 000 filas, archivo mayor a 25 MB, generación p95 mayor a 5 segundos o presión de memoria mayor a 70%.
- **Criterio de salida:** trabajo asíncrono idempotente, cola compartida, generación streaming, almacenamiento temporal privado, progreso/cancelación y caducidad del archivo.

## Plantilla para una deuda nueva

```markdown
## DT-nnn — Título observable

- **Prioridad/estado:** Pn · ESTADO
- **Por qué se aceptó:** decisión consciente que permitió avanzar.
- **Riesgo:** daño concreto, no sólo “mala mantenibilidad”.
- **Contención actual:** controles que reducen el riesgo mientras siga abierta.
- **Disparador:** métrica, fecha regulatoria, hito o evento que obliga a actuar.
- **Criterio de salida:** evidencia objetiva necesaria para cerrarla.
```
