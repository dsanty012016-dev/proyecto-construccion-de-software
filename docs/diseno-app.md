# Diseño de la app UniGo

La acción y el estado actual ocupan el primer plano. El estudiante ve cómo pedir o retomar un viaje antes del mapa. El conductor ve su disponibilidad y las solicitudes. En pagos y administración, se separan las acciones de la información que debe revisarse.

## Composición

- **Navegación.** Barra inferior en móvil y menú lateral en escritorio. La pestaña activa conserva su nombre y una señal de posición. Al ampliar el texto, la barra puede desplazarse para conservar las etiquetas completas.
- **Viajes y cupos.** Origen, destino y precio se colocan en orden de lectura. La línea de la ruta muestra el progreso real. Los tiempos, placas, retiros y pagos usan cifras tabulares.
- **Cuentas y operación.** Billetera distingue saldo, modo de pagos y movimientos. Perfil agrupa el contacto y la edición. Administración separa el selector de colas de su contenido en escritorio.
- **Acceso.** El logo, el selector de tema, las etiquetas de los campos y los errores acompañan el paso actual de acceso, registro o recuperación.

## Movimiento

En la primera apertura de la pestaña, un recorrido de tres paradas presenta el logo en 860 ms. Un toque o una tecla lo cierra. Los títulos tienen una entrada propia por sección. La navegación resalta la pestaña elegida y los cambios del viaje destacan la parada actual. Billetera destaca la cifra real del saldo, el historial revela solo las primeras filas, perfil acompaña la apertura del editor y administración identifica la cola elegida.

El ajuste del dispositivo para reducir movimiento omite la apertura y las transiciones decorativas. Los estados y resultados se siguen leyendo por texto y por sus atributos accesibles.

## Alcance y revisión

Las acciones y el contenido de estado provienen de los flujos existentes. Verificar estudiante, conductor, billetera, historial, perfil, administración y acceso en ambos temas. Probar 320 px, escritorio, navegación con teclado, texto ampliado y movimiento reducido. El modo de Wompi y los permisos se comprueban mediante sus flujos y pruebas existentes.
