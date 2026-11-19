# Diseño de la app UniGo

La acción y el estado actual ocupan el primer plano. El estudiante ve cómo pedir o retomar un viaje antes del mapa. El conductor ve su disponibilidad y las solicitudes. En pagos y administración, se separan las acciones de la información que debe revisarse.

## Composición

- **Navegación.** Barra inferior en móvil y menú lateral en escritorio. La pestaña activa conserva su nombre y una señal de posición. Al ampliar el texto, la barra puede desplazarse para conservar las etiquetas completas.
- **Viajes y cupos.** Origen, destino y precio se colocan en orden de lectura. La línea de la ruta muestra el progreso real. Los tiempos, placas, retiros y pagos usan cifras tabulares.
- **Cuentas y operación.** Billetera distingue saldo, modo de pagos y movimientos. Perfil agrupa el contacto y la edición. Administración separa el selector de colas de su contenido en escritorio.
- **Acceso.** El logo, el selector de tema, las etiquetas de los campos y los errores acompañan el paso actual de acceso, registro o recuperación.

## Movimiento

La entrada de pantalla dura 360 ms. Al aceptar o avanzar en el viaje se resalta la parada actual y la línea refleja su avance en 550 ms. Los controles conservan su respuesta visual en movimiento reducido, con el estado del viaje expuesto por texto y atributos accesibles.

## Alcance y revisión

Las acciones y el contenido de estado provienen de los flujos existentes. Verificar estudiante, conductor, billetera, historial, perfil, administración y acceso en ambos temas. Probar 320 px, escritorio, navegación con teclado, texto ampliado y movimiento reducido. El modo de Wompi y los permisos se comprueban mediante sus flujos y pruebas existentes.
