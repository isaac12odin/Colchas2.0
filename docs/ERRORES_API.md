# Catálogo de errores de API

Formato único:

```json
{ "error": { "codigo": "ABONO_EXCEDENTE", "mensaje": "...", "detalles": {} } }
```

El cliente decide por `codigo`, nunca compara el texto. `detalles` sólo sirve para validación y no contiene secretos/PII. Un 5xx se reintenta con espera; un 4xx requiere la acción indicada salvo 409 técnico explícitamente reintentable.

## Sesión y autorización

| Código                                      |    HTTP | Reintentar           | Acción del cliente/operador                        |
| ------------------------------------------- | ------: | -------------------- | -------------------------------------------------- |
| `NO_AUTENTICADO`, `SESION_EXPIRADA`         |     401 | Una renovación       | Renovar una vez; si falla, iniciar sesión          |
| `REFRESCO_INVALIDO`, `REFRESCO_REUTILIZADO` |     401 | No                   | Limpiar sesión e iniciar de nuevo                  |
| `CSRF_INVALIDO`                             |     403 | Tras recargar sesión | Obtener cookie/CSRF actual; no repetir token viejo |
| `SIN_PERMISO`                               |     403 | No                   | Ocultar acción y escalar permisos, no forzar API   |
| `CLIENTE_NO_ASIGNADO`, `RUTA_NO_ASIGNADA`   |     403 | No                   | Administración revisa alcance/ruta                 |
| `CAMBIO_CONTRASENA_REQUERIDO`               |     428 | No                   | Llevar a Perfil y cambiar clave                    |
| `CUENTA_BLOQUEADA`                          |     423 | Después del plazo    | Esperar o escalar a Administración                 |
| `MFA_INVALIDO`, `MFA_REUTILIZADO`           | 401/422 | Con código nuevo     | Esperar TOTP nuevo y revisar hora                  |
| `ULTIMO_ADMINISTRADOR`                      |     422 | No                   | Crear/activar otro administrador antes             |

## Dinero, jornada y concurrencia

| Código                                                          |    HTTP | Reintentar          | Acción                                         |
| --------------------------------------------------------------- | ------: | ------------------- | ---------------------------------------------- |
| `ABONO_EXCEDENTE`                                               |     422 | No, mismo dato      | Consultar saldo y capturar importe correcto    |
| `SALDO_CAMBIO_CONCURRENTE`                                      |     409 | Sí, tras refrescar  | Recargar expediente y volver a decidir         |
| `JORNADA_CERRADA`, `CORTE_CERRADO`, `CORTE_YA_CERRADO`          | 409/422 | No                  | Conciliar con Contabilidad                     |
| `OPERACION_CONCURRENTE`                                         |     409 | Sí                  | Espera breve, refresca y reintenta idempotente |
| `ANTICIPO_INVALIDO`, `DESCUENTO_INVALIDO`, `LIMITE_CREDITO`     |     422 | No                  | Corregir plan/importe o solicitar autorización |
| `PRECIO_NO_AUTORIZADO`, `PRECIO_BAJO_COSTO`, `VENTA_BAJO_COSTO` | 403/422 | No                  | Usar precio vigente o autorización permitida   |
| `VENCIMIENTO_ANTERIOR_OPERACION`                                |     422 | No                  | Elegir fecha igual/posterior a operación       |
| `RELOJ_ADELANTADO`                                              |     422 | Tras corregir reloj | Activar hora automática                        |
| `OPERACION_DEMASIADO_ANTIGUA`                                   |     422 | No automático       | Conciliación administrativa                    |

## Inventario, pedidos y devoluciones

