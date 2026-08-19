# Operación y capacitación

## Rutina diaria recomendada

1. Administración revisa el resumen y productos bajo mínimo.
2. Almacén registra compras y avanza pedidos al recibirlos.
3. El cobrador abre cada ruta con internet antes de salir; la jornada queda cifrada en el equipo.
4. Durante la visita usa las acciones directas: **Abonar**, **Nueva venta**, **Entregar**, **No pagó** o **Ausente**. No necesita señal.
   - Si atiende a una clienta de otra ruta que también tiene asignada, usa **Cobrar clienta fuera de ruta** y busca por nombre, teléfono, dirección, tarjeta o localidad. La visita se identifica como extraordinaria; no cambia su ruta permanente. No puede consultar carteras de otros cobradores.
5. Cada confirmación entrega un folio local y actualiza la vista del saldo/stock en el equipo. El servidor será la confirmación final.
6. Al terminar, abre **Sincronización** con una conexión estable. Los éxitos cambian a **Confirmada** y permanecen como bitácora; los errores muestran el motivo y se pueden reintentar.
7. Antes del corte, el cobrador sincroniza todos los pendientes. Una jornada firmada queda bloqueada para abonos, ventas, entregas o devoluciones tardías de esa fecha.
8. Contabilidad revisa abonos, cartera, diferencias y exportaciones.

El rol **Vendedor** puede registrar clientes, pedidos y ventas desde la web. Cuando una venta a crédito deja saldo, captura el número de tarjeta asignado por la empresa; también puede corregirlo posteriormente desde **Clientes** mientras el saldo siga pendiente. No necesita intervención del administrador y nunca recibe costos de compra.

## Entrega de pedido

El pedido se captura eligiendo productos activos del catálogo; nombre y precio se toman automáticamente y no existe captura libre. Almacén lo marca como recibido/listo. En la visita, el cobrador confirma la entrega y define contado o crédito. En ese momento se comprueba el stock, se genera la venta, se descuenta el artículo y se crea el saldo/plan. Si el crédito deja saldo y la clienta aún no tiene tarjeta, el cobrador escribe el número asignado. Si el stock ya cambió, la transacción se rechaza completa.

## Recuperación en campo

- Si desaparece la señal, continúe: las operaciones se guardan cifradas antes de mostrar éxito.
- Si la app se cierra, abra de nuevo **Sincronización**; los registros en `ENVIANDO` vuelven a ser candidatos sin duplicarse.
- Si aparece **Atención**, lea el motivo (por ejemplo, stock insuficiente) y resuelva el dato de negocio. No borre ni reinstale la app.
- Si falla la revisión de integridad, detenga la captura y contacte al administrador. No intente “limpiar” la base local.
- Al cerrar sesión con movimientos pendientes, éstos permanecen aislados para ese mismo usuario en el dispositivo.
- La búsqueda extraordinaria funciona sin señal con el directorio descargado y cifrado. Permite localizar por nombre, teléfono, dirección, tarjeta o localidad y sólo incluye clientas con saldo o entrega activa dentro de rutas asignadas al mismo cobrador. Si una clienta nunca se descargó, haga la primera búsqueda con conexión.

## Planeación de rutas

Administración puede crear o reconfigurar una ruta con una o varias localidades y debe seleccionar su cobrador responsable desde **Rutas**. Al guardar, se sincronizan automáticamente las clientas activas de las localidades seleccionadas. Una cobranza fuera de ruta no reasigna a la clienta: la asignación permanente requiere una modificación administrativa explícita.

Para registrar una localidad nueva, Administración entra a **Clientes → Localidad**. También puede usar **+ Crear localidad** dentro de **Nuevo cliente**; al guardarla queda seleccionada automáticamente y puede continuar el alta sin perder los datos capturados. Contabilidad puede registrar clientes usando las localidades previamente configuradas, pero no modifica esta configuración operativa.

## Catálogo e historial

Administración o Almacén puede dar de baja un producto que ya no se venderá. La baja es lógica: desaparece de inventario, ventas y pedidos nuevos, pero nunca borra ventas realizadas. Cada detalle conserva el nombre, SKU, marca, costo y precio que tenía al confirmar la venta, además del plan y sus abonos.

## Alta de programadores

1. Lea `ARQUITECTURA.md` y el esquema `back/prisma/schema.prisma`.
2. Configure `.env`, ejecute migraciones/seed y pruebe `/salud`.
3. Siga un caso completo: producto → compra → venta → cuota → abono.
4. Mantenga controladores delgados; reglas con varias tablas deben vivir en servicios transaccionales.
5. Nunca descifre PII para logs ni agregue tokens a almacenamiento web accesible por JavaScript.
6. Toda nueva mutación necesita: Zod, rol, transacción cuando aplique, auditoría/idempotencia y prueba.
7. Antes de entregar: `npm run typecheck`, `npm test` y `npm run build`.

## Respaldo

Haga copias automáticas diarias de PostgreSQL, cifradas y fuera del servidor. Conserve al menos una copia mensual y pruebe restauración trimestral. Una copia que nunca fue restaurada no cuenta como respaldo verificado.
