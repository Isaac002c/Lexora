#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$POSTGRES_APP_PASSWORD" <<-'SQL'
  SELECT format('CREATE ROLE chronostek_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS', :'app_password')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chronostek_app') \gexec
  SELECT format('GRANT CONNECT ON DATABASE %I TO chronostek_app', current_database()) \gexec
SQL
