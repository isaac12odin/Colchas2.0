-- Las cuentas creadas fuera de Prisma también fallan cerrado: toda credencial
-- nueva es temporal hasta que su propietario la sustituya. No se alteran filas
-- existentes porque no es posible distinguir de forma segura una clave ya
-- confirmada de una temporal histórica.
ALTER TABLE "usuarios"
ALTER COLUMN "debeCambiarContrasena" SET DEFAULT true;
