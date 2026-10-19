-- ============================================================================
--  Fixtures para desenvolvimento e testes (corre no `supabase db reset`).
--  Leads em vários passos, quatro alunos (dois irmãos no mesmo telemóvel),
--  graduações, presenças recentes e um opt-out. As turmas são as de
--  content/site.ts, com a mesma `chave` que scripts/seed-turmas.ts produz —
--  `npm run seed:turmas:check` confirma que não divergiram.
-- ============================================================================

-- ── Turmas (chave = local_slug|turma|dias|horario) ──
insert into dlbjj_turmas (chave, local_slug, turma, dias, dias_semana, horario, tipo) values
  ('queluz|Kids|Terça e Quinta|18:30',                         'queluz',       'Kids',                     'Terça e Quinta',           '{2,4}',   '18:30', 'kids'),
  ('queluz|Kids|Sábado|10:00',                                 'queluz',       'Kids',                     'Sábado',                   '{6}',     '10:00', 'kids'),
  ('queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00',   'queluz',       'Jiu-Jitsu (Adultos)',      'Terça, Quarta e Sexta',    '{2,3,5}', '08:00', 'jiu-jitsu'),
  ('sao-bras|Jiu-Jitsu|Segunda, Quarta e Sexta|06:00',         'sao-bras',     'Jiu-Jitsu',                'Segunda, Quarta e Sexta',  '{1,3,5}', '06:00', 'jiu-jitsu'),
  ('sao-bras|Jiu-Jitsu|Segunda, Quarta e Sexta|11:00',         'sao-bras',     'Jiu-Jitsu',                'Segunda, Quarta e Sexta',  '{1,3,5}', '11:00', 'jiu-jitsu'),
  ('sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30',                'sao-bras',     'Jiu-Jitsu',                'Segunda e Quarta',         '{1,3}',   '19:30', 'jiu-jitsu'),
  ('sao-bras|Jiu-Jitsu|Segunda e Quarta|20:30',                'sao-bras',     'Jiu-Jitsu',                'Segunda e Quarta',         '{1,3}',   '20:30', 'jiu-jitsu'),
  ('sao-bras|MMA (Adultos)|Segunda, Quarta e Sexta|18:30',     'sao-bras',     'MMA (Adultos)',            'Segunda, Quarta e Sexta',  '{1,3,5}', '18:30', 'mma'),
  ('sao-bras|MMA (Adultos)|Terça e Quinta|11:00',              'sao-bras',     'MMA (Adultos)',            'Terça e Quinta',           '{2,4}',   '11:00', 'mma'),
  ('sao-bras|Jiu-Jitsu|Terça e Quinta|20:00',                  'sao-bras',     'Jiu-Jitsu',                'Terça e Quinta',           '{2,4}',   '20:00', 'jiu-jitsu'),
  ('sao-bras|Treino Livre (Gi e NoGi)|Sexta-feira|20:00',      'sao-bras',     'Treino Livre (Gi e NoGi)', 'Sexta-feira',              '{5}',     '20:00', 'misto'),
  ('kids-amadora|Kids|Segunda, Quarta e Sexta|17:30',          'kids-amadora', 'Kids',                     'Segunda, Quarta e Sexta',  '{1,3,5}', '17:30', 'kids'),
  ('kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',          'kids-amadora', 'Kids',                     'Segunda, Quarta e Sexta',  '{1,3,5}', '18:30', 'kids'),
  ('kids-amadora|Kids|Segunda, Quarta e Sexta|19:30',          'kids-amadora', 'Kids',                     'Segunda, Quarta e Sexta',  '{1,3,5}', '19:30', 'kids')
on conflict (chave) do nothing;

-- ── Leads ──
insert into dlbjj_leads (id, phone, name, step, status, first_contact_at, last_message_at) values
  ('a0000000-0000-0000-0000-000000000001', '351910000001', 'Lead Novo', 'nome', 'novo', now() - interval '2 hours', now() - interval '2 hours')
on conflict (phone) do nothing;

insert into dlbjj_leads (id, phone, name, publico, modalidade, local_slug, step, status, first_contact_at, last_message_at) values
  ('a0000000-0000-0000-0000-000000000002', '351910000002', 'Bruno Teste', 'adulto', 'jiu-jitsu', 'sao-bras', 'horario', 'em_progresso', now() - interval '2 days', now() - interval '2 days')
on conflict (phone) do nothing;

insert into dlbjj_leads (id, phone, name, publico, modalidade, local_slug, turma, dias, horario, origem, step, status, first_contact_at, last_message_at, updated_at) values
  ('a0000000-0000-0000-0000-000000000003', '351910000003', 'Carla Teste', 'adulto', 'jiu-jitsu', 'queluz', 'Jiu-Jitsu (Adultos)', 'Terça, Quarta e Sexta', '08:00', 'google', 'concluido', 'concluido', now() - interval '12 days', now() - interval '12 days', now() - interval '12 days')
on conflict (phone) do nothing;

