-- Registro de intentos fallidos, para limitar la fuerza bruta contra el
-- login de administración y la activación de licencias.
--
-- Ejecutar en: Supabase → SQL Editor → New query → pegar y Run.

create table if not exists intentos_login (
    id bigserial primary key,
    identificador text not null,  -- IP de origen
    tipo text not null,           -- 'admin' | 'licencia'
    created_at timestamptz not null default now()
);

create index if not exists intentos_login_lookup_idx
    on intentos_login (tipo, identificador, created_at desc);

-- Limpieza de registros antiguos: sin esto la tabla crece sin límite.
-- Si tienes pg_cron disponible puedes programarlo; si no, basta con
-- ejecutar este DELETE de vez en cuando.
delete from intentos_login where created_at < now() - interval '7 days';
