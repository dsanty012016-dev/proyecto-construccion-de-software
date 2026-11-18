# Sprint 2 · Pagos y recuperación

Entrega basada en `0ebb6bb784da8818fc653bb3af8baf19c7ad2ced`, correspondiente al sprint 1 publicado en el PR #45. Aplica U06, U07, U09, U10 y U14 del [plan de sprints](sprints-ui-ux.md).

## Comportamiento implementado

- **U06 · Consultas:** los errores de las lecturas de viajes, ofertas, vehículos, cupos, puestos, perfiles y documentos se propagan a una pantalla recuperable. Un fallo deja de interpretarse como cero ofertas, ausencia de viaje, falta de documentos o cupo lleno. Los resultados realmente vacíos conservan su representación habitual. El reintento vuelve a consultar manteniendo la ruta y el contexto.
- **U07 · Mapa y GPS:** reintentar recrea solo el mapa, conservando dirección, referencia y estado del formulario. Una carga sin respuesta ofrece recuperación a los 20 segundos. Se limpian la instancia, sus referencias y los temporizadores al reintentar. Los eventos de instancias retiradas no eligen puntos. Las coordenadas inválidas o una excepción del GPS se informan sin reemplazar un punto válido. Se explica que escribir la dirección no selecciona coordenadas; mapa o GPS deben proporcionar el punto.
- **U09 · Modo de dinero:** simulación interna, Wompi Sandbox, Wompi real e indisponibilidad son estados explícitos. La simulación exige `UNIGO_RECARGA_SIMULADA=true`, ausencia de configuración de checkout de Wompi y permiso vigente en la base. Una configuración parcial o incompatible no cae en simulación. La acción de servidor bloquea las recargas simuladas fuera de ese modo, incluso ante una llamada directa. La billetera permite reconsultar la disponibilidad y conserva visibles los intentos pendientes.
- **U10 · Retorno:** un puesto aprobado muestra saldo, faltante y plazo. La billetera y el checkout conservan un destino interno validado hacia ese cupo o viaje. Aprobada la recarga se ofrece volver a la tarea; rechazo y espera mantienen el contexto. Al volver se consultan otra vez estado, saldo y vigencia. Un puesto impagado vencido informa la pérdida y permite buscar otro; un viaje distinto no muestra ofertas pagables del viaje nuevo como si fueran el anterior. Recargar no paga automáticamente un puesto ni acepta una oferta.
- **U14 · Compartir:** una acción interrumpida muestra un error recuperable y permite reintentar. Se conserva la copia manual si el portapapeles no está disponible. Cancelar el diálogo nativo de compartir no se presenta como fallo.

Se ajustan además el saldo y la fila de vehículo/placa para conservar la lectura al ampliar el texto. La simulación no convierte saldos anteriores; los importes, comisiones, reglas de pago, retiros y permisos de la base siguen sujetos a sus validaciones existentes. No hay migraciones ni cambios de variables del proyecto conectado.

## Verificación

- Lint: aprobado.
- Pruebas: 305 aprobadas en 33 archivos. Las 57 nuevas comprobaciones cubren errores de consultas usando el cliente Supabase real con respuestas HTTP ficticias, configuración de modos, destinos manipulados, retorno del checkout y estado de puestos vencidos/pagados.
- Compilación de producción: aprobada, incluyendo TypeScript.
- Navegador: 179 comprobaciones de comportamiento y presentación aprobadas, incluidos teclado, GPS, espera sin respuesta y retorno a la tarea. El ajuste final de espacio del estado de error pasó otras 12 comprobaciones de tamaño, visibilidad y activación del botón, en ambos temas a 320/360 px y texto ampliado.

Se prueban 320 y 360 px, ambos temas y texto ampliado de forma emulada. Las páginas privadas usan componentes reales y datos/acciones ficticios. Para recuperación del mapa se usa MapLibre real con un estilo mínimo suministrado por la prueba y fallos de red controlados. Esto permite comprobar fallo, espera y recuperación sin depender de la disponibilidad del proveedor de mapas.

Los destinos de retorno se admiten solo para un cupo concreto o un viaje identificado. Se rechazan dominios externos, otras rutas, parámetros añadidos y valores alterados. La URL de retorno no acredita dinero: el resultado continúa consultando la recarga propia en la base y la confirmación continúa mediante el evento verificado de Wompi.

## Límites y seguimiento

Las pruebas no realizan cobros, retiros, registros, correos ni escrituras en la base real. La confirmación previa del usuario de que Wompi funcionaba corresponde al comercio antes de esta entrega; estas pruebas no la sustituyen ni certifican una transacción nueva. La publicación y su verificación se registran en el cierre y el PR.

Se conserva la elección por mapa o GPS. Incorporar búsqueda de direcciones requiere elegir un servicio y sus condiciones; se mantiene como mejora opcional posterior. También queda pendiente la validación con personas usuarias y lector de pantalla.

Referencias de implementación: [errores en consultas de Supabase](https://supabase.com/docs/reference/javascript/throwonerror) y [retorno del checkout de Wompi](https://docs.wompi.co/docs/colombia/widget-checkout-web/). La app conserva la confirmación del pago en el servidor.
