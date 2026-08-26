# Registro de decisiones arquitectónicas

Este documento conserva el **por qué** de la arquitectura de Nexo. No sustituye la documentación de uso: registra el contexto, los compromisos aceptados y la señal concreta que justificaría cambiar una decisión. Su objetivo es evitar refactorizaciones por preferencia personal que debiliten saldo, inventario, auditoría o trabajo offline.

## Cómo mantener este registro

- Una decisión aceptada no se reescribe para aparentar que siempre fue obvia. Si cambia, se agrega un ADR nuevo que la sustituya y se enlazan ambos.
- Cambios de límites entre módulos, fuente de verdad, persistencia, seguridad, sincronización o despliegue requieren actualizar o agregar un ADR en la misma entrega.
- Un ADR describe una decisión; una carencia pendiente pertenece al [registro de deuda técnica](DEUDA_TECNICA.md).
- Los estados permitidos son `PROPUESTA`, `ACEPTADA`, `SUSTITUIDA` y `RECHAZADA`.
- La fecha es la de adopción o formalización. “Revisar cuando” no es una fecha prometida: es un disparador observable.

## Índice

| ID      | Decisión                                                     | Estado   |
| ------- | ------------------------------------------------------------ | -------- |
| ADR-001 | Monolito modular en un monorepo                              | ACEPTADA |
| ADR-002 | PostgreSQL como fuente de verdad transaccional               | ACEPTADA |
| ADR-003 | Libros append-only y proyecciones de lectura                 | ACEPTADA |
| ADR-004 | Transacciones cortas y candados explícitos por agregado      | ACEPTADA |
| ADR-005 | El servidor decide precios, saldos y alcance                 | ACEPTADA |
| ADR-006 | RBAC más autorización por fila en la capa de aplicación      | ACEPTADA |
| ADR-007 | Outbox SQLCipher con cadena HMAC anclada en servidor         | ACEPTADA |
| ADR-008 | Fotografías históricas, bajas lógicas y movimientos inversos | ACEPTADA |
| ADR-009 | Un pedido no es venta hasta su entrega                       | ACEPTADA |
| ADR-010 | Web y móvil independientes con una API canónica              | ACEPTADA |
| ADR-011 | Imagen backend aislada del monorepo de compilación           | ACEPTADA |
| ADR-012 | Catálogo genérico para múltiples rubros                      | ACEPTADA |
| ADR-013 | Fotos de catálogo privadas y fuera de respuestas masivas     | ACEPTADA |
| ADR-014 | Lecturas operativas siempre frescas en Web                   | ACEPTADA |
| ADR-015 | Proyección local prioritaria durante trabajo móvil pendiente | ACEPTADA |

## ADR-001 — Monolito modular en un monorepo

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

Ventas, abonos, inventario, pedidos y devoluciones modifican varias tablas en una sola operación. El equipo necesita entregar web, API y móvil coordinados sin mantener contratos distribuidos ni infraestructura de mensajería desde el primer día.

### Decisión

Mantener `back`, `front` y `movil` en un monorepo. El backend es un monolito modular organizado por dominio; sus rutas HTTP son adaptadores delgados y los servicios de negocio controlan las transacciones. No se crean microservicios mientras una transacción PostgreSQL sea el límite correcto de consistencia.

### Motivo

Una sola unidad backend conserva atomicidad, reduce despliegues incompatibles y permite probar recorridos completos con PostgreSQL real. La modularidad se obtiene por límites de código y contratos internos, no por procesos de red prematuros.

### Consecuencias

El despliegue inicial es sencillo y los cambios cruzados son visibles. A cambio, una dependencia mal colocada puede acoplar módulos y el backend escala como una unidad.

### Invariantes

- Ninguna interfaz accede directamente a Prisma.
- Un módulo no modifica tablas financieras de otro saltándose su servicio de dominio.
- Separar un archivo por responsabilidad no significa crear un servicio desplegable.

### Revisar cuando

Dos equipos necesiten desplegar dominios con cadencias incompatibles, un dominio requiera escalar más de 10 veces que los demás o una frontera pueda operar con consistencia eventual explícitamente diseñada. El tamaño de un archivo por sí solo no justifica microservicios.

## ADR-002 — PostgreSQL como fuente de verdad transaccional

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

La operación requiere relaciones fuertes entre cliente, venta, cuota, abono, producto y movimiento, además de concurrencia segura, reportes y auditoría.

### Decisión

