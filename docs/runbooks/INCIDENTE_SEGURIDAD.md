# Runbook: incidente de seguridad

1. Preserve evidencia y registre hora; no borre logs ni avise por canales públicos.
2. Contenga por alcance: revoque dispositivo/sesiones, desactive cuenta, limite proxy o aísle API/DB.
3. Rote sólo los secretos comprometidos. `FIELD_ENCRYPTION_KEY` y `SEARCH_HMAC_KEY` requieren migración/reindexación coordinada; no se reemplazan a ciegas.
4. Determine PII, dinero, cuentas, fechas y operaciones afectadas mediante auditoría, recibos offline y logs sin cuerpos.
5. Restaure servicio desde artefactos conocidos, aplique corrección y fuerce autenticación cuando corresponda.
6. Notifique conforme al aviso de privacidad y obligaciones aplicables; documente decisiones y responsables.
7. Cierre con causa raíz, línea temporal, impacto, controles nuevos y prueba de no regresión.
