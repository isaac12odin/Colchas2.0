# API y reglas de negocio

Base local: `http://localhost:4000/api/v1`. Todas las respuestas de error usan `{ "error": { "codigo", "mensaje", "detalles" } }`.

El contrato consumible está en [`openapi.yaml`](../openapi.yaml) y la decisión de reintento/acción por código en [`ERRORES_API.md`](ERRORES_API.md). Si una ruta o `ErrorAplicacion` cambia, ambos deben actualizarse en la misma revisión.

## Endpoints principales

| Método y ruta                                      | Descripción                                  |
| -------------------------------------------------- | -------------------------------------------- |
| `POST /auth/iniciar-sesion`                        | Sesión web o móvil                           |
| `POST /auth/renovar`                               | Rotación de refresh token                    |
| `GET/POST/PATCH /clientes`                         | Expediente y tarjeta                         |
| `PATCH /clientes/:id/tarjeta`                      | Captura comercial de tarjeta con saldo       |
| `PATCH /clientes/:id/saldo`                        | Ajuste contable protegido y auditable        |
| `POST /usuarios/:id/restablecer-contrasena`        | Clave temporal y revocación de sesiones      |
| `GET/POST/PATCH /localidades`                      | Catálogo geográfico                          |
| `GET/POST/PATCH /rutas`                            | Planeación de rutas                          |
| `GET /rutas/:id/jornada`                           | Paquete offline de una jornada               |
| `GET /rutas/directorio-cobranza`                   | Directorio cifrable para operación offline   |
| `GET /rutas/:id/clientes-extraordinarios?buscar=`  | Búsqueda fuera de ruta por datos de clienta  |
| `GET/POST /ventas`                                 | Historial y venta transaccional              |
| `GET/POST /abonos`                                 | Historial y aplicación de pago               |
| `GET/POST /inventario/productos`                   | Catálogo de inventario                       |
| `GET /inventario/catalogos-producto`               | Marcas y categorías activas para captura     |
| `GET /inventario/productos/:id/foto`               | Foto autenticada con ETag y caché privada    |
| `DELETE /inventario/productos/:id`                 | Baja lógica segura del producto              |
| `POST /inventario/productos/:id/ajuste`            | Ajuste auditado                              |
| `GET/POST /compras`                                | Entradas por compra                          |
| `GET/POST /pedidos`                                | Pedidos; consulta opcional por `clienteId`   |
| `PATCH /pedidos/:id/estado`                        | Avance de almacén                            |
| `POST /pedidos/:id/entregar`                       | Convierte pedido en venta                    |
| `POST /sincronizacion/dispositivos/registrar`      | Enrola clave de integridad del equipo        |
| `GET /sincronizacion/dispositivos`                 | Equipos propios o consulta administrativa    |
| `PATCH /sincronizacion/dispositivos/:id/revocar`   | Revocación administrativa                    |
| `POST /sincronizacion/dispositivos/:id/reemplazar` | Reemplazo/transferencia con cadena nueva     |
| `GET /sincronizacion/revisiones`                   | Rechazos offline por resolver                |
| `PATCH /sincronizacion/revisiones/:id/resolver`    | Resolución/compensación auditada             |
| `POST /sincronizacion/lotes`                       | Carga operaciones offline                    |
| `GET /sincronizacion/catalogo`                     | Catálogo de venta móvil sin costos de compra |
| `GET /proveedores/opciones`                        | Selector mínimo `id`/`nombre`                |
| `GET /reconciliacion`                              | Comparación read-only libro/proyección       |
| `GET /reportes/resumen`                            | Mes, bimestre, semestre o año                |
| `GET /reportes/ventas.xlsx`                        | Excel con utilidad y fórmulas                |
| `GET /reportes/clientes.xlsx`                      | Excel de cartera                             |
| `GET /reportes/pedidos-pendientes.pdf`             | Lista de surtido                             |

## Ejemplo: venta a crédito

```json
{
  "clienteId": "uuid",
  "numeroTarjeta": "TARJETA-ASIGNADA-MANUALMENTE",
  "tipo": "CREDITO",
  "anticipo": 200,
  "metodoAnticipo": "EFECTIVO",
  "items": [{ "productoId": "uuid", "cantidad": 1 }],
  "plan": {
    "periodicidad": "SEMANAL",
    "montoCuota": 100,
    "primerVencimiento": "2026-08-24T12:00:00.000Z"
  }
}
```

Precios, total, costo y existencia se verifican en el servidor. Para roles operativos, el servidor ignora cualquier intento de sustituir el precio y exige el valor vigente del catálogo. Sólo `ADMINISTRADOR` puede autorizar un precio distinto o descuento; ni siquiera ese rol puede vender debajo del costo registrado. Si el crédito genera saldo y la clienta aún no tiene tarjeta, `numeroTarjeta` es obligatorio; nunca se genera automáticamente. La interfaz no es fuente de verdad.

La respuesta de una venta a crédito incluye `resumenSaldo` con `saldoAnterior`, `cargoVenta`, `anticipo` y `saldoNuevo`. Es un comprobante del resultado confirmado por PostgreSQL; la web no estima el saldo final como sustituto de esta respuesta.

