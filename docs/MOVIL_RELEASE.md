# Liberación móvil nativa

Una prueba Vitest no acredita SQLCipher ni compatibilidad nativa. Cada versión conserva los artefactos y resultados de esta lista.

## Puerta automática

```bash
npm ci
npm run typecheck -w movil
npm run test -w movil
npm run doctor:movil
```

Expo Doctor debe terminar sin fallos. Los cambios de parche se hacen juntos con `npx expo install --fix`, se revisan y se vuelven a probar; no se ignoran por configuración.

## Builds

```bash
npm run build:android:preview -w movil
npm run build:android:apk -w movil
npm run build:android -w movil
npm run build:ios -w movil
```

Use `preview` sólo para QA universal. `apk-arm64` produce el APK optimizado
para descarga directa en teléfonos Android ARM de 64 bits. `production` genera
un AAB con las cuatro arquitecturas; Google Play entrega a cada dispositivo
únicamente sus bibliotecas compatibles.

Los perfiles de liberación activan R8, eliminación de recursos no usados,
compresión del bundle y de bibliotecas JNI, retiran el decodificador GIF y
conservan WebP porque los productos se sirven en ese formato. Los recursos
nativos se limitan a español e inglés. El manifiesto exclusivo de `release`
bloquea `SYSTEM_ALERT_WINDOW`; desarrollo conserva esa capacidad para las
herramientas de Expo. Toda esta configuración vive en
`movil/plugins/withVektraAndroidRelease.cjs`: no se debe editar manualmente la
carpeta generada `movil/android`.

La llave de firma tampoco debe guardarse dentro de `movil/android`: Expo puede
regenerar por completo ese directorio. Manténgala fuera del árbol generado y
fuera de Git (localmente se reserva `movil/.credenciales-release/`) y entregue
su ruta mediante `VEKTRA_KEYSTORE_FILE`. La contraseña se obtiene del gestor de
secretos y se pasa como `VEKTRA_STORE_PASSWORD`; nunca se escribe en `.env`,
scripts, historial de terminal ni configuración versionada. El alias se indica
con `VEKTRA_KEY_ALIAS`.

Registre EAS build ID, commit, perfil, arquitecturas, tamaño,
runtime/versionCode/buildNumber, checksum y enlace privado. Production no usa
`e2e.invalid` ni habilita `EXPO_PUBLIC_E2E_SQLCIPHER`.

Antes de publicar el APK directo, verifique que sólo exponga `arm64-v8a`, que
esté firmado con la llave de producción y que no declare
`SYSTEM_ALERT_WINDOW`. Conserve el AAB como artefacto canónico para Play y no
renombre un APK universal anterior como si fuera el nuevo build ligero.

## Matriz física

En Android e iOS reales valide: instalación limpia, login/MFA, cámara/foto, venta contado/crédito, abono, entrega, jornada, modo avión, 501 pendientes por lotes, rechazo corregible, reinicio durante sincronización, cambio de red, cierre/reapertura y cierre de sesión.

SQLCipher en ambas plataformas debe acreditar `PRAGMA cipher_version`, `cipher_integrity_check`, persistencia tras reapertura, fallo con clave incorrecta y migración desde la versión anterior. La pérdida/reinstalación con pendientes sigue el runbook, no una limpieza improvisada.

## Actualización y seguridad

- Instale la versión publicada anterior, capture datos sintéticos offline, actualice encima y compruebe esquema/cola/clave.
- Escanee APK/AAB/IPA con la herramienta aprobada; no publique hallazgos ni binarios en Git.
- Compruebe `allowBackup=false`, ausencia de secretos/URLs de ensayo y almacenamiento seguro de tokens.
- Evalúe root/jailbreak/MDM/attestation según el modelo de amenazas; hoy son decisiones operativas pendientes, no controles implementados.

La liberación queda bloqueada si falta un build, un sistema operativo, actualización desde versión anterior, SQLCipher real o evidencia del escaneo.