PostgreSQL es la fuente de verdad. Prisma administra el modelo y las migraciones; SQL específico de PostgreSQL se permite únicamente cuando expresa una garantía que el ORM no ofrece, como candados consultivos o restricciones de integridad.

### Motivo

ACID, claves foráneas, restricciones, índices y bloqueos encajan con un libro financiero e inventario. Introducir varias bases aumentaría reconciliaciones antes de existir una necesidad medible.

### Consecuencias

El producto depende conscientemente de PostgreSQL y algunas garantías no son portables a otra base. Las lecturas intensivas compiten inicialmente con la operación primaria.

### Invariantes

- Toda modificación de esquema se entrega como migración versionada.
- El cliente nunca es fuente final de saldo, existencia, precio o estado.
- Una migración aplicada no se edita; se corrige con otra migración.

### Revisar cuando

Los reportes afecten de forma demostrable la latencia operativa, la base supere la capacidad vertical acordada o exista obligación de residencia/aislamiento de datos. Antes de cambiar de motor se evalúan índices, réplicas de lectura, particionado y archivado.

## ADR-003 — Libros append-only y proyecciones de lectura

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

Consultar el saldo o existencia recalculando toda la historia en cada pantalla sería costoso, pero guardar únicamente el valor actual impediría explicar diferencias, anulaciones y fraude interno.

### Decisión

Conservar movimientos detallados como libro append-only y mantener proyecciones rápidas como `SaldoCliente` y `Producto.existencia`. Una operación actualiza libro y proyección dentro de la misma transacción.

### Motivo

El libro permite reconstrucción y auditoría; la proyección permite una experiencia rápida en web y móvil. Se obtiene trazabilidad sin obligar a implementar event sourcing completo.

### Consecuencias

Existe información derivada duplicada y debe poder reconciliarse. Los cambios retroactivos no editan el pasado: generan movimientos compensatorios.

### Invariantes

- No se actualiza una proyección financiera sin registrar el movimiento que la explica.
- Los importes históricos usan precisión decimal de base de datos.
- Una anulación referencia el movimiento original y conserva autor, fecha y motivo.

### Revisar cuando

La reconciliación periódica encuentre diferencias, el volumen haga lentas las consultas del libro o aparezca una obligación de contabilidad de doble partida. Las acciones correspondientes están registradas en `DT-003` y `DT-010`.

## ADR-004 — Transacciones cortas y candados explícitos por agregado

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

Dos ventas pueden competir por el mismo stock, varios abonos por el mismo saldo y un movimiento puede llegar mientras se firma el corte diario.

### Decisión

Usar transacciones `ReadCommitted` cortas, actualizaciones condicionales para inventario y candados consultivos transaccionales con claves estables para cliente, jornada y dispositivo. El cálculo protegido ocurre después de tomar el mismo candado que usan las mutaciones competidoras.

### Motivo

Los candados por agregado serializan sólo el recurso en conflicto y producen errores de negocio comprensibles. Elevar todo el sistema a aislamiento serializable aumentaría reintentos y no documentaría qué recurso se protege.

### Consecuencias

El orden de adquisición forma parte del diseño y una operación nueva puede crear una carrera si omite el candado correspondiente. Esta decisión es específica de PostgreSQL.

### Invariantes

- Saldo: bloquear cliente antes de leer/calcular/escribir.
- Devolución sin salida de dinero: bloquear venta y después cliente antes de sumar unidades devueltas o modificar saldo.
- Reembolso: validar la caja Administrador/Cobrador y bloquear en el orden global `jornada → venta → cliente`; el corte consulta esa caja, no al autorizador.
- Toda mutación que necesite jornada y cliente toma siempre jornada primero. Alterar ese orden puede producir un `40P01` entre Cobranza y Devoluciones.
- Anulación: bloquear jornada y cliente, releer el abono y marcarlo con `anuladoEn IS NULL` antes de aplicar efectos.
- Corte: bloquear operador y fecha antes de comprobar si la jornada cerró.
- Offline: bloquear usuario y dispositivo antes de leer o avanzar el ancla.
- Nunca realizar llamadas de red dentro de estas transacciones.

### Revisar cuando

Los tiempos de espera de bloqueo superen 500 ms en p95, aparezcan interbloqueos repetidos o una operación deba cruzar dos bases. En ese punto se modelan colas, particiones o sagas; no se eliminan candados sin una garantía sustituta.

## ADR-005 — El servidor decide precios, saldos y alcance

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

