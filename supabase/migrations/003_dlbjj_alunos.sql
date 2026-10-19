-- ============================================================================
--  Academia DL-BJJ — alunos, presenças, fila de saída, reativação, tokens
--
--  Terceira migração. Acrescenta ao esquema do agente de onboarding (001/002)
--  tudo o que a spec `dlbjj-build-spec.md` §7 pede: alunos e graduações,
--  turmas semeadas a partir de content/site.ts, presenças, a fila de saída
--  (a ÚNICA porta por onde sai uma mensagem — §6.1), toques de reativação,
--  opt-outs, tokens, orçamento diário, estado da sessão, cartas mortas,
--  limites de pedidos e o registo das perguntas do painel.
--
--  Idempotente: pode correr outra vez sem problema.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ───────────────────────────── Leads (001) — colunas novas ─────────────────
alter table dlbjj_leads add column if not exists humano_ate          timestamptz;
alter table dlbjj_leads add column if not exists ultima_regra        text;
alter table dlbjj_leads add column if not exists respondeu_regra_em  timestamptz;

alter table dlbjj_leads drop constraint if exists dlbjj_leads_status_check;
alter table dlbjj_leads add constraint dlbjj_leads_status_check
  check (status in ('novo','em_progresso','concluido','inscrito','humano','perdido','descartado'));

-- ───────────────────────────── Mensagens (001) — colunas novas ─────────────
alter table dlbjj_mensagens add column if not exists fila_id      uuid;
alter table dlbjj_mensagens add column if not exists entregue_em  timestamptz;
alter table dlbjj_mensagens add column if not exists lido_em      timestamptz;
alter table dlbjj_mensagens add column if not exists estado       text;
alter table dlbjj_mensagens drop constraint if exists dlbjj_mensagens_estado_check;
alter table dlbjj_mensagens add constraint dlbjj_mensagens_estado_check
  check (estado is null or estado in ('na_fila','enviada','entregue','lida','falhou','desconhecido','cancelada'));