-- ── Alunos ──
insert into dlbjj_alunos (id, nome, data_nascimento, phone, email, nif, publico, modalidade, local_slug, inicio_em, estado, consentimento_rgpd_em, contacto_emergencia_nome, contacto_emergencia_telefone) values
  ('b0000000-0000-0000-0000-000000000001', 'Ana Silva', '1992-04-12', '351920000001', 'ana@example.com', '123456789', 'adulto', 'jiu-jitsu', 'sao-bras', '2024-02-01', 'ativo', now(), 'Pedro Silva', '351960000001'),
  ('b0000000-0000-0000-0000-000000000002', 'Rui Costa', '1988-11-30', '351920000002', null, null, 'adulto', 'jiu-jitsu', 'queluz', '2026-01-10', 'ativo', now(), null, null)
on conflict (id) do nothing;

-- Dois irmãos no mesmo telemóvel (o da encarregada de educação).
insert into dlbjj_alunos (id, nome, data_nascimento, phone, publico, modalidade, local_slug, inicio_em, estado, consentimento_rgpd_em, consentimento_imagem, enc_nome, enc_telefone, enc_relacao, condicoes_saude) values
  ('b0000000-0000-0000-0000-000000000003', 'João Pereira', '2017-08-20', '351920000003', 'kids', 'jiu-jitsu', 'kids-amadora', '2025-09-01', 'ativo', now(), true,  'Marta Pereira', '351920000003', 'mãe', 'asma leve — tem inalador na mochila'),
  ('b0000000-0000-0000-0000-000000000004', 'Inês Pereira', '2019-02-14', '351920000003', 'kids', 'jiu-jitsu', 'kids-amadora', '2026-02-01', 'ativo', now(), false, 'Marta Pereira', '351920000003', 'mãe', null)
on conflict (id) do nothing;

update dlbjj_alunos set turma_preferida = (select id from dlbjj_turmas where chave = 'sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30')
 where id = 'b0000000-0000-0000-0000-000000000001' and turma_preferida is null;
update dlbjj_alunos set turma_preferida = (select id from dlbjj_turmas where chave = 'queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00')
 where id = 'b0000000-0000-0000-0000-000000000002' and turma_preferida is null;
update dlbjj_alunos set turma_preferida = (select id from dlbjj_turmas where chave = 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30')
 where id in ('b0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004') and turma_preferida is null;

-- ── Graduações ──
insert into dlbjj_graduacoes (aluno_id, faixa, graus, atribuida_em, nota)
select v.aluno_id::uuid, v.faixa, v.graus, v.atribuida_em::date, v.nota
  from (values
    ('b0000000-0000-0000-0000-000000000001', 'branca',   0, '2024-02-01', 'inscrição'),
    ('b0000000-0000-0000-0000-000000000001', 'azul',     0, '2025-06-14', null),
    ('b0000000-0000-0000-0000-000000000001', 'azul',     1, '2026-03-01', '1.º grau'),
    ('b0000000-0000-0000-0000-000000000002', 'branca',   0, '2026-01-10', 'inscrição'),
    ('b0000000-0000-0000-0000-000000000003', 'branca',   0, '2025-09-01', 'inscrição'),
    ('b0000000-0000-0000-0000-000000000003', 'cinzenta', 0, '2026-05-10', null),
    ('b0000000-0000-0000-0000-000000000004', 'branca',   0, '2026-02-01', 'inscrição')
  ) as v(aluno_id, faixa, graus, atribuida_em, nota)
 where not exists (select 1 from dlbjj_graduacoes g where g.aluno_id = v.aluno_id::uuid);

-- ── Presenças (últimos 30 dias; 20 linhas) ──
insert into dlbjj_presencas (aluno_id, turma_id, data, origem)
select v.aluno_id::uuid, t.id, current_date - v.ha_dias, v.origem
  from (values
    ('b0000000-0000-0000-0000-000000000001', 'sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30',          2,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000001', 'sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30',          4,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000001', 'sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30',          9,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000001', 'sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30',          11, 'painel'),
    ('b0000000-0000-0000-0000-000000000001', 'sao-bras|Jiu-Jitsu|Segunda, Quarta e Sexta|06:00',   6,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000001', 'sao-bras|Treino Livre (Gi e NoGi)|Sexta-feira|20:00', 13, 'whatsapp'),
    ('b0000000-0000-0000-0000-000000000002', 'queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00', 1,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000002', 'queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00', 3,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000002', 'queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00', 8,  'painel'),
    ('b0000000-0000-0000-0000-000000000002', 'queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00', 10, 'whatsapp'),
    ('b0000000-0000-0000-0000-000000000002', 'queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00', 15, 'whatsapp'),
    ('b0000000-0000-0000-0000-000000000003', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    1,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000003', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    3,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000003', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    5,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000003', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    8,  'painel'),
    ('b0000000-0000-0000-0000-000000000003', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    10, 'whatsapp'),
    ('b0000000-0000-0000-0000-000000000003', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    12, 'whatsapp'),
    ('b0000000-0000-0000-0000-000000000004', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    1,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000004', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    5,  'whatsapp'),
    ('b0000000-0000-0000-0000-000000000004', 'kids-amadora|Kids|Segunda, Quarta e Sexta|18:30',    12, 'whatsapp')
  ) as v(aluno_id, chave, ha_dias, origem)
  join dlbjj_turmas t on t.chave = v.chave
on conflict (aluno_id, turma_id, data) do nothing;

-- ── Um opt-out (número que pediu para não receber mais) ──
insert into dlbjj_opt_outs (phone_hash, motivo)
values (encode(digest('351930000009', 'sha256'), 'hex'), 'fixture')
on conflict (phone_hash) do nothing;