Web y móvil pueden ser modificados, quedar desactualizados o trabajar sin señal. Confiar en valores calculados por ellos permitiría vender a precios arbitrarios, exceder crédito o operar una cartera ajena.

### Decisión

Tratar todo cliente como no confiable. La API vuelve a resolver catálogo, costo, descuento permitido, existencia, saldo, límite, cuotas, estado del pedido y asignación de ruta dentro de la transacción.

### Motivo

La seguridad debe sobrevivir a una llamada HTTP fabricada manualmente. La interfaz optimiza la captura, pero no concede autoridad.

### Consecuencias

Una operación capturada offline puede ser rechazada al sincronizar porque el mundo cambió. La UI debe conservarla como evidencia y explicar la acción correctiva.

### Invariantes

- Sólo Administración autoriza precios distintos o descuentos.
- Ninguna venta queda debajo del costo registrado.
- `fueraDeRuta` se deriva en servidor.
- Los errores de negocio no avanzan saldo, stock ni cadena offline.

### Revisar cuando

Exista un motor formal de promociones o listas de precio. Se modelará como autorización versionada del servidor; nunca como confianza general en `precioUnitario` enviado por el cliente.

## ADR-006 — RBAC más autorización por fila en la capa de aplicación

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

Los roles indican qué acción puede ejecutar alguien, pero el cobrador necesita además límites sobre qué rutas y clientas puede ver. Prisma es actualmente el único acceso de la aplicación a PostgreSQL.

### Decisión

Combinar permisos RBAC con filtros y validaciones de alcance reutilizables en la API. Un cobrador sólo opera rutas activas cuyo `cobradorId` coincide y clientas de esas rutas. No se habilita todavía PostgreSQL Row-Level Security.

### Motivo

Centralizar el alcance en funciones tipadas mantiene respuestas y errores consistentes y se integra con Prisma sin duplicar políticas en dos lenguajes. Las pruebas con dos cobradores vigilan enumeración y mutación cruzadas.

### Consecuencias

Cada endpoint nuevo debe aplicar explícitamente el alcance correcto; una consulta directa olvidada es un riesgo. La base, usada fuera de la API, no impone por sí sola esa cartera.

### Invariantes

- Ocultar botones nunca sustituye el filtro de datos de la API.
- Las búsquedas extraordinarias no atraviesan carteras de cobradores.
- Un `404` evita confirmar la existencia de un expediente ajeno cuando sólo se consulta.

### Revisar cuando

Otra aplicación acceda a PostgreSQL, se habilite analítica directa, aparezcan múltiples empresas en una misma base o el número de puntos de acceso haga insuficiente la revisión. Entonces se evalúa RLS con contexto de sesión y pruebas de políticas; véase `DT-005`.

## ADR-007 — Outbox SQLCipher con cadena HMAC anclada en servidor

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

El cobrador debe registrar visitas, abonos, ventas y entregas en localidades sin conexión, sin duplicar efectos cuando una respuesta se pierde y detectando alteraciones a la cola local.

### Decisión

Guardar primero cada operación y su proyección en una transacción SQLCipher. Encadenarla con secuencia, hash anterior y HMAC-SHA-512 por dispositivo; firmar también el lote. PostgreSQL conserva el último hash/secuencia aceptado y aplica el lote completo en una transacción idempotente.

### Motivo

Outbox garantiza captura local antes de mostrar éxito. IDs estables resuelven reintentos; el ancla independiente del servidor detecta edición, eliminación, huecos y reordenamiento de historia ya aceptada.

### Consecuencias

Un lote puede requerir atención por cambios legítimos de stock o cartera. La migración de protocolo exige vaciar la cola anterior de forma controlada. HMAC no convierte un teléfono comprometido en hardware confiable: con sesión y clave activas podrían fabricarse operaciones futuras permitidas.

### Invariantes

- La clave HMAC no es la clave SQLCipher y ambas permanecen en SecureStore.
- La API exige todos los metadatos; no acepta hashes opcionales.
- La cadena sólo avanza si todas las reglas del lote se confirman.
- Revocar un dispositivo impide nuevos lotes, pero no borra recibos históricos.

### Revisar cuando

Se requiera sincronización automática en segundo plano, edición colaborativa desde varios dispositivos, más de 500 operaciones pendientes por lote o resistencia criptográfica ante un dispositivo comprometido. Eso exige protocolo versionado, attestation/hardware-backed keys o conciliación multiwriter; véase `DT-007`.

