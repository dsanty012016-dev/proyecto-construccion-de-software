# Operación y verificación del piloto

UniGo cuenta con un solo proyecto Supabase hospedado. El equipo mantiene Wompi en Sandbox. Las pruebas con usuarios y datos ficticios se ejecutan en local. Si se habilita otro proyecto de pruebas, debe mantener sus propios datos y secretos.

## Entorno de pruebas

1. En local usa datos ficticios. Si hay un proyecto hospedado separado, conecta una vista previa de Vercel únicamente a ese proyecto. Para validar correo, VAPID y Wompi Sandbox usa cuentas de prueba dedicadas.
2. En Supabase Vault, guarda `unigo_tareas_origen` con el origen HTTPS del mismo proyecto y `unigo_tareas_token` con un token aleatorio exclusivo de ese entorno de 32 a 128 caracteres usando letras, números, guiones y guiones bajos. Las funciones comparan la credencial con su huella desde la base.
3. Aplica las migraciones en orden hasta la 033. Publica `enviar-avisos`, `confirmar-pago` y `limpiar-documentos` con `verify_jwt=false`. El webhook de Wompi valida la firma del proveedor y las otras dos funciones autentican al programador.
4. Al preparar una restauración, desactiva las tareas salientes durante el restablecimiento. Asegúrate de que Vault contenga únicamente los valores de esa instalación antes de reactivar sus tareas. Sin ambos valores, las tareas quedan sin salida HTTP.
5. Repite el recorrido de pagos en Sandbox antes de publicar cambios en producción. Para actualizar el proyecto, prepara sus valores en Vault, aplica las migraciones, publica las funciones y verifica una entrega de prueba antes de publicar la app. La tarea de avisos reintenta los pendientes recientes.

## Pagos, retiros y soporte

- El checkout real y los retiros reales empiezan deshabilitados. El cambio de ambiente requiere conciliar pendientes, saldos y retiros de prueba, comprobar todas las llaves de ese ambiente y autorizar las banderas de habilitación.
- Si hay una incidencia con el proveedor, pausa nuevas aperturas mediante `checkout_pausado`. Mantén el ambiente y la firma vigentes para seguir conciliando los pagos ya abiertos. En el panel revisa referencias pendientes hace más de 30 minutos. La antigüedad por sí sola no indica un pago confirmado.
- Para un retiro, toma la solicitud, revisa la cédula y confirma la titularidad. En modo de prueba usa una referencia ficticia. Si el estado en Nequi es incierto, concilia la operación original antes de repetir una transferencia.
- Los archivos reemplazados se conservan 90 días. Cada hora, la tarea de limpieza selecciona los archivos retirados que cumplieron el plazo y los elimina mediante la API de Storage. Administración muestra el tamaño de la cola. Los históricos sin fecha de reemplazo empiezan a contar desde que se incorporan a la cola. Los archivos vigentes siguen disponibles en su bucket privado.
- Las nuevas aprobaciones de licencia guardan la fecha del documento. El conductor ve el aviso de vencimiento y puede enviar la renovación. Las licencias históricas sin fecha aparecen en el conteo de Administración y deben actualizarse al renovar.
- En Admin revisa retiros próximos a vencer, incidencias y avisos atrasados. En Supabase consulta la ejecución de las tareas y la respuesta de las funciones para distinguir atrasos de envíos fallidos. WhatsApp atiende reportes y revisiones en el plazo acordado de siete días.

## Pruebas de salida

| Recorrido | Qué registrar |
| --- | --- |
| Acceso institucional | Confirmación y recuperación en el buzón de pruebas, enlace de un solo uso, acceso por rol y política vigente. |
| Viajes y cupos | Dos ofertas, una aceptación, un puesto final, cancelaciones, calificación y saldo. Repetir con red intermitente. |
| Wompi Sandbox | Aprobado, rechazado, pendiente, retorno antes del aviso, aviso repetido e incidencia. Conciliar referencia, transacción, monto y movimiento. |
| Nequi simulado | Dos administradores intentan tomar el mismo retiro. Confirmar que solo uno lo toma, que el rechazo devuelve el saldo y que el pago simulado conserva su comprobante. |
| Push, mapas y soporte | Android y iPhone físicos. Instalación de PWA, cuenta cambiada, permisos GPS, reconexión, expiración del enlace compartido y destino de WhatsApp. |
| Capacidad | 50 personas simultáneas. Ejecutar la prueba de concurrencia de CI y repetir el recorrido HTTP autenticado en el entorno de pruebas. Registrar p95, errores y versión. |

CI prueba reglas en Postgres desechable y recorridos de navegador con datos ficticios. `node supabase/pruebas/concurrencia.mjs` requiere una base local desechable con las migraciones aplicadas, `psql` y `UNIGO_BD_DESECHABLE=1`. Las pruebas de aceptación con correo, Sandbox, push y GPS se anotan con fecha, dispositivo y versión. No se usan usuarios ni dinero reales para esta verificación.
