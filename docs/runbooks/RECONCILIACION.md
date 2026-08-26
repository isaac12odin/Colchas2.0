# Runbook: diferencia de reconciliación

1. El timer sale con código `2` y JSON con `libro`, `entidadId`, `codigo`, esperado/actual y movimiento. Preserve esa salida en el canal privado.
2. No ejecute `UPDATE` directo ni vuelva a correr una operación con un ID distinto para esconder la diferencia.
3. Congele operaciones del cliente/producto afectado si la diferencia puede crecer. Revise auditoría, venta/abono/devolución/compra, recibos offline y carrera temporal.
4. Reproduzca sobre una copia de prueba. Determine si falló el libro, la proyección o el origen histórico.
5. Administración/Contabilidad autoriza un movimiento compensatorio con motivo, referencia al incidente y valor esperado. Inventario requiere el rol permitido.
6. Ejecute de nuevo `npm run reconciliar`; debe quedar `INTEGRO`. Agregue una prueba de regresión antes de cerrar.
