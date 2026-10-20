-- ============================================================================
--  Academia DL-BJJ — ajustes do painel (design: docs/superpowers/specs/2026-10-20-painel-ajustes-design.md)
--
--  dlbjj_resumos — o resumo de uma conversa escrito pelo modelo a pedido do
--  Daniel. Tabela própria, e não uma coluna em dlbjj_leads: um UPDATE à lead
--  mexia em updated_at, que a regra de reativação R3 lê, e cada resumo
--  empurrava um toque 10 dias para a frente.
--
--  Idempotente e aditiva.
-- ============================================================================

create table if not exists dlbjj_resumos (
  lead_id    uuid primary key references dlbjj_leads(id) on delete cascade,
  situacao   text not null,
  quer       text not null,
  mensagens  int not null,
  ate        timestamptz not null,            -- created_at da última mensagem lida
  em         timestamptz not null default now()
);

alter table dlbjj_resumos enable row level security;
