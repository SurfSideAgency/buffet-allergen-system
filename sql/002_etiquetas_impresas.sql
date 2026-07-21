-- Histórico de etiquetas impresas: guarda un snapshot de cada etiqueta
-- generada, para trazabilidad si un ingrediente cambia de alérgenos
-- después de haberse impreso la etiqueta.
--
-- Ejecutar en: Supabase → SQL Editor → New query → pegar y Run.

create table if not exists etiquetas_impresas (
    id bigserial primary key,
    dish_id bigint references dishes(id) on delete set null,
    establishment_id bigint not null references establishments(id) on delete cascade,
    datos_etiqueta jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists etiquetas_impresas_dish_id_idx on etiquetas_impresas(dish_id);
create index if not exists etiquetas_impresas_establishment_id_idx on etiquetas_impresas(establishment_id);