## Correcciones protegidas

`PATCH /clientes/:id/saldo` sólo admite Administración y Contabilidad. Exige `saldoActualEsperado`, `nuevoSaldo`, un `motivo` descriptivo y la contraseña vigente del operador. El servidor bloquea al cliente, rechaza una pantalla desactualizada, crea `AJUSTE_CARGO` o `AJUSTE_ABONO` y guarda auditoría en la misma transacción; nunca edita ni elimina una venta o un abono histórico.

`POST /usuarios/:id/restablecer-contrasena` sólo admite Administración, exige la contraseña vigente de quien autoriza y una clave temporal fuerte. No permite usarlo sobre la cuenta propia: esa operación se realiza en Perfil. Al confirmar, revoca todas las sesiones de la cuenta objetivo, fuerza el cambio al siguiente acceso y audita la acción sin registrar ninguna contraseña.

## Fotografías de producto

`POST/PATCH /inventario/productos` admite `foto: { nombre, mime, base64 }` y `PATCH` admite `eliminarFoto: true`. JPEG, PNG y WebP se validan por firma binaria y tienen un máximo de 2.5 MB. El servidor elimina metadatos y guarda un WebP privado optimizado; PostgreSQL conserva sólo la ruta relativa y sus metadatos. Los listados sólo devuelven `tieneFoto` y `fotoActualizadaEn`; nunca incluyen bytes/base64. `GET /inventario/productos/:id/foto` exige sesión y permiso de catálogo, responde `ETag`, `Cache-Control: private` y acepta `If-None-Match`.

## Pedido accionable

`GET /pedidos?clienteId=<uuid>` devuelve únicamente los pedidos de esa clienta que el rol autenticado tiene permitido consultar. La interfaz de abono usa este filtro para mostrar pendientes sin confundirlos con deuda: un pedido no afecta saldo ni inventario hasta su entrega.

Para pasar de `PENDIENTE_PEDIR` a `PEDIDO_PROVEEDOR`, `PATCH /pedidos/:id/estado` exige un proveedor activo por cada artículo. El cambio bloquea lógicamente el pedido dentro de la transacción, por lo que dos operadores no pueden avanzarlo simultáneamente. Administración puede registrar desde el mismo formulario un producto completo —características, códigos, precios, existencia y fotografía— mediante el endpoint protegido de Inventario.

## Contrato offline

Un lote admite `VISITA`, `ABONO`, `VENTA` y `ENTREGA`. Antes de sincronizar, la app registra su `dispositivoId` y una clave HMAC aleatoria por HTTPS. Cada operación exige `idOperacion`, `secuencia`, `hashAnterior`, `creadoEn` y `hashIntegridad`; el lote exige además `huellaIntegridad`. Los hashes son HMAC-SHA-512 sobre una serialización canónica que incluye usuario, tipo, metadatos y datos.

El servidor bloquea el ancla de ese usuario/dispositivo, reconstruye operación y lote y exige continuidad exacta desde su última secuencia/hash aceptados. El procesamiento es ordenado e idempotente. Una operación válida genera recibo `CONFIRMADA`; una regla de negocio inválida se revierte en su propio `SAVEPOINT`, genera recibo terminal `RECHAZADA` con código/mensaje y la cadena continúa. Sólo errores técnicos inesperados revierten el lote completo. Un reintento idéntico devuelve los mismos recibos sin repetir saldo, stock, venta ni abono. El móvil envía como máximo 100 operaciones por lote hasta drenar la cola. El total, precio, existencia, límite de crédito, asignación de cartera y estado del pedido se validan de nuevo en PostgreSQL.

## Rutas multilocalidad y cobranza extraordinaria

Al crear una ruta, `localidadIds` acepta uno o varios UUID y `cobradorId` es opcional. Si se omite o se envía `null`, sólo Administración puede operar la ruta desde web; si se asigna un usuario activo con rol `COBRADOR`, la ruta también aparece en su móvil. Con `incluirClientesLocalidades: true`, el servidor asigna automáticamente las clientas activas de esas localidades y elimina duplicados.

El cobrador sólo puede consultar las rutas que tienen su `cobradorId` y las clientas de esas rutas activas; el filtro también protege expedientes, ventas, pedidos y abonos. En una jornada puede localizar, con al menos tres caracteres de nombre, teléfono, dirección, tarjeta o localidad, a una clienta de otra ruta que también tenga asignada. La operación `VISITA` no decide si es extraordinaria: el servidor valida ambos alcances, consulta `RutaCliente` y fija `fueraDeRuta`. También crea una auditoría sin teléfono, dirección ni tarjeta.

## Riesgo

La puntuación va de 0 a 100 y considera cuotas vencidas, máximo de días de mora, visitas sin pago de los últimos 90 días, porcentaje pagado y saldo poco amortizado. Rangos: bajo 0–24, medio 25–49, alto 50–74 y crítico 75–100. Cada cálculo crea una fotografía histórica; el modelo se puede recalibrar con datos reales sin reescribir ventas o abonos.