-- ───────────────────────────── Turmas (semeadas de content/site.ts) ────────
create table if not exists dlbjj_turmas (
  id           uuid primary key default uuid_generate_v4(),
  chave        text not null unique,            -- local_slug|turma|dias|horario
  local_slug   text not null,
  turma        text not null,
  dias         text not null,                   -- verbatim de site.ts
  dias_semana  int[] not null,                  -- ISO: 1 = segunda … 7 = domingo
  horario      time not null,
  tipo         text not null check (tipo in ('kids','jiu-jitsu','mma','misto')),
  ativa        boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists dlbjj_turmas_local_idx on dlbjj_turmas (local_slug) where ativa;

-- ───────────────────────────── Alunos ───────────────────────────────────────
create table if not exists dlbjj_alunos (
  id                              uuid primary key default uuid_generate_v4(),
  nome                            text not null,
  data_nascimento                 date,
  phone                           text not null,                 -- contacto WhatsApp; irmãos partilham
  email                           text,
  morada                          text,
  nif                             text,
  publico                         text check (publico in ('kids','adulto')),
  modalidade                      text check (modalidade in ('jiu-jitsu','nogi','mma')),
  local_slug                      text,
  turma_preferida                 uuid references dlbjj_turmas(id),
  experiencia_previa              text,
  enc_nome                        text,
  enc_telefone                    text,
  enc_relacao                     text,
  contacto_emergencia_nome        text,
  contacto_emergencia_telefone    text,
  condicoes_saude                 text,
  consentimento_rgpd_em           timestamptz,
  consentimento_imagem            boolean not null default false,
  inicio_em                       date,
  estado                          text not null default 'ativo'
                                    check (estado in ('ativo','inativo','ex_aluno','anonimizado')),
  notas                           text,
  lead_id                         uuid references dlbjj_leads(id),
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);
create index if not exists dlbjj_alunos_phone_idx  on dlbjj_alunos (phone);
create index if not exists dlbjj_alunos_estado_idx on dlbjj_alunos (estado, local_slug);

alter table dlbjj_leads add column if not exists aluno_id uuid references dlbjj_alunos(id);

drop trigger if exists dlbjj_alunos_updated_at on dlbjj_alunos;
create trigger dlbjj_alunos_updated_at before update on dlbjj_alunos
  for each row execute function dlbjj_set_updated_at();

-- ───────────────────────────── Graduações (só acrescentar) ─────────────────
create table if not exists dlbjj_graduacoes (
  id            uuid primary key default uuid_generate_v4(),
  aluno_id      uuid not null references dlbjj_alunos(id),
  faixa         text not null check (faixa in ('branca','cinzenta','amarela','laranja','verde','azul','roxa','castanha','preta')),
  graus         int  not null default 0 check (graus between 0 and 4),
  atribuida_em  date not null,
  nota          text,
  created_at    timestamptz not null default now()
);
create index if not exists dlbjj_graduacoes_aluno_idx on dlbjj_graduacoes (aluno_id, atribuida_em desc, created_at desc);

-- ───────────────────────────── Presenças ────────────────────────────────────
create table if not exists dlbjj_presencas (
  id          uuid primary key default uuid_generate_v4(),
  aluno_id    uuid not null references dlbjj_alunos(id),
  turma_id    uuid not null references dlbjj_turmas(id),
  data        date not null,
  origem      text not null check (origem in ('whatsapp','painel')),
  created_at  timestamptz not null default now(),
  unique (aluno_id, turma_id, data)
);
create index if not exists dlbjj_presencas_turma_idx on dlbjj_presencas (turma_id, data desc);
create index if not exists dlbjj_presencas_aluno_idx on dlbjj_presencas (aluno_id, data desc);

-- ───────────────────────────── Fila de saída (a única porta) ───────────────
create table if not exists dlbjj_fila_saida (
  id                  uuid primary key default uuid_generate_v4(),
  phone               text not null,
  lead_id             uuid references dlbjj_leads(id),
  aluno_id            uuid references dlbjj_alunos(id),
  kind                text not null check (kind in ('resposta','sistema','proativa','humano')),
  regra               text,
  corpo               text not null,
  estado              text not null default 'pendente'
                        check (estado in ('pendente','a_enviar','enviada','falhou','cancelada','desconhecido')),
  enviar_apos         timestamptz not null default now(),
  tentativas          int not null default 0,
  erro                text,
  locked_by           text,
  locked_at           timestamptz,
  envio_iniciado_em   timestamptz,
  wa_message_id       text,
  mensagem_id         uuid references dlbjj_mensagens(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists dlbjj_fila_pendente_idx on dlbjj_fila_saida (enviar_apos) where estado in ('pendente','a_enviar');
create index if not exists dlbjj_fila_phone_idx on dlbjj_fila_saida (phone, created_at desc);

drop trigger if exists dlbjj_fila_saida_updated_at on dlbjj_fila_saida;
create trigger dlbjj_fila_saida_updated_at before update on dlbjj_fila_saida
  for each row execute function dlbjj_set_updated_at();

-- ───────────────────────────── Toques de reativação ────────────────────────
create table if not exists dlbjj_toques (
  id            uuid primary key default uuid_generate_v4(),
  phone         text not null,
  lead_id       uuid references dlbjj_leads(id),
  aluno_id      uuid references dlbjj_alunos(id),
  regra         text not null,
  fila_id       uuid references dlbjj_fila_saida(id),
  estado        text not null default 'na_fila' check (estado in ('na_fila','enviada','falhou','saltada')),
  enviada_em    timestamptz,
  respondeu_em  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists dlbjj_toques_phone_idx on dlbjj_toques (phone, regra, created_at desc);

-- ───────────────────────────── Opt-outs (para sempre) ──────────────────────
create table if not exists dlbjj_opt_outs (
  phone_hash  text primary key,                 -- sha256 hex dos dígitos
  motivo      text,
  created_at  timestamptz not null default now()
);

-- ───────────────────────────── Tokens (inscrição / perfil) ─────────────────
create table if not exists dlbjj_tokens (
  token_hash   text primary key,                -- sha256 hex do token
  kind         text not null check (kind in ('inscricao','perfil')),
  lead_id      uuid references dlbjj_leads(id),
  aluno_id     uuid references dlbjj_alunos(id),
  expira_em    timestamptz not null,
  usado_em     timestamptz,
  revogado_em  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists dlbjj_tokens_lead_idx  on dlbjj_tokens (lead_id)  where lead_id  is not null;
create index if not exists dlbjj_tokens_aluno_idx on dlbjj_tokens (aluno_id) where aluno_id is not null;

-- ───────────────────────────── Orçamento diário de envios ──────────────────
create table if not exists dlbjj_orcamento_envio (
  dia        date primary key,                  -- data de Lisboa
  proativas  int not null default 0,
  respostas  int not null default 0,
  recebidas  int not null default 0
);

-- ───────────────────────────── Sessão do gateway (uma linha) ───────────────
create table if not exists dlbjj_sessao (
  id             int primary key check (id = 1),
  estado         text not null check (estado in ('ligado','instavel','caido')),
  detalhe        text,
  telefone       text,
  visto_em       timestamptz not null default now(),
  restricao_ate  timestamptz,
  enviadas_hoje  int not null default 0,
  recebidas_hoje int not null default 0
);

-- ───────────────────────────── Entradas que a app não aceitou ──────────────
create table if not exists dlbjj_entradas_falhadas (
  id           uuid primary key default uuid_generate_v4(),
  delivery_id  text not null unique,
  payload      jsonb not null,
  tentativas   int not null default 0,
  proxima_em   timestamptz not null default now(),
  erro         text,
  resolvida_em timestamptz,
  created_at   timestamptz not null default now()
);

-- ───────────────────────────── Limites de pedidos ──────────────────────────
create table if not exists dlbjj_limites (
  chave      text primary key,                  -- rota:ip:janela
  contagem   int not null default 0,
  expira_em  timestamptz not null
);

-- ───────────────────────────── Perguntas do painel ─────────────────────────
create table if not exists dlbjj_perguntas (
  id           uuid primary key default uuid_generate_v4(),
  pergunta     text not null,
  ferramenta   text,
  argumentos   jsonb,
  linhas       int not null default 0,
  resposta     text not null,
  duracao_ms   int not null default 0,
  created_at   timestamptz not null default now()
);

-- ───────────────────────────── Definições ──────────────────────────────────
insert into dlbjj_settings (key, value) values
  ('bot_enabled', 'on'),
  ('proativas_por_dia', '10'),
  ('janela_inicio', '09:00'),
  ('janela_fim', '21:00'),
  ('resposta_atraso_media_s', '8'),
  ('resposta_atraso_desvio_s', '3'),
  ('proativa_intervalo_medio_s', '240'),
  ('proativa_intervalo_desvio_s', '90'),
  ('digitar_wpm', '40'),
  ('humano_pausa_horas', '24'),
  ('inativo_dias', '30'),
  ('r4_dias', '14')
on conflict (key) do nothing;

-- ───────────────────────────── Só acrescentar ───────────────────────────────
-- A service role ignora o RLS, por isso a proibição tem de ser um trigger. A
-- única saída é a definição de sessão `dlbjj.anonimizar = 'on'`, que o caminho
-- de anonimização (e uma correção manual consciente) liga antes de mexer.
create or replace function dlbjj_so_acrescentar() returns trigger as $$
begin
  if coalesce(current_setting('dlbjj.anonimizar', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'dlbjj: % em % não é permitido (tabela só de acrescentar)', tg_op, tg_table_name
    using errcode = 'P0001';
end;
$$ language plpgsql;

drop trigger if exists dlbjj_graduacoes_so_acrescentar on dlbjj_graduacoes;
create trigger dlbjj_graduacoes_so_acrescentar before update or delete on dlbjj_graduacoes
  for each row execute function dlbjj_so_acrescentar();

drop trigger if exists dlbjj_presencas_so_acrescentar on dlbjj_presencas;
create trigger dlbjj_presencas_so_acrescentar before update or delete on dlbjj_presencas
  for each row execute function dlbjj_so_acrescentar();

drop trigger if exists dlbjj_opt_outs_so_acrescentar on dlbjj_opt_outs;
create trigger dlbjj_opt_outs_so_acrescentar before update or delete on dlbjj_opt_outs
  for each row execute function dlbjj_so_acrescentar();

-- Toques mudam de estado (na_fila → enviada, respondeu_em); só a remoção é proibida.
drop trigger if exists dlbjj_toques_so_acrescentar on dlbjj_toques;
create trigger dlbjj_toques_so_acrescentar before delete on dlbjj_toques
  for each row execute function dlbjj_so_acrescentar();

-- ───────────────────────────── Fila: reclamar / terminar / libertar ────────
-- Reclama até 5 linhas prontas. Uma linha `a_enviar` com lease expirado e sem
-- envio iniciado volta a ser reclamável (worker que morreu antes de enviar).
-- Uma linha com `envio_iniciado_em` NUNCA é reclamada aqui: é o worker, no
-- arranque, que a fecha como `desconhecido` (§6.6, §14).
create or replace function dlbjj_reclamar_fila(p_worker text, p_agora timestamptz, p_ttl interval)
returns setof dlbjj_fila_saida as $$
  with candidatas as (
    select f.id
      from dlbjj_fila_saida f
     where f.enviar_apos <= p_agora
       and f.envio_iniciado_em is null
       and (
             f.estado = 'pendente'
          or (f.estado = 'a_enviar' and f.locked_at is not null and f.locked_at < p_agora - p_ttl)
       )
       and not (
             f.kind = 'proativa'
         and exists (select 1 from dlbjj_opt_outs o where o.phone_hash = encode(digest(f.phone, 'sha256'), 'hex'))
       )
     order by f.enviar_apos
     limit 5
     for update skip locked
  )
  update dlbjj_fila_saida f
     set estado = 'a_enviar', locked_by = p_worker, locked_at = p_agora
    from candidatas c
   where f.id = c.id
  returning f.*;
$$ language sql;

-- Fecha uma tentativa. `tentativas` sobe em todas as saídas menos `cancelada`.
-- `pendente` com `p_enviar_apos` = nova tentativa mais tarde (backoff).
create or replace function dlbjj_terminar_fila(
  p_id uuid,
  p_estado text,
  p_wa_message_id text default null,
  p_erro text default null,
  p_enviar_apos timestamptz default null
) returns void as $$
declare
  v_mensagem uuid;
begin
  update dlbjj_fila_saida
     set estado        = p_estado,
         wa_message_id = coalesce(p_wa_message_id, wa_message_id),
         erro          = p_erro,
         enviar_apos   = coalesce(p_enviar_apos, enviar_apos),
         tentativas    = case when p_estado = 'cancelada' then tentativas else tentativas + 1 end,
         locked_by     = null,
         locked_at     = null
   where id = p_id
  returning mensagem_id into v_mensagem;

  if v_mensagem is not null then
    update dlbjj_mensagens
       set wa_message_id = coalesce(p_wa_message_id, wa_message_id),
           estado = case p_estado
                      when 'enviada'      then 'enviada'
                      when 'falhou'       then 'falhou'
                      when 'desconhecido' then 'desconhecido'
                      when 'cancelada'    then 'cancelada'
                      else 'na_fila'
                    end
     where id = v_mensagem;
  end if;
end;
$$ language plpgsql;

-- Devolve à fila tudo o que este worker tinha reclamado e ainda não começou a
-- enviar. O que já começou fica como está (fechado no próximo arranque).
create or replace function dlbjj_libertar_fila(p_worker text) returns int as $$
declare n int;
begin
  update dlbjj_fila_saida
     set estado = 'pendente', locked_by = null, locked_at = null
   where locked_by = p_worker and estado = 'a_enviar' and envio_iniciado_em is null;
  get diagnostics n = row_count;
  return n;
end;
$$ language plpgsql;

-- Incremento atómico do orçamento do dia.
create or replace function dlbjj_incrementar_orcamento(p_dia date, p_campo text) returns void as $$
begin
  insert into dlbjj_orcamento_envio (dia) values (p_dia) on conflict (dia) do nothing;
  if p_campo = 'proativas' then
    update dlbjj_orcamento_envio set proativas = proativas + 1 where dia = p_dia;
  elsif p_campo = 'respostas' then
    update dlbjj_orcamento_envio set respostas = respostas + 1 where dia = p_dia;
  elsif p_campo = 'recebidas' then
    update dlbjj_orcamento_envio set recebidas = recebidas + 1 where dia = p_dia;
  else
    raise exception 'campo desconhecido: %', p_campo;
  end if;
end;
$$ language plpgsql;

-- Contador de limites (rota:ip:janela). Devolve a contagem após incrementar.
create or replace function dlbjj_contar_limite(p_chave text, p_janela interval) returns int as $$
declare v int;
begin
  insert into dlbjj_limites (chave, contagem, expira_em)
       values (p_chave, 1, now() + p_janela)
  on conflict (chave) do update
       set contagem  = case when dlbjj_limites.expira_em < now() then 1 else dlbjj_limites.contagem + 1 end,
           expira_em = case when dlbjj_limites.expira_em < now() then now() + p_janela else dlbjj_limites.expira_em end
  returning contagem into v;
  return v;
end;
$$ language plpgsql;

-- ───────────────────────────── RLS: nada para anon/authenticated ───────────
alter table dlbjj_turmas             enable row level security;
alter table dlbjj_alunos             enable row level security;
alter table dlbjj_graduacoes         enable row level security;
alter table dlbjj_presencas          enable row level security;
alter table dlbjj_fila_saida         enable row level security;
alter table dlbjj_toques             enable row level security;
alter table dlbjj_opt_outs           enable row level security;
alter table dlbjj_tokens             enable row level security;
alter table dlbjj_orcamento_envio    enable row level security;
alter table dlbjj_sessao             enable row level security;
alter table dlbjj_entradas_falhadas  enable row level security;
alter table dlbjj_limites            enable row level security;
alter table dlbjj_perguntas          enable row level security;
