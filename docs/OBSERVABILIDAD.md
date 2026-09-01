# Observabilidad y guardia

Este documento define el contrato operativo. Tener un endpoint de salud no equivale a tener monitoreo: producción debe conservar evidencia del proveedor, reglas activas y un simulacro.

## Señales

| Señal          | Fuente                   | Objetivo/alerta inicial                                             |
| -------------- | ------------------------ | ------------------------------------------------------------------- |
| Disponibilidad | `GET /salud` desde fuera | 2 fallos consecutivos de 1 minuto.                                  |
| Dependencias   | `GET /salud/listo`       | cualquier fallo por 2 minutos.                                      |
| HTTP 5xx       | logs JSON Nginx/API      | ≥5 en 5 minutos o >1% de tráfico.                                   |
| Latencia       | Nginx/API                | p95 >800 ms por 10 minutos.                                         |
| PostgreSQL     | exporter/host            | conexiones >80%, locks >60 s, base no disponible.                   |
| Host           | agente Hostinger         | disco >80%, memoria >85%, reinicios de contenedor.                  |
| Offline        | consulta operativa       | rechazadas/revisión >0 por 30 min; pendientes reportados sin bajar. |
| Reconciliación | exit code del timer      | código 2 o diferencias >0 alerta P1.                                |
| Respaldo       | archivo/copias externas  | último respaldo >26 h o copia externa fallida.                      |
| TLS            | monitor externo          | expiración <21 días o cadena inválida.                              |

## Logs y errores

- API emite JSON con Pino y valida o genera `X-Request-Id`; el mismo valor queda en `req.id` y vuelve en la respuesta. El agregador añade ambiente, versión/commit y host.
- Nginx debe propagar `X-Request-Id`; soporte correlaciona por ese ID, folio técnico y rango de tiempo, nunca por teléfono completo.
- No se capturan cuerpos, cookies, `Authorization`, contraseñas, claves, base64, dirección ni tokens.
- Backend, Next y Expo deben reportar excepciones a un proyecto por ambiente. Antes de activar un SDK, pruebe la función de sanitización y el muestreo con datos sintéticos.
- Retención inicial de logs: 30 días operativos y 90 días de seguridad, sujeta a revisión legal/costo.

## Tablero mínimo

Un tablero “Vektra Operación” muestra: tráfico/5xx/p95, salud DB, CPU/memoria/disco, conexiones PostgreSQL, contenedores reiniciados, última copia local/externa, resultado de reconciliación, operaciones offline confirmadas/rechazadas/requieren revisión y versión desplegada.

## Responsabilidad

La empresa debe completar antes del piloto:

- Responsable primario: **pendiente de nombrar**.
- Suplente: **pendiente de nombrar**.
- Canal de guardia: **pendiente de configurar**.
- Ventana y SLA: P0 inmediato, P1 30 minutos, P2 siguiente horario hábil.

Sin nombres y un canal probado, observabilidad permanece **no operativa** aunque el código esté preparado.

## Simulacro

Trimestralmente: provocar un 5xx sintético, detener la base de ensayo, simular disco al 81%, retrasar respaldo y ejecutar una reconciliación con proyección alterada en `_test`. Registrar hora de detección, notificación, diagnóstico, recuperación y acción de mejora. Nunca ensayar corrupción en producción.
