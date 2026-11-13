# Pagos: recargas con Wompi

Cómo entra dinero a la billetera de UniGo y qué hay que hacer para activarlo. Las reglas de negocio están en `docs/reglas.md`.

## Estado
- **Hecho (fase 20):** recargas con Wompi, probadas contra la base de datos y con pruebas automáticas. **No se ha probado contra Wompi** porque el equipo todavía no tiene cuenta ni llaves.
- **Mientras no haya llaves** en Vercel, la billetera sigue igual que antes: recarga de prueba con saldo simulado.
- **Falta:** retiros de los conductores (se decidió hacerlos a mano por Nequi; faltan sus reglas) y lo que se lista en "Antes de cobrar dinero real".

## Decisiones del equipo
- Pasarela: **Wompi** (sin mensualidad; cobra 2,65 % + $700 + IVA por pago aprobado).
- El dinero entra por **recargas** a la billetera; los viajes se siguen pagando con saldo.
- La comisión de la pasarela la **asume UniGo**: quien paga $20.000 recibe $20.000.
- Recarga mínima **$20.000** (antes $2.000), máxima $500.000, saldo máximo $1.000.000.
- Los conductores retiran **a mano por Nequi** (pendiente de construir).

## Cómo funciona
1. En **Billetera**, la persona elige el monto y toca **Pagar**.
2. La app abre una recarga `pendiente` en la base (`iniciar_recarga`) y la manda a la página de pago de Wompi con esa referencia y una firma que impide cambiar el monto.
3. La persona paga en Wompi con Nequi, PSE, Bancolombia o tarjeta. UniGo nunca ve esos datos.
4. Wompi avisa el resultado a `/api/v1/pagos/wompi` con un evento firmado.
5. La **base de datos** revisa la firma con el secreto de eventos (`confirmar_recarga_wompi`). Si es de Wompi y el pago se aprobó por el monto exacto, suma el saldo, deja el movimiento y manda la notificación. Cada recarga se acredita una sola vez aunque el aviso llegue repetido.
6. Al volver de Wompi, la persona ve `/billetera/recarga/<referencia>`, que se actualiza sola hasta que llega el aviso.

La app no puede dar saldo por su cuenta: solo un evento firmado por Wompi lo hace. Por eso el secreto de eventos vive en la base y no en Vercel.

| Pieza | Dónde |
|---|---|
| Tablas y funciones | `supabase/migraciones/023-pasarela.sql` |
| Firma del pago y dirección de Wompi | `app/lib/wompi.ts` (pruebas en `wompi.test.ts`) |
| Llaves y modo (prueba, Wompi en pruebas, Wompi real) | `app/lib/pasarela.ts` |
| Abrir la recarga | `iniciarRecarga` en `app/lib/acciones-billetera.ts` |
| Recibir el aviso de Wompi | `app/api/v1/pagos/wompi/route.ts` |
| Resultado de la recarga | `app/(app)/billetera/recarga/[referencia]/page.tsx` |
| Pruebas de la base | `supabase/pruebas/pasarela.sql` |

## Activar en modo de pruebas
Nadie paga dinero real en este modo. Lo hace una persona del equipo; las llaves no se comparten por chat ni se suben al repositorio.

1. **Crear la cuenta** en `comercios.wompi.co`. Como persona natural pide cédula, RUT y una cuenta Bancolombia con más de 30 días.
2. En el panel de Wompi, en la sección de desarrolladores, copiar las llaves **de pruebas**: la llave pública (`pub_test_...`), el secreto de integridad (`test_integrity_...`) y el secreto de eventos (`test_events_...`).
3. **Aplicar la migración 023** en Supabase (SQL Editor), después de comprobar que 021 y 022 ya están aplicadas.
4. **Guardar el secreto de eventos** en la base, también en el SQL Editor:
   ```sql
   update privado.ajustes_pago set secreto_eventos = 'test_events_...';
   ```
5. En **Vercel → Settings → Environment Variables** (Production), agregar:
   - `WOMPI_LLAVE_PUBLICA` = `pub_test_...`
   - `WOMPI_SECRETO_INTEGRIDAD` = `test_integrity_...`

   y volver a desplegar.
6. En el panel de Wompi, poner como **URL de eventos de pruebas**: `https://unigoproject.vercel.app/api/v1/pagos/wompi`
7. Probar una recarga. Datos de prueba de Wompi: Nequi `3991111111` (aprueba) y `3992222222` (rechaza); tarjeta `4242 4242 4242 4242` (aprueba) y `4111 1111 1111 1111` (rechaza), con cualquier fecha futura y CVC.

Si la recarga se queda en "Estamos confirmando tu pago", casi siempre es la URL de eventos (paso 6) o el secreto de eventos (paso 4).

## Antes de cobrar dinero real
- [ ] **Consulta legal: guardar saldo.** Recibir dinero de muchas personas y guardarlo puede considerarse captación, reservada a entidades vigiladas. Preguntar si el modelo de saldo recargable es viable o si hay que pasar a pago por viaje.
- [ ] **Consulta legal: transporte.** El transporte pagado en vehículos particulares está en discusión en Colombia (proyecto de ley radicado en febrero de 2026). Confirmar con la universidad o un abogado.
- [ ] **Impuestos.** El dinero llega a la cuenta de una persona del equipo: definir quién y qué obligaciones tiene.
- [ ] **Retiros de conductores** construidos y probados.
- [ ] **Política de privacidad** actualizada: Wompi procesa el pago; UniGo guarda el número de la transacción y el medio de pago.
- [ ] Cambiar en Vercel las dos llaves por las **de producción** (`pub_prod_...`, `prod_integrity_...`), guardar en la base el secreto de eventos de producción y poner la URL de eventos de producción en Wompi.
- [ ] **Cerrar la recarga de prueba** el mismo día:
  ```sql
  update privado.ajustes_pago set recarga_simulada = false;
  ```
- [ ] Decidir qué pasa con el saldo de prueba que ya tengan las cuentas (hoy se quedaría como si fuera real).
- [ ] Quitar de la portada la frase "todavía no se cobra dinero real".

## Lo que esta fase no hace
- **Reversos:** si Wompi anula un pago que ya se había aprobado, el saldo no se descuenta solo. Hay que revisarlo a mano.
- **Comisión de la pasarela en las cuentas:** el panel de administración no descuenta lo que cobra Wompi de las ganancias de UniGo.
- **Recargas abandonadas:** quedan como `pendiente` y no estorban; no se borran.
