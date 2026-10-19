-- ============================================================================
--  Academia DL-BJJ — correções da revisão do ramo agente-openwa
--
--  1. dlbjj_toques.fila_id deixa de bloquear a limpeza da fila (90 dias):
--     ao apagar a linha da fila, o toque fica com fila_id a null.
--  2. Um toque pode ficar `cancelada` (interruptor, opt-out, a pessoa escreveu
--     antes de sair) — antes ficava `na_fila` para sempre e contava como feito.
--  3. dlbjj_terminar_fila(pendente) limpa envio_iniciado_em: uma linha que
--     volta à fila para nova tentativa tem de ser reclamável outra vez.
--
--  Idempotente e aditiva: pode correr outra vez; a 003 fica como está.
-- ============================================================================

alter table dlbjj_toques drop constraint if exists dlbjj_toques_fila_id_fkey;
alter table dlbjj_toques add constraint dlbjj_toques_fila_id_fkey
  foreign key (fila_id) references dlbjj_fila_saida(id) on delete set null;

alter table dlbjj_toques drop constraint if exists dlbjj_toques_estado_check;
alter table dlbjj_toques add constraint dlbjj_toques_estado_check
  check (estado in ('na_fila','enviada','falhou','saltada','cancelada'));

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
     set estado            = p_estado,
         wa_message_id     = coalesce(p_wa_message_id, wa_message_id),
         erro              = p_erro,
         enviar_apos       = coalesce(p_enviar_apos, enviar_apos),
         tentativas        = case when p_estado = 'cancelada' then tentativas else tentativas + 1 end,
         envio_iniciado_em = case when p_estado = 'pendente' then null else envio_iniciado_em end,
         locked_by         = null,
         locked_at         = null
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

  -- O toque de reativação acompanha o destino da linha (ver lib/reativacao/regras.ts).
  update dlbjj_toques
     set estado = case p_estado
                    when 'enviada'      then 'enviada'
                    when 'falhou'       then 'falhou'
                    when 'desconhecido' then 'falhou'
                    when 'cancelada'    then 'cancelada'
                    else estado
                  end,
         enviada_em = case when p_estado = 'enviada' then now() else enviada_em end
   where fila_id = p_id and estado = 'na_fila';
end;
$$ language plpgsql;
