## Objetivo

Explique el problema y el resultado observable.

## Riesgo e invariantes

- [ ] Revisé saldo, inventario, caja, permisos, fechas e idempotencia cuando aplican.
- [ ] No edité ni borré libros históricos; usé compensaciones.
- [ ] Documenté migraciones, variables y compatibilidad móvil/API.

## Evidencia

- [ ] `npm run format:check`
- [ ] `npm run lint && npm run arquitectura:check`
- [ ] `npm run openapi:check` si cambió la API
- [ ] Pruebas unitarias/E2E/UI pertinentes
- [ ] Capturas o trazas sin PII para cambios visuales

## Liberación y reversa

Describa despliegue, smoke test y rollback. Marque “no aplica” con motivo cuando corresponda.
