# Pagos y retiros

La implementación incluye recargas con Wompi y retiros manuales por Nequi. Las pruebas automáticas usan proveedores y cuentas ficticias. No acreditan que se haya probado Wompi ni una transferencia real.

## Reglas confirmadas
- Recargas entre $20.000 y $500.000; saldo máximo $1.000.000. La comisión de Wompi la asume UniGo.
- Retiros desde $20.000, por Nequi, con plazo máximo de siete días desde la solicitud.
- El administrador revisa la documentación aprobada, la cédula y que el conductor sea titular del Nequi. La cédula por sí sola no verifica automáticamente la titularidad de una cuenta Nequi.
- El retiro reserva saldo al solicitarlo. Al registrar el pago no se descuenta otra vez; rechazarlo devuelve la reserva una sola vez. Otro administrador debe revisar los retiros de un administrador.
- El disponible está limitado por el saldo actual y las ganancias registradas, menos retiros reservados y más retiros devueltos. Recargar no aumenta ese límite de ganancias. La revisión del origen del saldo de prueba sigue siendo necesaria antes del dinero real.
- La transferencia se hace fuera de UniGo. El administrador registra la referencia del comprobante, que no puede repetirse en otro retiro. UniGo no se conecta a Nequi para pagar ni verificar automáticamente el comprobante.

## Confirmación de una recarga
1. `iniciar_recarga` abre el intento sin dar saldo. La app genera el enlace firmado de checkout.
2. Wompi envía el evento a `/api/v1/pagos/wompi`. La ruta limita el cuerpo y lo pasa a la función de Supabase `confirmar-pago`.
3. La función valida la firma mediante `privado.validar_evento_pago`, antes de consultar al proveedor. La firma debe cubrir ID, estado y monto.
4. Consulta ese ID en el host fijo de Wompi del ambiente correspondiente con la llave privada del comercio. La referencia del evento puede no estar firmada: nunca se utiliza para elegir a quién acreditar.
5. `privado.confirmar_pago_verificado` usa la referencia, monto, moneda y estado de la respuesta de Wompi; bloquea recarga y billetera y acredita una sola vez. Comprueba el tope también al acreditar, incluso si había varios intentos pendientes.
6. Una anulación posterior, pago adicional, monto incorrecto o exceso de saldo se conserva como incidencia para revisión. No se descuenta ni reembolsa dinero automáticamente. El administrador ve las incidencias en `/admin`; la persona ve «En revisión».

La función antigua `public.confirmar_recarga_wompi` queda desactivada en 024. Las funciones de confirmación nuevas y el secreto de eventos son privados: ni `anon` ni `authenticated` pueden llamarlas. Los fallos temporales devuelven 503 para permitir el reintento; no se responde éxito antes de persistir el resultado.

La billetera muestra errores de lectura sin sustituirlos por saldo cero. El historial conserva recargas antiguas, su referencia y resultado. Tras tres minutos la pantalla explica que terminó el refresco automático y permite consultar de nuevo sin pagar otra vez.

## Orden de publicación
Aplicar 023 si falta. Después ejecutar **024 y 025, por separado y en ese orden**: 024 añade valores al enum que 025 utiliza. No ejecutar `supabase/pruebas/` en una base real. Fusionar una rama no aplica SQL ni publica una función de Supabase.

Antes de ejecutar SQL sobre un proyecto conectado, mostrar los archivos exactos y confirmar la última migración aplicada. Los archivos de esta entrega son:
- `supabase/migraciones/024-seguridad-pagos.sql`
- `supabase/migraciones/025-retiros-conductores.sql`

Después publicar `confirmar-pago` con verificación JWT desactivada (autentica la firma de Wompi) y por último publicar la app Next.js. Desde un equipo autenticado y vinculado al proyecto correcto:

```bash
supabase functions deploy confirmar-pago --no-verify-jwt
```

La función usa `SUPABASE_DB_URL`, proporcionada por Supabase, para llamar a las funciones privadas. No necesita una llave de servicio en el navegador.

## Configuración de Wompi en pruebas
Las llaves se guardan en los paneles correspondientes; nunca en el repositorio, capturas, registros ni chat.

| Lugar | Variable o ajuste | Valor de pruebas |
|---|---|---|
| Vercel | `WOMPI_LLAVE_PUBLICA` | Prefijo `pub_test_` |
| Vercel | `WOMPI_SECRETO_INTEGRIDAD` | Prefijo `test_integrity_` |
| Supabase → Edge Function Secrets | `WOMPI_LLAVE_PRIVADA` | Prefijo `prv_test_` |
| `privado.ajustes_pago` | `secreto_eventos` | Prefijo `test_events_` |
| Wompi → eventos de pruebas | URL | `https://unigoproject.vercel.app/api/v1/pagos/wompi` |

La consulta de transacciones utiliza autenticación privada según la [documentación oficial de Wompi](https://docs.wompi.co/docs/colombia/transacciones/). Publicar de nuevo la app después de cambiar sus variables. Sin las llaves de checkout continúa la recarga simulada; con llaves incompletas no debe iniciarse un piloto de pagos.

Probar en el ambiente de Wompi de pruebas: aprobación, rechazo, aviso repetido, retorno antes del aviso y reintento tras una caída. Comprobar el saldo, movimiento y referencia en el historial. Las pruebas ficticias de GitHub no reemplazan esta prueba del comercio.

## Separar pruebas y producción
024 añade `saldos_de_prueba_revisados=false`. Mientras sea falso o siga habilitada `recarga_simulada`, los eventos de producción se rechazan. Los retiros se marcan como simulados si la base no está completamente configurada para producción; esa marca no cambia al cambiar los ajustes.

Antes de pasar a dinero real, el equipo debe conciliar saldos y ganancias ficticias, intentos pendientes y retiros simulados. **No se borran ni convierten saldos automáticamente.** Solo después de resolverlos, cerrar `recarga_simulada`, registrar la revisión de saldos y cambiar todas las llaves al mismo ambiente de producción. La bandera no limpia datos: es una constancia de la revisión del equipo.

Siguen pendientes la prueba del comercio, la conciliación operativa y las decisiones legales, tributarias y de privacidad del piloto. No quitar el aviso de dinero simulado hasta completar la puesta en marcha.

## Archivos y comprobaciones
- 023: base original de recargas; 024: confirmación privada e incidencias; 025: reservas y retiros.
- `supabase/functions/confirmar-pago/`: consulta autenticada y confirmación.
- `app/lib/acciones-retiros.ts`, `consultas-retiros.ts`, `retiros.ts`: operaciones y validación.
- `/billetera/recargas`, `/billetera/retiros`, `/admin`: historial y revisión.
- `supabase/pruebas/pasarela.sql` y `seguridad-pagos.sql`: comprobaciones aisladas de firma, permisos, topes, reservas y revisión. El doble `prueba.confirmar_pago` existe únicamente en esa base de pruebas.

Las incidencias se muestran para conciliación manual; esta entrega no incluye una acción que ajuste saldos o haga reembolsos en Wompi. Un plazo vencido se destaca al administrador; no ejecuta un pago automático.

