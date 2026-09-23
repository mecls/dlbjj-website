-- ============================================================================
--  Academia DL-BJJ — fechar a leitura pública das leads
--
--  A migração 001 deu à role `anon` `select using (true)` em dlbjj_leads e
--  dlbjj_mensagens, para o painel poder subscrever o realtime com a chave
--  pública. O efeito colateral é que essa chave é NEXT_PUBLIC_ — viaja para o
--  browser — e com ela qualquer pessoa lia, pela API REST do Supabase, todos os
--  nomes, telefones e conversas. É dado pessoal: RGPD.
--
--  O painel deixou de precisar disso: passou a atualizar por polling do lado do
--  servidor (ver components/painel/realtime-refresher.tsx), onde a leitura é
--  feita com a service role. Nada no browser fala com o Supabase.
--
--  Idempotente — pode correr outra vez sem problema.
-- ============================================================================

-- ─── Tirar as políticas de leitura anónima ───
drop policy if exists dlbjj_anon_read_leads     on dlbjj_leads;
drop policy if exists dlbjj_anon_read_mensagens on dlbjj_mensagens;
drop policy if exists dlbjj_anon_read_settings  on dlbjj_settings;

-- Sem política permissiva, e com RLS ligado, `anon` e `authenticated` não leem
-- nada. A service role ignora o RLS por natureza, por isso o motor e o painel
-- continuam a funcionar exatamente na mesma.
alter table dlbjj_leads     enable row level security;
alter table dlbjj_mensagens enable row level security;
alter table dlbjj_settings  enable row level security;

-- ─── Tirar as tabelas da publicação de realtime ───
-- Já não são subscritas por ninguém. Sem isto, ficavam a ser difundidas para um
-- canal que nenhum cliente pode ler — trabalho e superfície sem uso.
do $$
begin
  alter publication supabase_realtime drop table dlbjj_leads;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime drop table dlbjj_mensagens;
exception when others then null;
end $$;

-- ─── Verificação ───
-- Deve devolver zero linhas. Se devolver alguma, ficou uma política aberta:
--
--   select tablename, policyname, roles
--     from pg_policies
--    where tablename like 'dlbjj_%';
