# Privacidad y clasificación de datos

Documento técnico-operativo; el aviso legal al titular debe ser revisado para la jurisdicción aplicable.

## Inventario y finalidad

| Categoría            | Ejemplos                                                   | Finalidad                            | Protección                                                  |
| -------------------- | ---------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| Identidad/contacto   | nombre, teléfono, dirección, localidad                     | entrega, cobranza, ruta              | teléfono/dirección AES-GCM; índice de teléfono HMAC         |
| Financiera operativa | saldo, ventas, abonos, cuotas, riesgo, referencias         | crédito, cobranza, conciliación      | roles, alcance por fila, auditoría                          |
| Fiscal/proveedor     | RFC, contacto, correo, teléfono, notas                     | compras y surtido                    | roles de compras; no exponer a campo                        |
| Evidencia            | fotos de devolución/producto                               | autorización y reconocimiento físico | archivo WebP privado; PostgreSQL sólo guarda ruta/metadatos |
| Ubicación            | coordenadas opcionales de visita, ruta/localidad           | comprobar y organizar operación      | sólo finalidad operativa, acceso limitado                   |
| Seguridad            | hashes Argon2, MFA cifrado, sesiones, dispositivo/HMAC, IP | autenticación, fraude e incidentes   | secretos separados, no exportables, rotación                |
| Auditoría            | actor, acción, entidad, cambios no sensibles               | trazabilidad y defensa               | append-only operativo, Administración                       |

## Acceso mínimo

- Administración: configuración y supervisión completa; MFA obligatorio en producción.
- Contabilidad: saldos, abonos, devoluciones, cortes, reportes y proveedores según permiso; no administra seguridad global.
- Almacén: productos, compras, pedidos y revisión física de devoluciones; no autoriza reembolsos.
- Venta: clientes/pedidos/ventas sin costos de compra.
- Cobranza: sólo clientes/rutas asignados, cobros/ventas/entregas de campo sin costos ni PII ajena.

Los selectores muestran sólo campos necesarios. Un endpoint de catálogo nunca debe reutilizar una ficha completa sensible.

## Retención propuesta

- Ventas, compras, abonos, movimientos, cortes y auditoría: plazo contable/legal definido por la empresa; no borrar por solicitud sin evaluar obligación de conservación.
- Sesiones expiradas, intentos y telemetría: mínimo necesario para investigación; depuración programada y documentada.
- Evidencia de devolución: mientras la operación pueda reclamarse más el plazo legal; después eliminar el archivo conservando el movimiento requerido.
- Dispositivos revocados: conservar identificador/recibos para trazabilidad; eliminar claves cifradas cuando ya no sean necesarias.
- Backups heredan la retención: 14 diarios, 8 semanales, 12 mensuales y destrucción verificable al vencer.

La empresa debe completar plazos concretos, fundamento y responsable antes del piloto.

## Fotografías y evidencia

La interfaz debe informar la finalidad antes de cámara/galería. Fotografías de producto sirven para reconocimiento de catálogo; evidencia de devolución respalda una operación autorizada. No se reutilizan para publicidad, biometría ni perfiles. Los archivos viven fuera de PostgreSQL en una carpeta privada, sin publicación estática; sólo los endpoints autenticados los leen. Acceso, descarga, retención y eliminación se registran conforme a rol y obligación de conservar el movimiento.

## Derechos, baja y anonimización

La baja normal es lógica para no romper libros. Cuando proceda eliminar/anónimizar:

1. Verificar identidad y obligaciones de conservación.
2. Bloquear nuevo uso comercial.
3. Sustituir contacto/dirección/notas no necesarios; eliminar fotografías vencidas.
4. Conservar importes y folios exigidos sin PII directa cuando sea viable.
5. Registrar aprobación, alcance, backups afectados y fecha de expiración residual.

## Claves y búsquedas

- `FIELD_ENCRYPTION_KEY` cifra PII/MFA; `SEARCH_HMAC_KEY` sólo crea índices exactos versionados. Deben ser independientes y estar fuera de Git/imagen.
- Una rotación de HMAC ejecuta reindexación sobre teléfonos descifrados durante ventana controlada y verifica cero filas legadas.
- No use SHA-256 sin clave para teléfonos, RFC, correo u otros espacios de baja entropía.
- Nunca use valores de ejemplo en producción.

## Incidente

Siga `docs/runbooks/INCIDENTE_SEGURIDAD.md`. Determine categorías/personas/intervalo, preserve evidencia, contenga, evalúe notificación y documente. Logs y tickets no deben convertirse en una segunda base de PII.

## Términos y situación fiscal

Los folios de Nexo son identificadores operativos; **no son comprobantes fiscales**. La versión actual no emite CFDI ni sustituye contabilidad/facturación oficial. Si se integra CFDI, se requiere proveedor, claves fiscales, consentimiento/aviso actualizado, retención y un modelo de amenazas específico antes de almacenar datos adicionales.

Los términos de uso deben aclarar responsabilidades del operador, prohibición de compartir cuentas, exactitud de capturas, manejo del teléfono, conciliación de efectivo, disponibilidad offline y canal de aclaraciones. Este repositorio aporta texto técnico, no aprobación jurídica.

## Responsabilidades pendientes de completar

Antes del piloto se deben nombrar responsable de datos/seguridad, canal de derechos, canal de vulnerabilidades, plazos legales, proveedor de hosting/backups y mecanismo de destrucción.
