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

Texto blanco sobre un botón `primario`: 4,9:1 (cumple).

## Modo claro
UniGo sigue siendo **modo oscuro primero**, pero también tiene modo claro. Sin elegir nada, la app sigue el modo del celular; el botón de sol/luna (arriba en cada pantalla) guarda la elección en ese navegador. Los mismos tokens cambian de valor en `app/globals.css`, así que los componentes no cambian.

| Token (clase) | Hex en claro | Contraste sobre fondo claro | Sobre superficie blanca |
|---|---|---|---|
| `fondo` | `#F4F7FB` | — | — |
| `superficie` | `#FFFFFF` | — | — |
| `primario` | `#2563EB` | 4,8:1 (se sigue usando solo como relleno) | 5,2:1 |
| `secundario` | `#1D4ED8` | 6,2:1 | 6,7:1 |
| `texto` | `#0B1220` | 17,4:1 | 18,7:1 |
| `texto-suave` | `#475569` | 7,1:1 | 7,6:1 |
| `error` | `#B91C1C` | 6,0:1 | 6,5:1 |

Reglas del modo claro:
- **Texto sobre azul:** encima de `bg-primario` se usa `text-sobre-primario` (blanco `#F8FAFC` en los dos modos, 4,9:1), no `text-texto`, que en claro es azul noche.
- **Bloques azules grandes** (tarjeta "Estás disponible", viaje activo, bloques azules de la portada): llevan `data-tema="oscuro"` para conservar la paleta oscura por dentro.
- **Logo:** el componente `Logo` (`app/ui/comun/logo.tsx`) muestra `logo-oscuro.png` o `logo-claro.png` según el modo.
- **Mapa y 3D:** toman los colores de los tokens y se repintan al cambiar de modo.
- La paleta clara la propuso el equipo de desarrollo (no viene del documento "IDENTIDAD APP"); si el equipo de diseño define otra, solo hay que cambiar los valores en `globals.css` y esta tabla.

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