## ADR-008 — Fotografías históricas, bajas lógicas y movimientos inversos

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

Productos, precios, marcas y proveedores cambian, pero una venta pasada debe seguir explicando exactamente qué se entregó y a qué precio. Borrar pagos o ventas rompería auditoría y saldo.

### Decisión

Copiar nombre, SKU, marca, costo y precio al detalle confirmado. Dar de baja catálogos mediante estado activo/inactivo. Cancelaciones, devoluciones y anulaciones crean estados y movimientos inversos autorizados; no eliminan movimientos financieros.

### Motivo

Una referencia viva al catálogo no es una factura histórica. Las reversas explícitas permiten rastrear responsabilidad y reconstruir saldos.

### Consecuencias

Hay duplicación deliberada y los cambios de catálogo no corrigen documentos antiguos. El almacenamiento crece de forma continua y requerirá política de retención/archivo.

### Invariantes

- Un snapshot confirmado es inmutable.
- Una baja no rompe claves foráneas históricas.
- Toda reversa identifica origen, autorización, motivo y, cuando aplica, evidencia.
- Una devolución distingue `autorizadoPorId` de `usuarioOperadorId`: aprobar la reversa no significa haber entregado el dinero.

### Revisar cuando

La regulación defina retenciones distintas, se implemente facturación fiscal externa o el crecimiento del libro requiera particionado/archivo.

## ADR-009 — Un pedido no es venta hasta su entrega

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

Un pedido puede estar pendiente de compra, recibido o listo, pero todavía cancelarse o cambiar de proveedor. Aumentar deuda o descontar stock al prometerlo falsearía cartera e inventario físico.

### Decisión

Modelar el pedido como máquina de estados. Sólo `ENTREGADO` crea la venta, valida precio/stock, descuenta inventario y abre saldo/plan en una transacción. El proveedor se conoce al surtir y queda relacionado con el artículo recibido.

### Motivo

Separa intención comercial, abastecimiento y hecho financiero. La deuda representa mercancía efectivamente entregada.

### Consecuencias

El inventario disponible no reserva pedidos pendientes y dos promesas pueden competir por la misma existencia al entregar. La pantalla debe distinguir “pendiente”, “ya llegó” y “entregado”.

### Invariantes

- Un pedido sólo referencia productos registrados y activos al capturarse.
- Una transición inválida se rechaza en servidor.
- Entregar dos veces es idempotente o se rechaza sin duplicar venta.

### Revisar cuando

El negocio necesite reservas reales, anticipos sobre pedidos o compras bajo demanda con compromiso contractual. Esas capacidades requieren modelos explícitos de reserva/anticipo, no adelantar silenciosamente la venta.

## ADR-010 — Web y móvil independientes con una API canónica

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

La web cubre administración y operación amplia; el móvil prioriza campo y offline. Compartir componentes React entre Next y React Native agregaría abstracciones con poca reutilización visual real.

### Decisión

Mantener interfaces independientes y compartir semántica mediante la API, nombres de dominio y pruebas de contrato. La API es la autoridad; web y móvil pueden optimizar experiencias distintas sin redefinir reglas financieras.

### Motivo

Permite componentes compactos adaptados a cada plataforma y evita un “componente universal” lleno de condiciones. Los conceptos se mantienen alineados sin acoplar tecnologías de presentación.

### Consecuencias

Tipos y validaciones de transporte pueden duplicarse y desviarse si no se prueban. Una evolución incompatible exige versionar o coordinar clientes.

### Invariantes

- Los campos y estados de negocio conservan el mismo significado.
- Una regla crítica vive y se valida en backend aunque la UI también la anticipe.
- Cambios incompatibles no reutilizan silenciosamente el mismo contrato.

### Revisar cuando

La divergencia de esquemas produzca incidentes o el mantenimiento manual exceda el costo de generar un SDK/OpenAPI; véase `DT-006`.

## ADR-011 — Imagen backend aislada del monorepo de compilación

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

El lockfile del monorepo contiene Next, Expo, Metro y herramientas de prueba. Copiar todo `node_modules` al servidor amplía superficie de ataque y confunde auditorías runtime con herramientas de compilación móvil.

### Decisión

Compilar en una etapa completa, instalar aparte sólo dependencias de producción del workspace `@nexo/back` y copiar esa instalación a una imagen final sin privilegios. Expo, Metro y Next no forman parte del runtime API.

