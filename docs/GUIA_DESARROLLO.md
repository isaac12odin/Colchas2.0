# Guía rápida para desarrollar sin crear monolitos

## Dónde colocar un cambio

1. Si cambia una fórmula, validación o proyección, va en `dominio*.ts` o en un servicio puro y lleva prueba.
2. Si coordina red, estado y mensajes, va en un hook `usar*.ts` o en un servicio de aplicación.
3. Si sólo presenta y recibe eventos, va en un componente pequeño.
4. Si escribe datos locales, va en un repositorio; si abre/cifra la base, va en infraestructura.
5. Si afecta varias tablas financieras, el backend lo ejecuta dentro de una transacción corta y usa el candado/invariante definido en `ADR-004`; no se cambia el aislamiento por intuición.

## Revisión obligatoria

- ¿La página sólo compone y navega?
- ¿Los permisos se verifican en API aunque también ocultemos botones?
- ¿La operación móvil conserva `idOperacion`, secuencia y huella al reintentar?
- ¿Inventario, venta, saldo y bitácoras cambian atómicamente?
- ¿El servidor recalcula precios, saldos y cuotas en vez de confiar en el cliente?
- ¿El formulario funciona con teclado, móvil, modo oscuro y objetivos táctiles amplios?
- ¿La operación frecuente se completa en tres etapas o menos y confirma su efecto real (saldo, stock o estado)?
- ¿La página compone componentes pequeños y deja coordinación/estado en un hook `usar*.ts`?
- ¿El cambio añade datos sensibles a logs, caché, respuestas o reportes?
- ¿Existe una prueba de la regla crítica o de la regresión?
- ¿El cambio contradice un ADR o cumple el disparador que obliga a sustituirlo?
- ¿Agrega un compromiso temporal que debe registrarse como deuda técnica?

## Cambios arquitectónicos y deuda

Antes de modificar límites de módulos, fuente de verdad, persistencia, protocolo offline, autorización o despliegue:

1. Lea [Decisiones arquitectónicas](DECISIONES_ARQUITECTURA.md) y localice el ADR afectado.
2. Si la decisión sigue vigente, preserve sus invariantes y enlace el ADR en la descripción del cambio.
3. Si ya se cumplió “Revisar cuando”, agregue un ADR nuevo. Marque el anterior como `SUSTITUIDA`; no lo borre ni reescriba.
4. Si se acepta una solución limitada para avanzar, regístrela en [Deuda técnica](DEUDA_TECNICA.md) con riesgo, contención, disparador y criterio de salida.
5. Una deuda P0 bloquea la entrega. Una P1 necesita responsable y hito antes de producción. P2/P3 se priorizan por su disparador, no por gusto técnico.
6. Al cerrar una deuda, adjunte evidencia reproducible y actualice cualquier ADR que dependiera de ella.

Una refactorización que sólo cambia patrones o tecnología, sin mejorar una métrica, eliminar una deuda registrada o cumplir un disparador de ADR, no tiene justificación arquitectónica suficiente.

## Flujo para una nueva operación offline

1. Crear su tipo y esquema en móvil y servidor.
2. Construir el registro una sola vez con ID estable.
3. Encolarlo y proyectar la UI en una misma transacción SQLCipher.
4. Validar la cadena antes del envío.
5. Guardar un recibo idempotente en PostgreSQL antes de responder.
6. Aceptar reintentos sólo si usuario, dispositivo y contenido coinciden.
7. Marcar sincronizada; nunca borrar la evidencia local durante el flujo normal.

## Seguridad de secretos

No guardar contraseñas, JWT, claves SQLCipher o datos de tarjeta en código, AsyncStorage, logs o variables `NEXT_PUBLIC_*`. Las contraseñas creadas o restablecidas por Administración son temporales: el middleware sólo permite consultar la sesión y sustituir la clave hasta completar el cambio obligatorio. En producción, los secretos se inyectan desde el gestor del entorno y la API sólo se publica detrás de HTTPS.
