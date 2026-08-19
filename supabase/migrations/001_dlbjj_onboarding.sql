-- ============================================================================
--  Academia DL-BJJ — agente de onboarding no WhatsApp
--  Corre no MESMO projeto Supabase da waldi. Todas as tabelas têm prefixo
--  `dlbjj_` para coexistirem com as tabelas do waldi-mvp (occurrences, messages,
--  technicians, ...) sem colisões.
-- ============================================================================

-- Já criada pela migração da waldi; guardamos com "if not exists".
create extension if not exists "uuid-ossp";

-- ─── Leads (ficha de cliente + estado da conversa) ───
-- Uma linha por número. É ao mesmo tempo o CRM e a máquina de estados.
create table if not exists dlbjj_leads (
  id                uuid primary key default uuid_generate_v4(),
  phone             text not null unique,                 -- E.164, só dígitos (ex: 351912345678)
  name              text,
  publico           text check (publico in ('kids','adulto')),
  modalidade        text check (modalidade in ('jiu-jitsu','nogi','mma')),
  local_slug        text,                                 -- 'queluz' | 'sao-bras' | 'kids-amadora'
  turma             text,                                 -- verbatim de content/site.ts (aulas)
  dias              text,                                 -- verbatim
  horario           text,                                 -- verbatim
  origem            text,                                 -- instagram | google | recomendacao | porta | outro
  step              text not null default 'inicio',       -- nó atual da máquina de estados
  collected         jsonb not null default '{}',          -- notas / valores em bruto
  status            text not null default 'novo'
                      check (status in ('novo','em_progresso','concluido','humano','descartado')),
  paused            boolean not null default false,       -- humano (Daniel) assumiu a conversa
  human_reason      text,
  first_contact_at  timestamptz not null default now(),
  last_message_at   timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists dlbjj_leads_status_idx on dlbjj_leads (status);
create index if not exists dlbjj_leads_last_msg_idx on dlbjj_leads (last_message_at desc);

-- ─── Mensagens (log append-only da conversa) ───
create table if not exists dlbjj_mensagens (
  id             uuid primary key default uuid_generate_v4(),
  lead_id        uuid references dlbjj_leads(id) on delete cascade,
  phone          text not null,
  direction      text not null check (direction in ('in','out')),
  role           text not null check (role in ('lead','bot','humano')),
  body           text not null default '',
  media_url      text,
  wa_message_id  text unique,                             -- idempotência (a Meta reentrega webhooks)
  created_at     timestamptz not null default now()
);

create index if not exists dlbjj_mensagens_lead_idx on dlbjj_mensagens (lead_id, created_at);
create index if not exists dlbjj_mensagens_phone_idx on dlbjj_mensagens (phone, created_at);

-- ─── Definições globais (ex: ligar/desligar o bot) ───
create table if not exists dlbjj_settings (
  key    text primary key,
  value  text not null
);

insert into dlbjj_settings (key, value) values ('bot_enabled', 'on')
  on conflict (key) do nothing;

-- ─── updated_at trigger (nome próprio para não mexer no set_updated_at() da waldi) ───
create or replace function dlbjj_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dlbjj_leads_updated_at on dlbjj_leads;
create trigger dlbjj_leads_updated_at before update on dlbjj_leads
  for each row execute function dlbjj_set_updated_at();

-- ─── RLS: anon pode LER (realtime do painel); escritas só via service role ───
alter table dlbjj_leads     enable row level security;
alter table dlbjj_mensagens enable row level security;
alter table dlbjj_settings  enable row level security;

drop policy if exists dlbjj_anon_read_leads on dlbjj_leads;
drop policy if exists dlbjj_anon_read_mensagens on dlbjj_mensagens;
drop policy if exists dlbjj_anon_read_settings on dlbjj_settings;
create policy dlbjj_anon_read_leads     on dlbjj_leads     for select using (true);
create policy dlbjj_anon_read_mensagens on dlbjj_mensagens for select using (true);
create policy dlbjj_anon_read_settings  on dlbjj_settings  for select using (true);

-- ─── Realtime: o painel subscreve estas tabelas ───
alter publication supabase_realtime add table dlbjj_leads;
alter publication supabase_realtime add table dlbjj_mensagens;
