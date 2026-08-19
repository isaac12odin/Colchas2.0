# Pruebas automatizadas y datos de demostración

## Niveles de validación

### Pruebas rápidas

```bash
npm test
```

Ejecutan reglas puras, permisos, cifrado, paginación, cálculo de ventas, tarjetas, rutas e integridad de sincronización. No crean datos en PostgreSQL.

Actualmente son **52 pruebas unitarias** entre backend y móvil y tardan sólo unos segundos. Incluyen regresiones para el proxy `/salud`, credenciales seed sin fallback, despliegue backend sin dependencias móviles, cadena HMAC obligatoria, sesión móvil con rollback, operador de reembolso obligatorio, selección coherente de herramientas PostgreSQL, nombre real de la base de restauración y estructura mínima de decisiones/deuda arquitectónica.

### Suite robusta con PostgreSQL real

```bash
npm run test:robustas
```

La suite contiene **66 pruebas E2E con PostgreSQL real**. Genera usuarios, localidades, clientes, productos, saldos, rutas, pedidos, compras, ventas, cuotas, abonos, devoluciones, cortes y archivos Excel únicos. Cada escenario usa UUID propios y elimina exclusivamente esos registros desde un bloque `finally`, aun cuando una aserción falle.

Antes de ejecutar, el comando deriva de `DATABASE_URL` una base hermana terminada en `_test`, la crea si hace falta y aplica las migraciones. Por ejemplo, `nexo_cobranza` se prueba exclusivamente sobre `nexo_cobranza_test`. Puede indicar otra con `E2E_DATABASE_URL`, pero el proceso se detiene si su nombre no termina exactamente en `_test`.

Escenarios incluidos:

1. Seguridad de sesión: tokens manipulados, contraseña temporal, MFA y no reutilización de códigos, bloqueo por intentos, máximo de sesiones, CSRF web, rotación y cierre móvil.
2. Matriz negativa de permisos HTTP para administrador, contable, almacenista, vendedor y dos cobradores; prueba que uno no puede enumerar rutas, clientas, expedientes, abonos, ventas ni pedidos del otro.
3. Ventas adversariales: stock insuficiente, sobreventa concurrente, límite de crédito, líneas duplicadas, tarjeta y calendario obligatorios, precio de $0.01, descuentos sin autorización, piso de costo, rollback y snapshots históricos.
4. Crédito con tarjeta manual, calendario, inventario, abono móvil idempotente, sobreabono, liquidación, anulación y expediente completo.
5. Pedido, proveedor, compra, entrada, entrega, devolución parcial/total/cambio con evidencia, 12 carreras repetidas de devolución, separación entre autorizador y caja del reembolso, carrera reembolso/corte, 12 carreras reembolso/abono sin deadlock, corte firmado, movimiento concurrente contra corte y bloqueo de movimientos tardíos.
6. Abonos y anulaciones, incluidas 12 carreras repetidas sobre el mismo abono que sólo pueden producir una reversa de saldo.
7. Cobranza offline dentro de la cartera asignada, reintento sin duplicados, continuidad anclada y rechazo de operación/lote HMAC alterados.
8. Rutas de múltiples localidades, cliente extraordinario, alertas empresariales, paginación y auditoría de catálogos.
9. Reportes históricos, Excel con fórmulas y protección de datos, PDF de pendientes e importación Excel con rollback transaccional.
10. Endpoints públicos `/salud` y `/salud/listo`, incluida la conexión real a la base exclusiva de pruebas.

### Interfaz web real

```bash
npm run test:web
```

Ejecuta **6 pruebas Playwright en Chromium**, con escritorio y viewport móvil: error de acceso, inicio de sesión, tablero, navegación administrativa, redirección por rol, opciones ocultas, idioma, tema y diseño responsivo. La API se intercepta deliberadamente en esta capa; la autenticación y autorización reales ya se validan contra Express/PostgreSQL en la suite robusta.

En total, `npm run validar:todo` ejecuta **124 pruebas automatizadas** antes de compilar producción.

Por seguridad, el comando sólo acepta PostgreSQL en `localhost`, `127.0.0.1` o `::1`, exige el sufijo `_test` y se niega a correr con `NODE_ENV=production`. Para una base remota desechable debe confirmarse conscientemente:

```bash
E2E_ALLOW_REMOTE_DATABASE=SI npm run test:robustas
```

Nunca use esa excepción contra producción.

### Validación completa antes de entregar una versión

Con PostgreSQL local iniciado:

```bash
npm run validar:todo
```

Ejecuta tipos de las tres aplicaciones, pruebas rápidas, suite PostgreSQL, interfaz web real y compilación de producción.

### SQLCipher en un simulador o teléfono real

La prueba nativa no usa un mock de SQLite. El perfil `integration` instala un bundle separado `com.nexo.cobranza.e2e`, comprueba `PRAGMA cipher_version`, `integrity_check`, `cipher_integrity_check`, intenta abrir el archivo con una clave incorrecta y valida que la bitácora sobreviva al cierre y reapertura de la base.

```bash
cd movil
EXPO_PUBLIC_E2E_SQLCIPHER=SI \
EXPO_PUBLIC_API_URL=https://e2e.invalid/api/v1 \
npx expo run:ios --configuration Release
npm run test:sqlcipher
```

También puede generar el binario aislado con `npm run build:sqlcipher:ios` o `npm run build:sqlcipher:android`. Requiere Maestro y un simulador/dispositivo activo. El 19 de agosto de 2026 se ejecutó satisfactoriamente en iPhone 16 Pro con iOS 18.5 y SQLCipher 4.7.0 Community.

## Datos visibles para recorrer la aplicación

Para crear una empresa demo con cinco usuarios, ocho clientes, seis productos, rutas, créditos, cuotas vencidas, abonos, pedidos, proveedor y compra:

```bash
npm run datos:demo
```

Usuarios generados:

| Rol           | Correo                     |
| ------------- | -------------------------- |
| Administrador | `admin.demo@nexo.local`    |
| Contable      | `contable.demo@nexo.local` |
| Vendedor      | `vendedor.demo@nexo.local` |
| Almacenista   | `almacen.demo@nexo.local`  |
| Cobrador      | `cobrador.demo@nexo.local` |

La contraseña local predeterminada es `DemoNexo2026!`. Puede reemplazarse sin editar código:

```bash
DEMO_PASSWORD='UnaClaveLocalDistinta' npm run datos:demo
```

El generador reemplaza solamente su conjunto demo anterior. No elimina registros reales. Para retirar todos los datos demo:

```bash
npm run datos:demo:limpiar
```

## Solución de problemas

- `P1000`: el usuario o contraseña de PostgreSQL en `DATABASE_URL` no coincide.
- `P1001`: PostgreSQL no está iniciado o el puerto es incorrecto.
- `E2E_CONFIRM_DATABASE`: ejecute desde la raíz con `npm run test:robustas`; no invoque Vitest directamente.
- `La suite E2E exige una base terminada en _test`: corrija `E2E_DATABASE_URL`; nunca cambie la protección para apuntar a la base operativa.
- Playwright sin navegador: ejecute `npx playwright install chromium` una vez.
- Maestro no encuentra la app: instale primero el perfil `integration`, arranque el simulador y confirme que el bundle sea `com.nexo.cobranza.e2e`.
- `CORTE_CERRADO`: la suite crea un usuario nuevo por escenario, por lo que este error normalmente indica datos viejos de una ejecución interrumpida. Vuelva a correrla; los identificadores son únicos y no chocan con la siguiente ejecución.