### Motivo

Las etapas múltiples conservan un lockfile coordinado sin transportar dependencias ajenas. La auditoría y el escaneo del contenedor reflejan lo que realmente ejecuta el servidor.

### Consecuencias

El Dockerfile es parte de la frontera de seguridad y un cambio inocente de `COPY` puede reintroducir paquetes. La compilación sigue necesitando el monorepo completo.

### Invariantes

- La etapa final no copia el `node_modules` general de compilación.
- La API corre como usuario `node`.
- Cada liberación escanea imagen final y dependencias móviles por separado.

### Revisar cuando

Se publique cada workspace como paquete independiente, se adopten imágenes distroless o una plataforma genere artefactos reproducibles equivalentes. La separación runtime no debe perderse.

## ADR-012 — Catálogo genérico para múltiples rubros

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-19

### Contexto

El primer negocio vende colchas, pero el producto debe servir a otros comercios con cobranza a crédito, inventario y entregas.

### Decisión

Modelar producto, marca, categoría, SKU, códigos, precios y existencia sin campos exclusivos de colchas. Las particularidades futuras se agregan como atributos/catálogos versionados cuando exista un caso real compartido, no como columnas improvisadas por cliente.

### Motivo

El núcleo común es venta, crédito, ruta, pedido e inventario. Mantenerlo neutral evita bifurcar el sistema por rubro y permite reportes homogéneos.

### Consecuencias

Un rubro especializado puede necesitar variantes, lotes, series, caducidad o unidades de medida aún no modeladas. Forzarlas hoy produciría complejidad sin evidencia.

### Invariantes

- Las ventas históricas conservan una descripción legible aun si cambia el catálogo.
- Un atributo especializado no altera reglas financieras generales.
- No se guarda lógica de presentación dentro del esquema de producto.

### Revisar cuando

Dos clientes reales requieran la misma extensión o una obligación regulatoria exija trazabilidad por lote/serie/caducidad. Entonces se diseña un módulo de variantes o trazabilidad con migración, no columnas libres sin contrato.

## ADR-013 — Fotos de catálogo privadas y fuera de respuestas masivas

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-20

### Contexto

El personal necesita reconocer mercancía visualmente al comprar, almacenar, pedir y vender. Las imágenes de cámara pueden ser grandes o contener contenido distinto al MIME declarado. Incluir bytes en listados o en el catálogo offline aumentaría memoria, latencia y tamaño de sincronización.

### Decisión

La web y el móvil reducen la imagen antes de enviarla. La API vuelve a validar tamaño, formato y firma binaria, elimina metadatos, normaliza a sRGB y genera WebP. Las fotos de producto se limitan a 1,280 px con objetivo de 240 KB; las evidencias, a 1,600 px con objetivo de 480 KB. El archivo se escribe atómicamente en almacenamiento privado y PostgreSQL conserva sólo ruta relativa, nombre, MIME, SHA-256, tamaño y dimensiones. Los listados sólo exponen `tieneFoto` y `fotoActualizadaEn`; el archivo se obtiene por un endpoint autenticado. La sincronización móvil nunca incluye el binario.

### Motivo

Separar archivo y metadatos evita inflar PostgreSQL, sus consultas y respaldos, mantiene el control por rol y conserva estable el contrato del catálogo. El almacenamiento local privado evita depender de un proveedor de objetos mientras el despliegue tenga una sola instancia de API.

### Consecuencias

La carpeta requiere volumen persistente, permisos restrictivos y respaldo coordinado con PostgreSQL. La compresión del cliente mejora experiencia pero no es un control de seguridad; el servidor conserva la decisión final. Varias réplicas de API requerirán almacenamiento compartido u objetos privados.

### Invariantes

- PostgreSQL nunca almacena el contenido binario; sólo rutas relativas y metadatos.
- Ningún listado, auditoría, respuesta de venta ni catálogo offline contiene archivos o base64.
- La API comprueba la firma real antes de persistir y nunca confía sólo en nombre/MIME.
- La foto requiere autenticación y usa caché `private`; su hash permite revalidar sin descargar.
- Las rutas absolutas y cualquier recorrido `..` se rechazan antes de leer o eliminar un archivo.
- Borrar o reemplazar una foto no altera detalles históricos de ventas.

### Revisar cuando

Se requieran varias réplicas de API, múltiples fotos/variantes por producto o caché offline visual. La alternativa a almacenamiento de objetos debe mantener autorización, hash, respaldo verificable y una migración sin cambiar identificadores.

