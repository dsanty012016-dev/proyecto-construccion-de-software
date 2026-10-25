#!/usr/bin/env bash
# Corre las migraciones y sus pruebas en un Postgres VACÍO (nunca en Supabase).
# La conexión se toma de las variables de psql: PGHOST, PGPORT, PGUSER,
# PGPASSWORD y PGDATABASE. El usuario debe ser superusuario.
set -euo pipefail
cd "$(dirname "$0")/.."

correr() { psql -X -q -1 -v ON_ERROR_STOP=1 -f "$1"; }

correr pruebas/00-supabase-simulado.sql
for archivo in migraciones/[0-9][0-9][0-9]-*.sql; do
  echo "Migración: $archivo"
  correr "$archivo"
done
psql -X -v ON_ERROR_STOP=1 -o /dev/null -f pruebas/pruebas.sql
