-- ============================================================================
--  Academia DL-BJJ — área do aluno e eventos
--  (design: docs/superpowers/specs/2026-10-20-area-do-aluno-design.md §7)
--
--  1. dlbjj_codigos_login  — códigos de 6 dígitos enviados pelo WhatsApp para
--     entrar na área do aluno. Só o hash; 10 minutos; 5 tentativas.
--  2. dlbjj_sessoes_aluno  — sessões de 90 dias (cookie = token em claro,
--     tabela = sha256). Terminam no "Sair" e na anonimização.
--  3. dlbjj_eventos        — seminários, graduações, competições… que o Daniel
--     marca no painel e os alunos veem no calendário. Cancelar é soft.
--  4. dlbjj_alunos.ranking_visivel — o Daniel pode esconder um aluno do ranking.
--
--  Idempotente e aditiva: pode correr outra vez; 001–004 ficam como estão.
-- ============================================================================

create table if not exists dlbjj_codigos_login (
  id            uuid primary key default uuid_generate_v4(),
  phone         text not null,
  codigo_hash   text not null,               -- sha256 de "phone:código"
  expira_em     timestamptz not null,
  tentativas    int not null default 0,
  usado_em      timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists dlbjj_codigos_login_phone_idx on dlbjj_codigos_login (phone, created_at desc);

create table if not exists dlbjj_sessoes_aluno (
  token_hash    text primary key,
  phone         text not null,
  aluno_id      uuid not null references dlbjj_alunos(id),
  expira_em     timestamptz not null,
  criado_em     timestamptz not null default now(),
  ultimo_uso_em timestamptz,
  terminada_em  timestamptz
);
create index if not exists dlbjj_sessoes_aluno_phone_idx on dlbjj_sessoes_aluno (phone);

create table if not exists dlbjj_eventos (
  id            uuid primary key default uuid_generate_v4(),
  titulo        text not null,
  descricao     text,
  dia           date not null,
  hora          time,
  local_slug    text,                        -- null = toda a academia
  cancelado_em  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists dlbjj_eventos_dia_idx on dlbjj_eventos (dia) where cancelado_em is null;

drop trigger if exists dlbjj_eventos_updated_at on dlbjj_eventos;
create trigger dlbjj_eventos_updated_at before update on dlbjj_eventos
  for each row execute function dlbjj_set_updated_at();

alter table dlbjj_alunos add column if not exists ranking_visivel boolean not null default true;

-- RLS como nas outras: a service role ignora; `anon` não lê nada.
alter table dlbjj_codigos_login  enable row level security;
alter table dlbjj_sessoes_aluno  enable row level security;
alter table dlbjj_eventos        enable row level security;