## ADR-014 — Lecturas operativas siempre frescas en Web

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-20

### Contexto

Ventas, abonos, devoluciones, compras y sincronización móvil cambian saldo, caja, alertas e inventario. Una pantalla que consulta sólo al montarse o acepta respuestas fuera de orden puede mostrar una realidad anterior aunque PostgreSQL ya haya confirmado la operación.

### Decisión

Toda consulta Web usa `no-store`, encabezados `no-cache` y un identificador único en la URL. Para una misma consulta, una respuesta anterior nunca puede reemplazar a la solicitud más reciente. Toda mutación confirmada publica un evento de invalidación y la pantalla activa vuelve a consultar; además se actualiza al recuperar foco, reconectarse, volver a una pestaña visible y mediante un intervalo acotado.

### Motivo

El servidor y su libro contable son la fuente de verdad. La interfaz no intenta mantener una segunda contabilidad ni adivinar efectos relacionados; vuelve a leer el resultado confirmado y evita carreras de red.

### Consecuencias

Se realizan más lecturas y una mutación puede provocar dos consultas cercanas si el flujo también solicitaba actualización explícita. El coordinador serializa refrescos vivos y el backend debe conservar consultas paginadas e índices adecuados.

### Invariantes

- Ninguna respuesta autenticada operativa se comparte mediante caché HTTP.
- Una respuesta antigua no pisa información obtenida por una consulta posterior idéntica.
- Venta, abono, devolución, compra, pedido y cambios de catálogo invalidan automáticamente la vista activa.
- La actualización automática nunca repite una mutación.

### Revisar cuando

La carga de lecturas justifique eventos de servidor, WebSocket o invalidación selectiva por entidad. La sustitución debe conservar revalidación por foco/reconexión y una prueba de respuestas fuera de orden.

## ADR-015 — Proyección local prioritaria durante trabajo móvil pendiente

- **Estado:** ACEPTADA
- **Fecha:** 2026-08-20

### Contexto

En campo, una venta, entrega o abono debe reflejarse al instante aunque no exista señal. Cuando el teléfono vuelve a enfocar una pantalla puede recibir del servidor una versión anterior, porque su cola local aún no se ha sincronizado. Reemplazar la proyección local con esa respuesta haría reaparecer pedidos, stock o saldos incorrectos ante el cobrador.

### Decisión

La escritura offline y sus proyecciones de jornada/catálogo se guardan juntas en una transacción SQLCipher. Mientras exista trabajo pendiente, la copia local proyectada tiene prioridad visual. Al confirmarse toda la cola, un evento de sincronización vuelve a leer la fuente canónica. Las pantallas activas también actualizan al recuperar foco, al volver la app al primer plano y en un intervalo acotado. Las consultas móviles evitan caché y una respuesta vieja de una ruta idéntica no puede pisar otra más reciente.

Las altas y ediciones de producto, incluida su foto, permanecen en línea porque deben validar unicidad, precio y existencia directamente con el servidor. Cámara y galería producen un JPEG reducido; el backend sigue siendo quien valida y autoriza el archivo definitivo.

### Motivo

El servidor es la autoridad una vez que confirma movimientos; antes de eso, la bitácora cifrada del dispositivo es la única fuente que conoce el trabajo realizado en campo. Esta prioridad explícita evita saltos visuales y conserva la experiencia inmediata sin crear una segunda contabilidad.

### Consecuencias

Mientras existan movimientos pendientes, una pantalla puede mostrar una proyección local aunque el teléfono ya tenga red. La interfaz identifica los movimientos por confirmar y permite sincronizarlos. Tras sincronizar, se descarta esa prioridad y se vuelve a consultar PostgreSQL.

### Invariantes

- Encolar operación y guardar su proyección local ocurre en la misma transacción.
- Una lectura remota nunca borra una venta, entrega o abono aún no confirmado.
- Venta de contado no incrementa saldo; crédito incrementa sólo `total - anticipo`, redondeado a centavos.
- Un abono reduce saldo y una entrega a crédito crea deuda una sola vez.
- La sincronización idempotente es el único paso que permite reemplazar la proyección con el estado canónico.

### Revisar cuando

Se necesite edición colaborativa simultánea de una misma ruta en varios teléfonos. Entonces deberá incorporarse una estrategia explícita de merge por entidad y versión, conservando idempotencia, autorización por cartera y evidencia de conflictos.
