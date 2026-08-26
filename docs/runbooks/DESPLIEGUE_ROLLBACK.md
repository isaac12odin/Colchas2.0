# Runbook: despliegue y rollback

Use `docs/RELEASE.md` como secuencia. Antes: CI verde, commit/tag, imágenes, respaldo verificado, revisión SQL, variables y versión móvil compatible. Durante: migraciones con `migrate deploy`, servicios con etiquetas inmutables y smoke tests del dominio.

Rollback sólo vuelve a una imagen compatible con el esquema. No edite `_prisma_migrations` ni aplique SQL inverso improvisado. Si hubo escrituras nuevas, preserve operaciones offline y determine si restaurar perdería dinero; puede ser más seguro avanzar con un hotfix. Documente decisión, hora y reconciliación final.
