# API y reglas de negocio

Base local: `http://localhost:4000/api/v1`. Todas las respuestas de error usan `{ "error": { "codigo", "mensaje", "detalles" } }`.

## Endpoints principales

| Método y ruta                                     | Descripción                                  |
| ------------------------------------------------- | -------------------------------------------- |
| `POST /auth/iniciar-sesion`                       | Sesión web o móvil                           |
| `POST /auth/renovar`                              | Rotación de refresh token                    |
| `GET/POST/PATCH /clientes`                        | Expediente y tarjeta                         |
| `PATCH /clientes/:id/tarjeta`                     | Captura comercial de tarjeta con saldo       |
| `GET/POST/PATCH /localidades`                     | Catálogo geográfico                          |
| `GET/POST/PATCH /rutas`                           | Planeación de rutas                          |
| `GET /rutas/:id/jornada`                          | Paquete offline de una jornada               |
| `GET /rutas/directorio-cobranza`                  | Directorio cifrable para operación offline   |
| `GET /rutas/:id/clientes-extraordinarios?buscar=` | Búsqueda fuera de ruta por datos de clienta  |
| `GET/POST /ventas`                                | Historial y venta transaccional              |
| `GET/POST /abonos`                                | Historial y aplicación de pago               |
| `GET/POST /inventario/productos`                  | Catálogo de inventario                       |
| `DELETE /inventario/productos/:id`                | Baja lógica segura del producto              |
| `POST /inventario/productos/:id/ajuste`           | Ajuste auditado                              |
| `GET/POST /compras`                               | Entradas por compra                          |
| `GET/POST /pedidos`                               | Pedidos de cliente                           |
| `PATCH /pedidos/:id/estado`                       | Avance de almacén                            |
| `POST /pedidos/:id/entregar`                      | Convierte pedido en venta                    |
| `POST /sincronizacion/dispositivos/registrar`     | Enrola clave de integridad del equipo        |
| `GET /sincronizacion/dispositivos`                | Equipos propios o consulta administrativa    |
| `PATCH /sincronizacion/dispositivos/:id/revocar`  | Revocación administrativa                    |
| `POST /sincronizacion/lotes`                      | Carga operaciones offline                    |
| `GET /sincronizacion/catalogo`                    | Catálogo de venta móvil sin costos de compra |
| `GET /reportes/resumen`                           | Mes, bimestre, semestre o año                |
| `GET /reportes/ventas.xlsx`                       | Excel con utilidad y fórmulas                |
| `GET /reportes/clientes.xlsx`                     | Excel de cartera                             |
| `GET /reportes/pedidos-pendientes.pdf`            | Lista de surtido                             |

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

## Contrato offline

Un lote admite `VISITA`, `ABONO`, `VENTA` y `ENTREGA`. Antes de sincronizar, la app registra su `dispositivoId` y una clave HMAC aleatoria por HTTPS. Cada operación exige `idOperacion`, `secuencia`, `hashAnterior`, `creadoEn` y `hashIntegridad`; el lote exige además `huellaIntegridad`. Los hashes son HMAC-SHA-512 sobre una serialización canónica que incluye usuario, tipo, metadatos y datos.

El servidor bloquea el ancla de ese usuario/dispositivo, reconstruye operación y lote y exige continuidad exacta desde su última secuencia/hash aceptados. El procesamiento es ordenado, atómico e idempotente: un error de negocio revierte todas las operaciones y no avanza el ancla; un reintento idéntico devuelve los recibos sin repetir saldo, stock, venta ni abono. El total, precio, existencia, límite de crédito, asignación de cartera y estado del pedido se validan de nuevo en PostgreSQL.

## Rutas multilocalidad y cobranza extraordinaria

Al crear una ruta, `localidadIds` acepta uno o varios UUID y `cobradorId` identifica obligatoriamente a un usuario activo con rol `COBRADOR`. Con `incluirClientesLocalidades: true`, el servidor asigna automáticamente las clientas activas de esas localidades y elimina duplicados.

El cobrador sólo puede consultar las rutas que tienen su `cobradorId` y las clientas de esas rutas activas; el filtro también protege expedientes, ventas, pedidos y abonos. En una jornada puede localizar, con al menos tres caracteres de nombre, teléfono, dirección, tarjeta o localidad, a una clienta de otra ruta que también tenga asignada. La operación `VISITA` no decide si es extraordinaria: el servidor valida ambos alcances, consulta `RutaCliente` y fija `fueraDeRuta`. También crea una auditoría sin teléfono, dirección ni tarjeta.

## Riesgo

La puntuación va de 0 a 100 y considera cuotas vencidas, máximo de días de mora, visitas sin pago de los últimos 90 días, porcentaje pagado y saldo poco amortizado. Rangos: bajo 0–24, medio 25–49, alto 50–74 y crítico 75–100. Cada cálculo crea una fotografía histórica; el modelo se puede recalibrar con datos reales sin reescribir ventas o abonos.
