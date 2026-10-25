# Impeccable en UniGo

Skill de diseño de interfaces de Paul Bakaus (https://github.com/pbakaus/impeccable),
licencia Apache 2.0 (ver LICENSE y NOTICE.md). Copiada del commit 658b4ce (versión 4.7.1).

Qué se copió: SKILL.md y la carpeta reference/ (las guías: critique, audit, polish,
layout, typeset, colorize, clarify, harden, etc.).

Qué NO se copió, a propósito:
- scripts/: el lanzador descarga y ejecuta un binario en el primer uso. La skill
  tiene un modo para cuando el lanzador no está ("Launcher unavailable"): lee
  PRODUCT.md y DESIGN.md directamente y sigue las guías.
- Los hooks que corren el detector después de cada edición.

En UniGo la identidad visual está en docs/identidad.md y app/globals.css, y las
reglas de AGENTS.md (tokens de color, fuentes, accesibilidad) mandan sobre las
sugerencias de la skill.
