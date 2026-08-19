# Nexo Cobranza

Sistema modular para cobranza, ventas, rutas, pedidos e inventario. Está pensado para una persona que vende colchas, pero el catálogo usa productos, marcas y categorías genéricas para que funcione en cualquier rubro.

## Aplicaciones

- `back`: API Node.js + Express + TypeScript + Prisma + PostgreSQL.
- `front`: panel web Next.js + Tailwind, responsive, claro/oscuro y español/inglés.
- `movil`: app Expo/React Native, con jornada offline cifrada, cadena HMAC verificable e idempotencia.

## Inicio rápido

Requisitos: Node.js 22+, npm 10+ y PostgreSQL 16+ (o Docker). `pg_dump`, `pg_restore` y el servidor deben usar la misma versión mayor; los scripts lo comprueban automáticamente.

```bash
cp .env.example .env
cp .env.example back/.env
cp front/.env.example front/.env.local
cp movil/.env.example movil/.env
npm install
docker compose up -d postgres
npm run db:migrate
# Defina SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env antes de este paso.
npm run db:seed
npm run dev
```

Abra `http://localhost:3000`. La API responde en `http://localhost:4000/salud`.

Para iniciar la app móvil:

```bash
npm run dev:movil
```

En un teléfono real, cambie `EXPO_PUBLIC_API_URL` por la IP HTTPS o la IP local de la computadora; `localhost` en el teléfono apunta al propio teléfono. SQLCipher requiere un development build (`npx expo run:android` o `npx expo run:ios`), no Expo Go.

### Desarrollo local sin Docker en macOS

Si PostgreSQL 16 está instalado con Homebrew, puede usar la instancia aislada del proyecto en el puerto `55433`. Una base ya creada conserva su versión; para una instalación nueva puede definir `NEXO_PG_MAJOR=17` si tiene `postgresql@17`:

```bash
npm run db:start:local
npm run db:migrate
# Defina SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env antes de este paso.
npm run db:seed
npm run dev
```

Para detenerla use `npm run db:stop:local`. La carpeta `.postgres-data` y su socket permanecen fuera de Git.

## Primer acceso seguro

El proyecto no contiene correo ni contraseña predeterminados. Antes de ejecutar `npm run db:seed`, escriba en su `.env` un `SEED_ADMIN_EMAIL` explícito y un `SEED_ADMIN_PASSWORD` aleatorio de al menos 16 caracteres, con mayúscula, minúscula, número y símbolo. El seed se niega a continuar si faltan, son débiles o coinciden con credenciales de ejemplo conocidas.

El usuario resultante tiene rol `ADMINISTRADOR` y cambio obligatorio de contraseña. Ejecutar de nuevo el seed rota su hash usando los valores explícitos; nunca recupera una clave anterior ni inventa una de respaldo.

## Reglas principales

- Una venta confirmada y una compra se ejecutan dentro de transacciones de base de datos.
- La venta descuenta inventario; la compra lo aumenta.
- La tarjeta sólo existe mientras el cliente tenga saldo. El usuario escribe el número al abrir el primer crédito; el sistema nunca lo inventa y lo elimina al liquidar.
- Administración puede crear el rol `VENDEDOR`: captura clientes, pedidos, ventas y tarjetas con saldo, pero no ve costos ni opera almacén, rutas o usuarios.
- Toda ruta nueva exige un cobrador responsable. Las rutas heredadas sin asignación quedan fuera de Cobranza hasta que Administración las reasigne; el servidor limita al cobrador a sus rutas y clientas incluso si intenta consultar la API directamente.
- El plan de pago se construye a partir del monto fijo de cuota y su frecuencia. La última cuota absorbe cualquier diferencia.
- Un abono se aplica primero a las cuotas más antiguas, actualiza el saldo y recalcula el riesgo.
- Un pedido sólo puede incluir productos activos del catálogo. No afecta inventario ni saldo hasta que se entrega; la entrega crea la venta.
- Cada artículo entregado conserva el proveedor que lo surtió; una compra puede vincular su entrada con el pedido pendiente.
- Devoluciones y anulaciones generan movimientos inversos auditados: nunca borran ventas, abonos o existencias históricas.
- El expediente individual reúne saldo, calendario, ventas, abonos, pedidos, mora y riesgo.
- El corte de caja compara importes del sistema contra lo declarado y guarda firma y huella de integridad.
- Dar de baja un producto lo oculta de nuevas operaciones, pero las ventas conservan su nombre, SKU, marca, costo y precio históricos.
- Visitas, abonos, ventas y entregas se guardan primero en SQLCipher y se encadenan con HMAC-SHA-512. PostgreSQL verifica operación, lote, secuencia y continuidad desde el último hash aceptado para ese usuario y dispositivo.
- El precio de catálogo se resuelve en PostgreSQL. Sólo Administración puede autorizar un precio distinto o descuento, y ninguna venta puede quedar debajo del costo.
- El corte de caja y los movimientos del cobrador usan el mismo candado transaccional por usuario y fecha; un movimiento queda dentro del corte o es rechazado como jornada cerrada.
- Toda operación móvil tiene un identificador único y un recibo en PostgreSQL; reintentar no duplica pagos, ventas, entregas ni stock.

## Comandos

| Comando                                  | Uso                                                           |
| ---------------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                            | API y web en desarrollo                                       |
| `npm run dev:movil`                      | Servidor de Expo                                              |
| `npm run build`                          | Compila API y web                                             |
| `npm run typecheck`                      | Revisa TypeScript en las tres apps                            |
| `npm test`                               | Pruebas unitarias de backend y móvil                          |
| `npm run test:robustas`                  | Suite API/DB con datos temporales automáticos                 |
| `npm run test:web`                       | Interfaz real en Chromium escritorio/móvil                    |
| `npm run validar:todo`                   | Tipos, 124 pruebas y compilación                              |
| `npm run db:migrate`                     | Crea/aplica migraciones de desarrollo                         |
| `npm run db:seed`                        | Crea el administrador inicial                                 |
| `npm run datos:demo`                     | Genera una empresa demo completa                              |
| `npm run datos:demo:limpiar`             | Elimina únicamente los datos demo                             |
| `npm run db:studio`                      | Abre Prisma Studio                                            |
| `npm run backup`                         | Crea un respaldo PostgreSQL cifrado                           |
| `npm run backup:verify -- archivo`       | Verifica que el respaldo sea legible                          |
| `npm run backup:restore-test -- archivo` | Restaura sólo si la base conectada termina en `_restore_test` |

La suite robusta crea y migra automáticamente una base hermana terminada en `_test`; nunca ejecuta los escenarios destructivos sobre `nexo_cobranza`. La prueba SQLCipher nativa y sus comandos están documentados en [Pruebas automatizadas y datos demo](docs/PRUEBAS.md).

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md)
- [Decisiones arquitectónicas y sus motivos](docs/DECISIONES_ARQUITECTURA.md)
- [Deuda técnica, riesgos y criterios de salida](docs/DEUDA_TECNICA.md)
- [Guía para desarrollar sin crear monolitos](docs/GUIA_DESARROLLO.md)
- [Seguridad](docs/SEGURIDAD.md)
- [API y reglas](docs/API.md)
- [Operación y capacitación](docs/OPERACION.md)
- [Producción, respaldos y monitoreo](docs/PRODUCCION.md)
- [Pruebas automatizadas y datos demo](docs/PRUEBAS.md)
- [English guide](docs/README.en.md)
