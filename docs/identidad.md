# Identidad de UniGo

Fuente: documento "IDENTIDAD APP" del equipo. **Modo oscuro primero.**

## Colores
Definidos una sola vez en `app/globals.css`. Contrastes calculados (WCAG): el texto pasa 4,5:1 en todos los casos; el azul principal solo sirve como relleno, no como texto.

| Token (clase) | Hex | Uso | Contraste sobre fondo |
|---|---|---|---|
| `fondo` | `#0B1220` | Fondo de la app, mapa, pantalla del conductor | — |
| `superficie` | `#172033` | Tarjetas y componentes sobre el fondo | — |
| `primario` | `#2563EB` | Botones, ruta seleccionada, elementos activos, iconos grandes | 3,6:1 (**no usar como texto**) |
| `secundario` | `#60A5FA` | Texto azul, enlaces, líneas de ruta, estados seleccionados | 7,4:1 |
| `texto` | `#F8FAFC` | Títulos, texto principal, nombres de lugares | 17,9:1 |
| `texto-suave` | `#94A3B8` | Descripciones, información secundaria, iconos secundarios | 7,3:1 |
| `linea` | `#26344F` | Bordes finos y separadores sobre fondo oscuro (no es texto) | — |
| `tinta-suave` | `#475569` | Texto secundario sobre fondos claros (bloque blanco del sitio) | 7,2:1 sobre `texto` |

Texto blanco sobre un botón `primario`: 4,9:1 (cumple).

## Tipografía
- **Inter**: títulos (`font-titulo`).
- **Manrope**: texto (`font-texto`).

## Logos (`public/brand/`)
| Archivo | Uso |
|---|---|
| `logo-oscuro.png` | Sobre el fondo oscuro de la app (el que se usa por defecto) |
| `logo-claro.png` | Sobre fondos blancos (documentos, presentaciones) |
| `icono-oscuro.png` / `icono-claro.png` | Solo el pin "U" con el bus |

Íconos de la PWA en `public/icons/` y `app/icon.png`, generados a partir del icono oscuro. Lema: "Tu viaje, tu universidad".
