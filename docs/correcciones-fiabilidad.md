# Correcciones de fiabilidad

## Incluido
- Notificaciones por cuenta: propuesta #37, ya incorporada.
- GPS: se envía la hora real de la medición, no se vuelve a enviar la misma lectura como nueva y el servidor rechaza lecturas antiguas. Al perder el GPS se conserva un aviso; el teléfono pide mediciones nuevas aunque esté quieto.
- Puestos impagados: al vencer el límite dejan de bloquear nuevos viajes o puestos y dejan de permitir ver el teléfono del conductor. Retirarlos tras el vencimiento no añade strike ni cobro. La tarea de 021 actualiza el estado sin esperar a la salida del cupo.
- Entregas push: 022 reserva cada celular durante dos minutos y confirma cada resultado. Solo se reintentan los fallos. Si el envío llegó pero se perdió su confirmación, el reintento puede duplicarlo; no se promete entrega exactamente una vez a través de la red.
- Auditoría: un error de conexión o un informe incompleto hacen fallar CI. Las dependencias quedan fijadas con `package-lock.json` y se instalan con `npm ci`.

## Aplicar los cambios de Supabase

Los cambios de la app se publican al fusionar en `main`. La base de datos y la función de Supabase requieren estos pasos adicionales, en el proyecto de UniGo:

1. Ejecutar `supabase/migraciones/021-vencer-puestos-impagados.sql`.
2. Ejecutar `supabase/migraciones/022-entregas-avisos.sql`.
3. Volver a desplegar `supabase/functions/enviar-avisos/`, incluyendo `index.ts` y `entregas.ts`. Mantener las claves VAPID existentes y la configuración `verify_jwt` desactivada que ya usa la función.

La función anterior sigue teniendo sus RPC mientras se aplica 022. La función nueva necesita 022 y se despliega después. El reintento aprovecha el mantenimiento de 020; no necesita otra tarea. La tarea de vencimiento de puestos se crea si `pg_cron` ya está instalado.

Estos archivos no se ejecutan automáticamente en producción mediante GitHub Actions: las pruebas SQL corren en un Postgres aislado. No se deben ejecutar los archivos de `supabase/pruebas/` en Supabase.

## Comprobación del piloto
- Dos cuentas sucesivas en un mismo navegador: los avisos se asocian a la cuenta actual.
- Un puesto aprobado sin pagar: después de su límite, pedir otro viaje o puesto sin strike.
- Un puesto pagado: debe conservarse al correr el vencimiento.
- GPS desactivado y después recuperado: no presentar la última lectura como nueva y retomar con una medición reciente.
- Entrega push temporalmente fallida: reintentar solo ese celular; conservar los éxitos de los demás.

La aplicación puede probarse con simulaciones, pero la recepción real de push, el GPS físico y las tareas programadas deben comprobarse también con cuentas y dispositivos del piloto.
