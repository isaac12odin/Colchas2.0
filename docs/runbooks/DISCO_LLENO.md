# Runbook: disco lleno

1. Si uso ≥90%, detenga importaciones/reportes y evalúe congelar escrituras; no reinicie PostgreSQL repetidamente.
2. Identifique consumo por filesystem/contenedor/log/respaldo sin recorrer o borrar rutas amplias. Preserve WAL, datos PostgreSQL, respaldo más reciente y evidencia.
3. Rote logs mediante el mecanismo configurado y mueva respaldos ya verificados al destino externo. Nunca use `rm -rf` sobre rutas calculadas o el directorio de datos.
4. Amplíe volumen o libere únicamente artefactos reconstruibles con objetivos explícitos.
5. Compruebe PostgreSQL, `/salud/listo`, migraciones, reconciliación y un smoke test antes de reabrir.
6. Ajuste alerta/capacidad para mantener al menos 20% libre.
