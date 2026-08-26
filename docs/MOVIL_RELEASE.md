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
npm run build:android -w movil
npm run build:ios -w movil
```

Registre EAS build ID, commit, perfil, runtime/versionCode/buildNumber, checksum y enlace privado. Production no usa `e2e.invalid` ni habilita `EXPO_PUBLIC_E2E_SQLCIPHER`.

## Matriz física

En Android e iOS reales valide: instalación limpia, login/MFA, cámara/foto, venta contado/crédito, abono, entrega, jornada, modo avión, 501 pendientes por lotes, rechazo corregible, reinicio durante sincronización, cambio de red, cierre/reapertura y cierre de sesión.

SQLCipher en ambas plataformas debe acreditar `PRAGMA cipher_version`, `cipher_integrity_check`, persistencia tras reapertura, fallo con clave incorrecta y migración desde la versión anterior. La pérdida/reinstalación con pendientes sigue el runbook, no una limpieza improvisada.

## Actualización y seguridad

- Instale la versión publicada anterior, capture datos sintéticos offline, actualice encima y compruebe esquema/cola/clave.
- Escanee APK/AAB/IPA con la herramienta aprobada; no publique hallazgos ni binarios en Git.
- Compruebe `allowBackup=false`, ausencia de secretos/URLs de ensayo y almacenamiento seguro de tokens.
- Evalúe root/jailbreak/MDM/attestation según el modelo de amenazas; hoy son decisiones operativas pendientes, no controles implementados.

La liberación queda bloqueada si falta un build, un sistema operativo, actualización desde versión anterior, SQLCipher real o evidencia del escaneo.