| Código                                                             |    HTTP | Reintentar     | Acción                                            |
| ------------------------------------------------------------------ | ------: | -------------- | ------------------------------------------------- |
| `STOCK_INSUFICIENTE`, `STOCK_NEGATIVO`                             | 422/409 | Tras conciliar | Revisar existencia/compra/pedido                  |
| `PRODUCTO_INVALIDO`, `PRODUCTO_NO_ENCONTRADO`, `PRODUCTO_FALTANTE` | 404/422 | No             | Seleccionar/crear producto activo permitido       |
| `PEDIDO_NO_LISTO`, `TRANSICION_INVALIDA`, `USE_ENTREGA`            |     422 | No             | Seguir máquina de estados/acción Entregar         |
| `PROVEEDOR_REQUERIDO`, `PROVEEDOR_INVALIDO`                        |     422 | No             | Administración/Contabilidad/Almacén asigna activo |
| `CANTIDAD_EXCEDENTE`, `VENTA_NO_DEVOLVIBLE`                        |     422 | No             | Revisar cantidades ya devueltas/estado de venta   |
| `REEMBOLSO_INCONSISTENTE`, `METODO_REEMBOLSO_REQUERIDO`            |     422 | No             | Revisar saldo, método y operador de caja          |

## Sincronización offline

| Código                                                                           | HTTP | Tipo             | Acción                                                               |
| -------------------------------------------------------------------------------- | ---: | ---------------- | -------------------------------------------------------------------- |
| Regla de negocio como `ABONO_EXCEDENTE`/`STOCK_INSUFICIENTE` dentro de resultado |  201 | Rechazo terminal | Mostrar `RECHAZADA`, conciliar y continuar                           |
| `HUELLA_LOTE_INVALIDA`, `OPERACION_OFFLINE_MANIPULADA`                           |  409 | Integridad       | Detener equipo y seguir runbook                                      |
| `CADENA_OFFLINE_DISCONTINUA`                                                     |  409 | Integridad/ancla | No borrar cola; comparar recibos/ancla                               |
| `OPERACION_NO_COINCIDE`, `ID_OPERACION_REUTILIZADO`                              |  409 | Idempotencia     | No generar contenido distinto con mismo ID                           |
| `LOTE_REUTILIZADO`, `LOTE_NO_COINCIDE`, `LOTE_PARCIAL_REUTILIZADO`               |  409 | Idempotencia     | Reenviar el prefijo idéntico con ID de lote nuevo cuando corresponda |
| `DISPOSITIVO_NO_AUTORIZADO`, `DISPOSITIVO_REVOCADO`                              |  403 | Seguridad        | Administración registra/revisa/reemplaza equipo                      |
| `CLAVE_DISPOSITIVO_NO_COINCIDE`                                                  |  409 | Seguridad        | No sobrescribir; investigar cambio de identidad                      |

## Validación, importación y genéricos

| Código                                                     |    HTTP | Acción                                                          |
| ---------------------------------------------------------- | ------: | --------------------------------------------------------------- |
| `DATOS_INVALIDOS`                                          |     422 | Marcar campos desde `detalles.fieldErrors`                      |
| `REGISTRO_DUPLICADO`                                       |     409 | Consultar existente; no repetir a ciegas                        |
| `NO_ENCONTRADO`, `RUTA_NO_ENCONTRADA`                      |     404 | Volver al listado/refrescar                                     |
| `ARCHIVO_GRANDE`, `EXCEL_INVALIDO`, `IMPORTACION_INVALIDA` | 413/422 | Corregir plantilla/archivo; la importación se revierte completa |
| `LIMITE_SOLICITUDES`, `DEMASIADOS_INTENTOS`                |     429 | Espera indicada; no bucle inmediato                             |
| `HTTPS_REQUERIDO`                                          |     426 | Usar URL HTTPS configurada                                      |
| `ERROR_INTERNO`                                            |     500 | Reintento acotado y correlación; escalar si persiste            |

Otros códigos específicos conservan la misma regla: 401 autenticar, 403 no autorizado, 404 dato ausente, 409 refrescar/conciliar, 422 corregir decisión, 429 esperar y 5xx reintento técnico. Toda alta de `ErrorAplicacion` debe actualizar este catálogo u OpenAPI y añadir una prueba del comportamiento del cliente.
