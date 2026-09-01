# Seguridad

## Implementado

- Contraseñas Argon2id con 64 MiB de memoria y tres iteraciones.
- JWT de acceso de 15 minutos; refresh token rotatorio, registrado como hash y revocable. El consumo y creación sucesora ocurren en una transacción y los clientes comparten una sola renovación en vuelo.
- En web, tokens en cookies `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Protección CSRF de doble envío para mutaciones web.
- Bearer tokens guardados en SecureStore para la app móvil.
- Teléfono y dirección cifrados en PostgreSQL con AES-256-GCM; la búsqueda exacta de teléfono usa HMAC-SHA-256 versionado con una clave dedicada.
- Jornadas y cola móvil en SQLCipher; clave en SecureStore ligada al dispositivo.
- Autorización por fila: toda ruta nueva exige cobrador; una ruta heredada sin asignación queda inaccesible para Cobranza. El rol `COBRADOR` sólo consulta u opera rutas, clientas, expedientes, ventas, pedidos y abonos dentro de su cartera.
- Directorio extraordinario limitado a clientas activas que pertenecen a otra ruta vigente del mismo cobrador. Incluye los datos necesarios para encontrarlas en campo y permanece cifrado en SQLCipher, aislado por usuario.
- Bitácora móvil con secuencia y HMAC-SHA-512 por operación y lote. El servidor exige las huellas, reconstruye la cadena y conserva un ancla independiente por usuario/dispositivo. Los rechazos de negocio quedan como recibos terminales sin bloquear la cola.
- Datos offline aislados por usuario cuando un teléfono es compartido.
- Helmet, CORS de origen explícito, rate limiting de acceso, límite de cuerpo y redacción de secretos en logs.
- Roles comprobados en la API; ocultar un menú nunca sustituye la autorización del servidor.
- La web y el móvil bloquean además enlaces directos a módulos ajenos al puesto y envían cada rol a una primera pantalla útil.
- Bloqueo temporal tras cinco contraseñas incorrectas, límite de cinco sesiones activas y cambio obligatorio de credencial temporal antes de consultar datos.
- Catálogo e historial del cobrador sin precio de compra; pedidos tampoco exponen costos del producto.
- Auditoría de operaciones administrativas sensibles y libros de movimientos para saldo/inventario.
- Idempotencia por operación y por lote móvil para visitas, abonos, ventas y entregas.
- Precio de catálogo impuesto por el servidor; sólo Administración autoriza cambios/descuentos y el costo registrado funciona como piso absoluto.
- Candados transaccionales compartidos entre movimientos y corte de caja por cobrador/fecha, además de serialización del saldo por cliente.
- Devoluciones serializadas por venta y cliente; cada reembolso separa al autorizador del Administrador/Cobrador que entrega el dinero y respeta el orden único `jornada → venta → cliente`, compatible con abonos y cortes. Anulaciones marcan el abono condicionalmente después de releerlo bajo los candados compartidos.
- Cambio de cuenta móvil compensable: valida la vinculación antes de escribir y restaura tokens/identidad previos ante cualquier fallo.
- Restricciones de integridad en PostgreSQL para importes, saldos, existencias y cantidades.
- MFA TOTP con ventana limitada y protección contra reutilización para administradores.
- Cortes firmados con HMAC, fotografía de devoluciones validada por firma binaria y auditoría de reversas.
- Scripts de respaldo cifrado, verificación y restauración controlada: antes de `pg_restore --clean` consultan `current_database()` y exigen que el nombre conectado termine exactamente en `_restore_test`.

## Transporte

No se agrega un cifrado casero entre JavaScript y la API. En producción se exige HTTPS/TLS 1.2 o superior en el proxy (Caddy, Nginx, Cloudflare o balanceador administrado). TLS ya aporta confidencialidad, integridad y autenticación del servidor; cifrar otra vez en el cliente sin una administración de claves madura no mejora esa garantía.

## Antes de producción

1. Reemplace los secretos de `.env`; no reutilice los valores de ejemplo. El seed exige credenciales administrativas explícitas y aleatorias, no tiene fallback, fuerza el cambio en una cuenta recién creada y conserva la clave de una cuenta existente al repetirse.
2. Use un administrador de secretos y claves independientes `FIELD_ENCRYPTION_KEY`/`SEARCH_HMAC_KEY` con rotación documentada.
3. Complete el cambio obligatorio de la contraseña inicial y habilite el MFA ya incluido desde **Mi perfil**.
4. Termine TLS en un proxy, active HSTS y no publique PostgreSQL.
5. Limite la red de PostgreSQL a la API, use un usuario sin privilegios de superusuario y copias cifradas.
6. Habilite Redis para rate limiting compartido si hay varias réplicas.
7. Implemente MDM/bloqueo remoto para equipos de cobradores y evite dispositivos con root/jailbreak.
8. Ejecute análisis SAST, dependencias, pentest y restauración de respaldos antes de manejar datos reales.
9. Defina retención, avisos de privacidad y permisos conforme a la legislación aplicable.

## Modelo de amenazas resumido

**Activos:** dinero/saldos, inventario, PII, credenciales, evidencia, libros/auditoría y continuidad. **Límites de confianza:** navegador, teléfono/SQLCipher, Internet/TLS, Nginx, API, PostgreSQL y almacenamiento de backups.

Se contemplan robo de credenciales, CSRF, escalamiento de rol, acceso a cartera ajena, precios manipulados, carreras financieras, repetición/reordenamiento offline, extracción de una copia de DB, teléfono perdido y restauración destructiva. Los controles principales son MFA/Argon2/sesiones rotatorias, autorización por fila, precio/fecha/dinero autoritativos, candados/compensaciones, HMAC/recibos, AES-GCM/HMAC de búsqueda, proxy TLS y restauración con guardarraíl.

Riesgo aceptado: un teléfono completamente comprometido que conserva token y clave HMAC puede fabricar operaciones futuras dentro del permiso del cobrador; no puede reescribir historia ya anclada. Se contiene con MDM, revocación, límites, corte y conciliación. Rate limiting es por instancia hasta adoptar un almacén distribuido. La disponibilidad depende de un único PostgreSQL/host mientras no se implemente alta disponibilidad.

La respuesta a dispositivo, DB o filtración vive en `docs/runbooks/`; privacidad y retención en `docs/PRIVACIDAD_DATOS.md`. Cambiar rol, desactivar usuario o restablecer contraseña revoca refresh tokens; el access token puede vivir como máximo 15 minutos, riesgo residual que exige contención adicional en incidentes críticos.

## Estado de dependencias

El resultado vigente no se fija aquí porque cambia con cada instalación. CI debe adjuntar `npm audit --omit=dev` para backend/monorepo, Expo Doctor, análisis APK/AAB y escaneo de imagen. Las excepciones transitivas de Expo/Metro se registran en deuda técnica con versión, exposición y fecha de revisión; nunca se aplica automáticamente un downgrade mayor para silenciar el reporte.

El Dockerfile del backend hace una instalación de producción exclusiva de `@nexo/back` y la etapa final no copia el `node_modules` general de compilación. Una instalación aislada de sus 230 paquetes runtime reportó 0 vulnerabilidades y no contenía Expo, Metro ni Next. Antes de liberar se debe repetir `npm audit --omit=dev`, Expo Doctor, el análisis del APK/AAB y un escaneo de la imagen construida; los avisos móviles siguen siendo deuda de proveedor que debe revisarse cuando Expo publique una actualización compatible.

La cadena HMAC permite al servidor detectar edición, eliminación, reordenamiento o huecos en la historia que ya ancló. No convierte un teléfono comprometido en hardware confiable: quien controle una sesión válida y la clave del dispositivo podría fabricar operaciones futuras permitidas para ese cobrador. MFA, revocación de dispositivos, MDM, límites de negocio y auditoría siguen siendo capas necesarias.

“Seguridad militar” no es una certificación técnica. El proyecto usa controles sólidos por defecto, pero la seguridad final también depende de infraestructura, dispositivos, operaciones, monitoreo y auditoría externa.

## Matriz de roles

| Área                     | Administrador |            Contable |              Vendedor |       Almacenista |               Cobrador |
| ------------------------ | ------------: | ------------------: | --------------------: | ----------------: | ---------------------: |
| Usuarios y configuración |         Total |                   — |                     — |                 — |                      — |
| Clientes y cartera       |         Total |  Lectura/alta/abono |   Alta/tarjeta activa |                 — | Lectura/abono asignado |
| Ventas                   |         Total |        Lectura/alta | Alta/historial propio |                 — |    Historial necesario |
| Inventario y compras     |         Total | Lectura de catálogo |   Catálogo sin costos |             Total |       Datos de entrega |
| Pedidos                  |         Total |        Alta/lectura |          Alta/lectura | Surtido/recepción |           Alta/entrega |
| Rutas y jornada          |         Total |             Reporte |                     — |                 — |              Operación |
| Balances/exportaciones   |         Total |               Total |                     — |                 — |                      — |

Al iniciar sesión, Administración y Contabilidad llegan al resumen, Ventas entra a sus ventas, Almacén a Inventario y Cobranza a Rutas. En móvil todos pueden autenticarse, pero sólo aparecen y se abren los módulos de su puesto. El servidor vuelve a comprobar el permiso por acción: consultar catálogo no concede ajustar existencias, y consultar pedidos no concede surtirlos ni entregarlos.
