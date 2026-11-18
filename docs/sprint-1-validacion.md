# Sprint 1 · Lectura y accesibilidad

Esta entrega aplica U01–U05, U13 y U15 de la revisión de UI/UX sobre `7997557abf54c0ff6f5f23416973336222be102e`. El plan completo está en [sprints-ui-ux.md](sprints-ui-ux.md).

## Comportamiento

- La oferta separa precio y ajustes de $500. Comisión y ganancia cambian de fila cuando necesitan espacio. Se comprueban $50.000 y $100.000 completos, incluyendo el límite permitido.
- Los botones compartidos y las acciones principales usan altura mínima y relleno para alojar varias líneas. Incluye subir documentos y los enlaces de inicio/resultado de recarga.
- Los campos de acceso y el precio conservan el indicador de foco del sistema visual. Un borde de error ya no oculta la posición del teclado.
- Entrar, registro y recuperación muestran un resumen con `role="alert"` y enfocan el primer campo inválido. Cuando solo hay un error general, enfocan el resumen. La nueva contraseña reutiliza el mismo comportamiento.
- Saldo, modo de usuario, placa, barra pública y títulos pueden reorganizarse. Las etiquetas del progreso del viaje tienen espacio propio; el título de la recarga puede dividir palabras largas.
- Disponibilidad mantiene la pista visual de 32 px dentro de un botón de 44 px de alto. El control pasa a otra fila cuando aumenta el texto. El foco usa el token claro sobre el azul, con contraste aproximado de 4,94:1 para ese par concreto.

Se conservan las validaciones, importes, comisión, estados, permisos y acciones de negocio. No hay migraciones ni cambios en la configuración de Wompi.

## Verificación

- `npm run lint`: aprobado.
- `npm test`: 248 pruebas aprobadas en 29 archivos.
- `npm run build`: aprobado con Next.js 16.4.6, incluyendo TypeScript y generación de las rutas.
- `npm audit --omit=dev --json`: cero vulnerabilidades conocidas en dependencias de producción en la comprobación de esta entrega. Esto no incluye las herramientas de desarrollo.
- Navegador: 236 comprobaciones aprobadas, sin fallos, sobre la versión final. Incluye las acciones compartidas de oferta, viaje, cupo, calificación, retiro y documentos.

Los formularios públicos se prueban contra el servidor Next real, con un servicio de datos local inaccesible y entradas que fallan antes de cualquier escritura. Las páginas privadas usan componentes y estilos reales con datos y acciones ficticios. Los mapas y efectos de ubicación se sustituyen explícitamente en estas muestras.

Se revisan 320 y 360 px, temas claro y oscuro, texto normal y ampliado, teclado, errores y conservación de datos al corregir. La ampliación se emula duplicando los tamaños de texto; en las páginas públicas también se duplica el tamaño de raíz. Se añaden comprobaciones de escritorio a 768 y 1280 px. No equivale a certificar todos los navegadores ni el zoom nativo de cada dispositivo.

No se crean cuentas, se envían correos, se ejecutan cobros o retiros ni se modifica la base real. Queda pendiente una sesión de uso con lector de pantalla y personas del público objetivo.

## Corrección necesaria para publicar

La compilación detectó avisos de seguridad en Next.js 16.4.3. Se actualizan `next` y `eslint-config-next` a **16.4.6**, manteniendo la versión principal y el resto de dependencias directas. Se repiten las pruebas sobre esa versión. El archivo de dependencias fijadas acompaña el cambio.

## Publicación

Se valida mediante la rama `sprint-1-lectura-accesibilidad`, un Pull Request y las comprobaciones automáticas. El despliegue se verifica después de la integración; no se marca publicado por haber compilado localmente.
