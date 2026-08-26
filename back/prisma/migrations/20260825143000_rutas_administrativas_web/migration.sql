-- Una ruta sin cobrador se opera exclusivamente desde la web por Administración.
-- Al asignarle cobrador también entra al alcance móvil de esa cuenta.
ALTER TABLE "rutas"
  DROP CONSTRAINT IF EXISTS "rutas_activas_requieren_cobrador_chk";
