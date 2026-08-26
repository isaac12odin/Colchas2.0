# Runbook: dispositivo perdido o reemplazado

1. Administración revoca el equipo en **Sincronización → Dispositivos** y desactiva temporalmente al usuario si existe riesgo de acceso.
2. Revoca sesiones activas mediante cambio/restablecimiento de contraseña; para Administración, rota MFA.
3. Identifica la última secuencia/hash recibida y operaciones pendientes reportadas por el operador.
4. Si el equipo se recupera, no lo reactive hasta revisar integridad física, bloqueo, sistema operativo y cola.
5. En el reemplazo, instale la versión soportada, valide SQLCipher, autentique al mismo usuario y registre una identidad criptográfica nueva.
6. No transfiera un teléfono a otro usuario con cola pendiente. Primero sincronice/concile, revoque el dispositivo anterior y siga el procedimiento de borrado empresarial.

Una reinstalación elimina la única copia local de operaciones aún no recibidas. Sólo se autoriza cuando el servidor confirma pendientes cero o Contabilidad documenta la pérdida y reconstrucción manual.
