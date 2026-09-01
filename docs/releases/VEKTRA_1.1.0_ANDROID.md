# Vektra Android 1.1.0 (r3)

- Fecha: 2026-09-01
- Paquete: `com.nexo.cobranza`
- `versionName`: `1.1.0`
- `versionCode`: `3`
- Artefacto: `Vektra-1.1.0-r3-arm64.apk`
- ABI: `arm64-v8a`
- Tamaño: 25,952,246 bytes (24.75 MiB)
- SHA-256: `f468f179073150ead2e10cac510d8bae0d2280a8732f8ec7026b0b866809ca6b`
- Certificado SHA-256: `16561f048c901b44ab8980b2b1c946779947f2642d63756ce413f8fc939b71ee`
- Firmante: `CN=Vektra, OU=Aplicaciones, O=Nexo Cobranza, L=Mexico, ST=Mexico, C=MX`
- Firma: APK Signature Scheme v2, RSA 4096

## Comprobaciones

- `apksigner verify --verbose --print-certs`: correcto.
- `zipalign -c -P 16 -v 4`: correcto.
- `debuggable=false` y `allowBackup=false`.
- Sin `SYSTEM_ALERT_WINDOW` ni `RECORD_AUDIO`.
- URL de API de producción incluida; URL E2E ausente.
- R8, reducción de recursos, bundle y bibliotecas JNI comprimidas.
- Sólo contiene bibliotecas nativas ARM64.

## Actualización desde prototipos

Los APK 1.0.0 anteriores estaban firmados con el certificado estándar de
Android Debug. Esta es la primera firma release definitiva y Android no permite
actualizar directamente entre firmantes distintos. Antes de desinstalar un
prototipo, sincronice todos sus movimientos offline. Después desinstálelo e
instale 1.1.0. Las siguientes versiones deben conservar exactamente el
certificado release registrado arriba para permitir actualización en sitio.
