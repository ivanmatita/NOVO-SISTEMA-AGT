ALTER TABLE public._health ADD COLUMN IF NOT EXISTS check_time timestamp with time zone DEFAULT now();
ALTER TABLE public.agro_animais ADD COLUMN IF NOT EXISTS especie text;
ALTER TABLE public.agro_culturas ADD COLUMN IF NOT EXISTS area numeric;
ALTER TABLE public.agro_culturas ADD COLUMN IF NOT EXISTS cultura text;
ALTER TABLE public.agro_culturas ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.agro_custos ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.agro_custos ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.agro_fazendas ADD COLUMN IF NOT EXISTS area numeric;
ALTER TABLE public.agro_fazendas ADD COLUMN IF NOT EXISTS localizacao text;
ALTER TABLE public.agro_insumos ADD COLUMN IF NOT EXISTS custo numeric;
ALTER TABLE public.agro_insumos ADD COLUMN IF NOT EXISTS quantidade numeric;
ALTER TABLE public.agro_maquinaria ADD COLUMN IF NOT EXISTS estado text DEFAULT 'operacional'::text;
ALTER TABLE public.agro_vendas_agro ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.agro_vendas_agro ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.agt_audit_log ADD COLUMN IF NOT EXISTS acao text;
ALTER TABLE public.agt_audit_log ADD COLUMN IF NOT EXISTS detalhes jsonb;
ALTER TABLE public.agt_audit_log ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.agt_audit_trail ADD COLUMN IF NOT EXISTS detalhes jsonb;
ALTER TABLE public.agt_audit_trail ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.agt_audit_trail ADD COLUMN IF NOT EXISTS evento text;
ALTER TABLE public.agt_certificates ADD COLUMN IF NOT EXISTS certificado text;
ALTER TABLE public.agt_certificates ADD COLUMN IF NOT EXISTS valido_ate timestamp with time zone;
ALTER TABLE public.agt_document_state_history ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.agt_document_state_history ADD COLUMN IF NOT EXISTS estado_anterior text;
ALTER TABLE public.agt_document_state_history ADD COLUMN IF NOT EXISTS estado_novo text;
ALTER TABLE public.agt_document_state_history ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.agt_documents ADD COLUMN IF NOT EXISTS agt_payload jsonb;
ALTER TABLE public.agt_documents ADD COLUMN IF NOT EXISTS agt_response jsonb;
ALTER TABLE public.agt_documents ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.agt_documents ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendente'::text;
ALTER TABLE public.agt_errors ADD COLUMN IF NOT EXISTS erro text;
ALTER TABLE public.agt_errors ADD COLUMN IF NOT EXISTS operacao text;
ALTER TABLE public.agt_logs ADD COLUMN IF NOT EXISTS erro text;
ALTER TABLE public.agt_logs ADD COLUMN IF NOT EXISTS operacao text;
ALTER TABLE public.agt_logs ADD COLUMN IF NOT EXISTS request_payload jsonb;
ALTER TABLE public.agt_logs ADD COLUMN IF NOT EXISTS response_payload jsonb;
ALTER TABLE public.agt_logs ADD COLUMN IF NOT EXISTS sucesso boolean DEFAULT false;
ALTER TABLE public.agt_notifications ADD COLUMN IF NOT EXISTS lida boolean DEFAULT false;
ALTER TABLE public.agt_notifications ADD COLUMN IF NOT EXISTS mensagem text;
ALTER TABLE public.agt_notifications ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.agt_outbox ADD COLUMN IF NOT EXISTS enviado boolean DEFAULT false;
ALTER TABLE public.agt_outbox ADD COLUMN IF NOT EXISTS evento text;
ALTER TABLE public.agt_outbox ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.agt_payload_history ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.agt_queue ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.agt_queue ADD COLUMN IF NOT EXISTS erro text;
ALTER TABLE public.agt_queue ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendente'::text;
ALTER TABLE public.agt_queue ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.agt_queue ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;
ALTER TABLE public.agt_queue ADD COLUMN IF NOT EXISTS tentativas integer DEFAULT 0;
ALTER TABLE public.agt_queue ADD COLUMN IF NOT EXISTS tipo_operacao text;
ALTER TABLE public.agt_rate_limits ADD COLUMN IF NOT EXISTS contagem integer DEFAULT 0;
ALTER TABLE public.agt_rate_limits ADD COLUMN IF NOT EXISTS endpoint text;
ALTER TABLE public.agt_rate_limits ADD COLUMN IF NOT EXISTS janela_inicio timestamp with time zone;
ALTER TABLE public.agt_requests ADD COLUMN IF NOT EXISTS status_code integer;
ALTER TABLE public.agt_responses ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.agt_responses ADD COLUMN IF NOT EXISTS response jsonb;
ALTER TABLE public.agt_retry_queue ADD COLUMN IF NOT EXISTS operacao text;
ALTER TABLE public.agt_retry_queue ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.agt_retry_queue ADD COLUMN IF NOT EXISTS proximo_retry timestamp with time zone;
ALTER TABLE public.agt_retry_queue ADD COLUMN IF NOT EXISTS tentativas integer DEFAULT 0;
ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS agt_id text;
ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.agt_signatures ADD COLUMN IF NOT EXISTS algoritmo text DEFAULT 'RS256'::text;
ALTER TABLE public.agt_signatures ADD COLUMN IF NOT EXISTS assinatura text;
ALTER TABLE public.agt_signatures ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.agt_validations ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.agt_validations ADD COLUMN IF NOT EXISTS hash text;
ALTER TABLE public.agt_validations ADD COLUMN IF NOT EXISTS response jsonb;
ALTER TABLE public.agt_validations ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente'::text;
ALTER TABLE public.agt_webhook_logs ADD COLUMN IF NOT EXISTS status_code integer;
ALTER TABLE public.agt_webhook_logs ADD COLUMN IF NOT EXISTS webhook_id uuid;
ALTER TABLE public.agt_webhooks ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.agt_webhooks ADD COLUMN IF NOT EXISTS eventos text[];
ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS data_fim date;
ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo'::text;
ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.apuramentos_iva ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendente'::text;
ALTER TABLE public.apuramentos_iva ADD COLUMN IF NOT EXISTS iva_apurado numeric DEFAULT 0;
ALTER TABLE public.apuramentos_iva ADD COLUMN IF NOT EXISTS iva_cobrado numeric DEFAULT 0;
ALTER TABLE public.apuramentos_iva ADD COLUMN IF NOT EXISTS iva_pago numeric DEFAULT 0;
ALTER TABLE public.apuramentos_iva ADD COLUMN IF NOT EXISTS periodo text;
ALTER TABLE public.arquivos ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.arquivos ADD COLUMN IF NOT EXISTS tamanho bigint;
ALTER TABLE public.arquivos ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS estado text DEFAULT 'rascunho'::text;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'carta'::text;
ALTER TABLE public.church_dizimos_ofertas ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.church_dizimos_ofertas ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.church_eventos ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.church_eventos ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.church_membros ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo'::text;
ALTER TABLE public.church_ministerios ADD COLUMN IF NOT EXISTS lider text;
ALTER TABLE public.church_patrimonio ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.church_patrimonio ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS morada text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'singular'::text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS aprovado_por text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS caixa text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'AO'::text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS currency text DEFAULT 'AOA'::text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS global_discount numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS hash_documento text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS local_obra text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS nif text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS reference_document text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS reference_purchase_number text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS service_date date;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS supplier_nif text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS tem_recibo boolean DEFAULT false;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS total_geral numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS total_iva numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS total_sem_iva numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS work_site text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS work_site_name text;
ALTER TABLE public.contas_pag_impostos ADD COLUMN IF NOT EXISTS conta text;
ALTER TABLE public.contas_pag_impostos ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.contas_pag_impostos ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.diarios_contabeis ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS agt_hash text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS agt_qr_code text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS agt_status text DEFAULT 'pendente'::text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS agt_validated_at timestamp with time zone;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS atualizado_em timestamp with time zone;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS atualizado_por text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS cash_box uuid;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS client_nif text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS cliente_nif text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS company_logo text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS counter_value numeric DEFAULT 0;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS data_recibo timestamp with time zone;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS exercicio_id uuid;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS forma_pagamento text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS itens jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS iva_total numeric DEFAULT 0;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS logotipo text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_recibo text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS recibo_emitido boolean DEFAULT false;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS reference_document text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS saldo_pendente numeric DEFAULT 0;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS serie_id uuid;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS tipo_documento_codigo text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS valor_pago numeric DEFAULT 0;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS valor_total numeric DEFAULT 0;
ALTER TABLE public.documentos_empresa ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.documentos_empresa ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.documentos_empresa ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.documentos_empresa ADD COLUMN IF NOT EXISTS validade date;
ALTER TABLE public.documentos_relacionados ADD COLUMN IF NOT EXISTS documento_destino_id uuid;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS anexo_image_url text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_primaria text DEFAULT '#003366'::text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_secundaria text DEFAULT '#002244'::text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS data_expiracao_licenca timestamp with time zone;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS documento_modelo text DEFAULT 'A4'::text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS exibir_cabecalho boolean DEFAULT true;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS exibir_marca_dagua boolean DEFAULT true;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS exibir_rodape boolean DEFAULT true;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS footer_image_url text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS footer_size numeric DEFAULT 100;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS header_image_url text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS layout_fatura text DEFAULT 'classico'::text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_size numeric DEFAULT 100;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS morada text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS sidebar_image_url text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS texto_rodape text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS watermark_size numeric DEFAULT 100;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS watermark_url text;
ALTER TABLE public.escola_alunos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo'::text;
ALTER TABLE public.escola_alunos ADD COLUMN IF NOT EXISTS genero text;
ALTER TABLE public.escola_alunos ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.escola_alunos ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.escola_alunos ADD COLUMN IF NOT EXISTS turma_id uuid;
ALTER TABLE public.escola_disciplina ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.escola_disciplina ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.escola_disciplina ADD COLUMN IF NOT EXISTS professor_id uuid;
ALTER TABLE public.escola_documentos_secretaria ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.escola_documentos_secretaria ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.escola_notas ADD COLUMN IF NOT EXISTS ano_lectivo text;
ALTER TABLE public.escola_notas ADD COLUMN IF NOT EXISTS nota numeric;
ALTER TABLE public.escola_professores ADD COLUMN IF NOT EXISTS bi text;
ALTER TABLE public.escola_professores ADD COLUMN IF NOT EXISTS disciplinas text[];
ALTER TABLE public.escola_propinas ADD COLUMN IF NOT EXISTS pago boolean DEFAULT false;
ALTER TABLE public.escola_propinas ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.escola_transporte ADD COLUMN IF NOT EXISTS aluno_id uuid;
ALTER TABLE public.escola_transporte ADD COLUMN IF NOT EXISTS rota text;
ALTER TABLE public.escola_transporte ADD COLUMN IF NOT EXISTS veiculo text;
ALTER TABLE public.escola_turmas ADD COLUMN IF NOT EXISTS nivel text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE public.frota_combustivel ADD COLUMN IF NOT EXISTS custo numeric;
ALTER TABLE public.frota_combustivel ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.frota_manutencao ADD COLUMN IF NOT EXISTS custo numeric;
ALTER TABLE public.frota_manutencao ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.frota_multas ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.frota_multas ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE public.frota_multas ADD COLUMN IF NOT EXISTS pago boolean DEFAULT false;
ALTER TABLE public.frota_multas ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.frota_veiculos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo'::text;
ALTER TABLE public.frota_viagens ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.frota_viagens ADD COLUMN IF NOT EXISTS km numeric;
ALTER TABLE public.historico_licencas ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.historico_licencas ADD COLUMN IF NOT EXISTS data_fim date;
ALTER TABLE public.historico_licencas ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE public.historico_licencas ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE public.historico_licencas ADD COLUMN IF NOT EXISTS plano text;
ALTER TABLE public.hotel_housekeeping ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.hotel_housekeeping ADD COLUMN IF NOT EXISTS estado text DEFAULT 'limpo'::text;
ALTER TABLE public.hotel_quartos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'disponivel'::text;
ALTER TABLE public.hotel_reservas ADD COLUMN IF NOT EXISTS check_in date;
ALTER TABLE public.hotel_reservas ADD COLUMN IF NOT EXISTS check_out date;
ALTER TABLE public.hotel_reservas ADD COLUMN IF NOT EXISTS cliente_id uuid;
ALTER TABLE public.hotel_reservas ADD COLUMN IF NOT EXISTS estado text DEFAULT 'confirmada'::text;
ALTER TABLE public.hotel_reservas ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.hotel_servicos ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.hotel_servicos ADD COLUMN IF NOT EXISTS preco numeric;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS ano integer;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS dias_presenca integer DEFAULT 0;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS employee_id integer;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS faltas_injustificadas integer DEFAULT 0;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS faltas_justificadas integer DEFAULT 0;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS hora_entrada time without time zone;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS hora_saida time without time zone;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS horas_extra numeric DEFAULT 0;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS horas_trabalhadas numeric DEFAULT 0;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS justificacao text;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS mes text;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS status text DEFAULT 'presente'::text;
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'normal'::text;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS cargo text;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS data_fim date;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS departamento text;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS employee_id integer;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo'::text;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS funcao text;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS salario numeric;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS url_documento text;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS aprovado_por text;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS banco text;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS data_aprovacao timestamp with time zone;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS detalhes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendente'::text;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS mes_ano text;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS num_colaboradores integer DEFAULT 0;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS periodo text;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS processamento_id uuid;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS ano integer;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS banco text;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS colaborador_id integer;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS conta text;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS data_pagamento date;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS employee_id integer;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendente'::text;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS mes integer;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS metodo text DEFAULT 'transferencia'::text;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS processamento_id uuid;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS ano integer;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS data_pagamento date;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS desconto_faltas numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS detalhes jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS employee_id integer;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'rascunho'::text;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS faltas integer DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS horas_extras numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS inss_colaborador numeric;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS inss_entidade numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS inss_trabalhador numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS irt numeric;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS liquido numeric;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS mes integer;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS mes_ano text;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS outros_descontos numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS outros_subsidios numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS pago boolean DEFAULT false;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS periodo text;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS salario_base numeric;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS salario_bruto numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS salario_liquido numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS subsidio_alimentacao numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS subsidio_transporte numeric DEFAULT 0;
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS valor_horas_extras numeric DEFAULT 0;
ALTER TABLE public.impostos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendente'::text;
ALTER TABLE public.impostos ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.impostos ADD COLUMN IF NOT EXISTS periodo text;
ALTER TABLE public.impostos ADD COLUMN IF NOT EXISTS prazo date;
ALTER TABLE public.impostos ADD COLUMN IF NOT EXISTS valor_estimado numeric DEFAULT 0;
ALTER TABLE public.impostos_pagamentos ADD COLUMN IF NOT EXISTS data_pagamento date;
ALTER TABLE public.impostos_pagamentos ADD COLUMN IF NOT EXISTS imposto_id uuid;
ALTER TABLE public.impostos_pagamentos ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.lancamentos_contabeis ADD COLUMN IF NOT EXISTS conta_credito text;
ALTER TABLE public.lancamentos_contabeis ADD COLUMN IF NOT EXISTS conta_debito text;
ALTER TABLE public.lancamentos_contabeis ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.lancamentos_contabeis ADD COLUMN IF NOT EXISTS diario_id uuid;
ALTER TABLE public.lancamentos_contabeis ADD COLUMN IF NOT EXISTS documento_ref text;
ALTER TABLE public.lancamentos_contabeis ADD COLUMN IF NOT EXISTS exercicio_id uuid;
ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS modulo text;
ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS detalhes jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS periodo text;
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0;
ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS armazem_id uuid;
ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS produto_id uuid;
ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS quantidade numeric;
ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.movimentos_contabilisticos ADD COLUMN IF NOT EXISTS conta text;
ALTER TABLE public.movimentos_contabilisticos ADD COLUMN IF NOT EXISTS credito numeric DEFAULT 0;
ALTER TABLE public.movimentos_contabilisticos ADD COLUMN IF NOT EXISTS debito numeric DEFAULT 0;
ALTER TABLE public.movimentos_contabilisticos ADD COLUMN IF NOT EXISTS lancamento_id uuid;
ALTER TABLE public.nome_tabela ADD COLUMN IF NOT EXISTS dados jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS data_pagamento date;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS metodo text DEFAULT 'dinheiro'::text;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.pagamentos_impostos ADD COLUMN IF NOT EXISTS data_pagamento date;
ALTER TABLE public.pagamentos_impostos ADD COLUMN IF NOT EXISTS periodo text;
ALTER TABLE public.pagamentos_impostos ADD COLUMN IF NOT EXISTS tipo_imposto text;
ALTER TABLE public.pgc_plano_contas ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.pgc_plano_contas ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.pgc_plano_contas ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.pgc_plano_contas ADD COLUMN IF NOT EXISTS conta_pai text;
ALTER TABLE public.pgc_plano_contas ADD COLUMN IF NOT EXISTS natureza text;
ALTER TABLE public.pgc_plano_contas ADD COLUMN IF NOT EXISTS nivel integer DEFAULT 1;
ALTER TABLE public.pos_user_configs ADD COLUMN IF NOT EXISTS configuracoes jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.pos_user_configs ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4();
ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS salario_base numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'::text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.proj_equipa_recursos ADD COLUMN IF NOT EXISTS funcao text;
ALTER TABLE public.proj_equipa_recursos ADD COLUMN IF NOT EXISTS membro text;
ALTER TABLE public.proj_equipa_recursos ADD COLUMN IF NOT EXISTS projeto_id uuid;
ALTER TABLE public.proj_marcos_milestones ADD COLUMN IF NOT EXISTS concluido boolean DEFAULT false;
ALTER TABLE public.proj_marcos_milestones ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.proj_orcamentos_custos ADD COLUMN IF NOT EXISTS valor numeric;
ALTER TABLE public.proj_projetos ADD COLUMN IF NOT EXISTS data_fim date;
ALTER TABLE public.proj_projetos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo'::text;
ALTER TABLE public.proj_projetos ADD COLUMN IF NOT EXISTS orcamento numeric;
ALTER TABLE public.proj_tarefas ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.proj_tarefas ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendente'::text;
ALTER TABLE public.proj_tarefas ADD COLUMN IF NOT EXISTS prazo date;
ALTER TABLE public.proj_tarefas ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE public.proj_tarefas ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS ano_fabricacao text;
ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS estado_conservacao text DEFAULT 'Bom'::text;
ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS fabricante text;
ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS licenca_numero text;
ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS licenca_validade date;
ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS localizacao_armaria text;
ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS quantidade_municao integer DEFAULT 0;
ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS data_servico date;
ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS substituicao boolean DEFAULT false;
ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS danos_estimados numeric DEFAULT 0;
ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS envolveu_feridos boolean DEFAULT false;
ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS envolveu_policia boolean DEFAULT false;
ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS numero_relatorio text;
ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS site_id text;
ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS tipo_ocorrencia text DEFAULT 'Intrusão'::text;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS cliente_nif text;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS cliente_telefone text;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS data_fim_contrato date;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS data_inicio_contrato date;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS efetivo_minimo integer DEFAULT 1;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS instrucoes_especiais text;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS morada_completa text;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS responsavel_id text;
ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS turno_servico text DEFAULT 'Diurno'::text;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS bi_numero text;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'Vigilante Operacional'::text;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS data_nascimento date;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS matricula text;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS numero_cartao_profissional text;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS porte_arma boolean DEFAULT false;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS posto_id text;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo'::text;
ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS validade_cartao date;
ALTER TABLE public.series_fiscais_usuarios ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.sgp_armaria ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo'::text;
ALTER TABLE public.sgp_armaria_movimentos ADD COLUMN IF NOT EXISTS armaria_id uuid;
ALTER TABLE public.sgp_armaria_movimentos ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.sgp_armaria_movimentos ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.sgp_escalas ADD COLUMN IF NOT EXISTS data_fim date;
ALTER TABLE public.sgp_escalas ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE public.sgp_ocorrencias ADD COLUMN IF NOT EXISTS data timestamp with time zone;
ALTER TABLE public.sgp_ocorrencias ADD COLUMN IF NOT EXISTS gravidade text;
ALTER TABLE public.sgp_patrulhas ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.sgp_patrulhas ADD COLUMN IF NOT EXISTS percurso text;
ALTER TABLE public.sgp_vigilantes ADD COLUMN IF NOT EXISTS bi text;
ALTER TABLE public.sgp_vigilantes ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo'::text;
ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS permissoes jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'::text;
ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS ultimo_login timestamp with time zone;
ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS atividade text;
ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS duracao integer;
ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS pagina text;
ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS documento_id uuid;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS estado text DEFAULT 'concluida'::text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS metodo_pagamento text DEFAULT 'dinheiro'::text;

    ALTER TABLE public._health ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "_health_universal_access" ON public._health;
    CREATE POLICY "_health_universal_access" ON public._health FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public._health TO anon, authenticated, service_role;
  
    ALTER TABLE public.agro_animais ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agro_animais_universal_access" ON public.agro_animais;
    CREATE POLICY "agro_animais_universal_access" ON public.agro_animais FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agro_animais TO anon, authenticated, service_role;
  
    ALTER TABLE public.agro_culturas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agro_culturas_universal_access" ON public.agro_culturas;
    CREATE POLICY "agro_culturas_universal_access" ON public.agro_culturas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agro_culturas TO anon, authenticated, service_role;
  
    ALTER TABLE public.agro_custos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agro_custos_universal_access" ON public.agro_custos;
    CREATE POLICY "agro_custos_universal_access" ON public.agro_custos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agro_custos TO anon, authenticated, service_role;
  
    ALTER TABLE public.agro_fazendas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agro_fazendas_universal_access" ON public.agro_fazendas;
    CREATE POLICY "agro_fazendas_universal_access" ON public.agro_fazendas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agro_fazendas TO anon, authenticated, service_role;
  
    ALTER TABLE public.agro_insumos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agro_insumos_universal_access" ON public.agro_insumos;
    CREATE POLICY "agro_insumos_universal_access" ON public.agro_insumos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agro_insumos TO anon, authenticated, service_role;
  
    ALTER TABLE public.agro_maquinaria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agro_maquinaria_universal_access" ON public.agro_maquinaria;
    CREATE POLICY "agro_maquinaria_universal_access" ON public.agro_maquinaria FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agro_maquinaria TO anon, authenticated, service_role;
  
    ALTER TABLE public.agro_vendas_agro ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agro_vendas_agro_universal_access" ON public.agro_vendas_agro;
    CREATE POLICY "agro_vendas_agro_universal_access" ON public.agro_vendas_agro FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agro_vendas_agro TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_audit_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_audit_log_universal_access" ON public.agt_audit_log;
    CREATE POLICY "agt_audit_log_universal_access" ON public.agt_audit_log FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_audit_log TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_audit_trail ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_audit_trail_universal_access" ON public.agt_audit_trail;
    CREATE POLICY "agt_audit_trail_universal_access" ON public.agt_audit_trail FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_audit_trail TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_certificates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_certificates_universal_access" ON public.agt_certificates;
    CREATE POLICY "agt_certificates_universal_access" ON public.agt_certificates FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_certificates TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_document_state_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_document_state_history_universal_access" ON public.agt_document_state_history;
    CREATE POLICY "agt_document_state_history_universal_access" ON public.agt_document_state_history FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_document_state_history TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_documents_universal_access" ON public.agt_documents;
    CREATE POLICY "agt_documents_universal_access" ON public.agt_documents FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_documents TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_errors ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_errors_universal_access" ON public.agt_errors;
    CREATE POLICY "agt_errors_universal_access" ON public.agt_errors FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_errors TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_logs_universal_access" ON public.agt_logs;
    CREATE POLICY "agt_logs_universal_access" ON public.agt_logs FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_logs TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_notifications_universal_access" ON public.agt_notifications;
    CREATE POLICY "agt_notifications_universal_access" ON public.agt_notifications FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_notifications TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_outbox ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_outbox_universal_access" ON public.agt_outbox;
    CREATE POLICY "agt_outbox_universal_access" ON public.agt_outbox FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_outbox TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_payload_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_payload_history_universal_access" ON public.agt_payload_history;
    CREATE POLICY "agt_payload_history_universal_access" ON public.agt_payload_history FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_payload_history TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_queue ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_queue_universal_access" ON public.agt_queue;
    CREATE POLICY "agt_queue_universal_access" ON public.agt_queue FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_queue TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_rate_limits ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_rate_limits_universal_access" ON public.agt_rate_limits;
    CREATE POLICY "agt_rate_limits_universal_access" ON public.agt_rate_limits FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_rate_limits TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_requests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_requests_universal_access" ON public.agt_requests;
    CREATE POLICY "agt_requests_universal_access" ON public.agt_requests FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_requests TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_responses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_responses_universal_access" ON public.agt_responses;
    CREATE POLICY "agt_responses_universal_access" ON public.agt_responses FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_responses TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_retry_queue ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_retry_queue_universal_access" ON public.agt_retry_queue;
    CREATE POLICY "agt_retry_queue_universal_access" ON public.agt_retry_queue FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_retry_queue TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_series ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_series_universal_access" ON public.agt_series;
    CREATE POLICY "agt_series_universal_access" ON public.agt_series FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_series TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_signatures ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_signatures_universal_access" ON public.agt_signatures;
    CREATE POLICY "agt_signatures_universal_access" ON public.agt_signatures FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_signatures TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_validations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_validations_universal_access" ON public.agt_validations;
    CREATE POLICY "agt_validations_universal_access" ON public.agt_validations FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_validations TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_webhook_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_webhook_logs_universal_access" ON public.agt_webhook_logs;
    CREATE POLICY "agt_webhook_logs_universal_access" ON public.agt_webhook_logs FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_webhook_logs TO anon, authenticated, service_role;
  
    ALTER TABLE public.agt_webhooks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "agt_webhooks_universal_access" ON public.agt_webhooks;
    CREATE POLICY "agt_webhooks_universal_access" ON public.agt_webhooks FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.agt_webhooks TO anon, authenticated, service_role;
  
    ALTER TABLE public.alertas_tarefas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "alertas_tarefas_universal_access" ON public.alertas_tarefas;
    CREATE POLICY "alertas_tarefas_universal_access" ON public.alertas_tarefas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.alertas_tarefas TO anon, authenticated, service_role;
  
    ALTER TABLE public.apuramentos_iva ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "apuramentos_iva_universal_access" ON public.apuramentos_iva;
    CREATE POLICY "apuramentos_iva_universal_access" ON public.apuramentos_iva FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.apuramentos_iva TO anon, authenticated, service_role;
  
    ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "armazens_universal_access" ON public.armazens;
    CREATE POLICY "armazens_universal_access" ON public.armazens FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.armazens TO anon, authenticated, service_role;
  
    ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "arquivos_universal_access" ON public.arquivos;
    CREATE POLICY "arquivos_universal_access" ON public.arquivos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.arquivos TO anon, authenticated, service_role;
  
    ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "caixa_movimentacoes_universal_access" ON public.caixa_movimentacoes;
    CREATE POLICY "caixa_movimentacoes_universal_access" ON public.caixa_movimentacoes FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.caixa_movimentacoes TO anon, authenticated, service_role;
  
    ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "caixas_universal_access" ON public.caixas;
    CREATE POLICY "caixas_universal_access" ON public.caixas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.caixas TO anon, authenticated, service_role;
  
    ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "cartas_universal_access" ON public.cartas;
    CREATE POLICY "cartas_universal_access" ON public.cartas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.cartas TO anon, authenticated, service_role;
  
    ALTER TABLE public.church_dizimos_ofertas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "church_dizimos_ofertas_universal_access" ON public.church_dizimos_ofertas;
    CREATE POLICY "church_dizimos_ofertas_universal_access" ON public.church_dizimos_ofertas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.church_dizimos_ofertas TO anon, authenticated, service_role;
  
    ALTER TABLE public.church_eventos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "church_eventos_universal_access" ON public.church_eventos;
    CREATE POLICY "church_eventos_universal_access" ON public.church_eventos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.church_eventos TO anon, authenticated, service_role;
  
    ALTER TABLE public.church_membros ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "church_membros_universal_access" ON public.church_membros;
    CREATE POLICY "church_membros_universal_access" ON public.church_membros FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.church_membros TO anon, authenticated, service_role;
  
    ALTER TABLE public.church_ministerios ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "church_ministerios_universal_access" ON public.church_ministerios;
    CREATE POLICY "church_ministerios_universal_access" ON public.church_ministerios FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.church_ministerios TO anon, authenticated, service_role;
  
    ALTER TABLE public.church_patrimonio ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "church_patrimonio_universal_access" ON public.church_patrimonio;
    CREATE POLICY "church_patrimonio_universal_access" ON public.church_patrimonio FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.church_patrimonio TO anon, authenticated, service_role;
  
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "clientes_universal_access" ON public.clientes;
    CREATE POLICY "clientes_universal_access" ON public.clientes FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.clientes TO anon, authenticated, service_role;
  
    ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "colaboradores_universal_access" ON public.colaboradores;
    CREATE POLICY "colaboradores_universal_access" ON public.colaboradores FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.colaboradores TO anon, authenticated, service_role;
  
    ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "compras_universal_access" ON public.compras;
    CREATE POLICY "compras_universal_access" ON public.compras FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.compras TO anon, authenticated, service_role;
  
    ALTER TABLE public.config_empresa ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "config_empresa_universal_access" ON public.config_empresa;
    CREATE POLICY "config_empresa_universal_access" ON public.config_empresa FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.config_empresa TO anon, authenticated, service_role;
  
    ALTER TABLE public.configuracoes_graficas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "configuracoes_graficas_universal_access" ON public.configuracoes_graficas;
    CREATE POLICY "configuracoes_graficas_universal_access" ON public.configuracoes_graficas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.configuracoes_graficas TO anon, authenticated, service_role;
  
    ALTER TABLE public.contas_pag_impostos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "contas_pag_impostos_universal_access" ON public.contas_pag_impostos;
    CREATE POLICY "contas_pag_impostos_universal_access" ON public.contas_pag_impostos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.contas_pag_impostos TO anon, authenticated, service_role;
  
    ALTER TABLE public.diarios_contabeis ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "diarios_contabeis_universal_access" ON public.diarios_contabeis;
    CREATE POLICY "diarios_contabeis_universal_access" ON public.diarios_contabeis FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.diarios_contabeis TO anon, authenticated, service_role;
  
    ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "documentos_emitidos_universal_access" ON public.documentos_emitidos;
    CREATE POLICY "documentos_emitidos_universal_access" ON public.documentos_emitidos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.documentos_emitidos TO anon, authenticated, service_role;
  
    ALTER TABLE public.documentos_empresa ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "documentos_empresa_universal_access" ON public.documentos_empresa;
    CREATE POLICY "documentos_empresa_universal_access" ON public.documentos_empresa FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.documentos_empresa TO anon, authenticated, service_role;
  
    ALTER TABLE public.documentos_relacionados ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "documentos_relacionados_universal_access" ON public.documentos_relacionados;
    CREATE POLICY "documentos_relacionados_universal_access" ON public.documentos_relacionados FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.documentos_relacionados TO anon, authenticated, service_role;
  
    ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "empresas_universal_access" ON public.empresas;
    CREATE POLICY "empresas_universal_access" ON public.empresas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.empresas TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_alunos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_alunos_universal_access" ON public.escola_alunos;
    CREATE POLICY "escola_alunos_universal_access" ON public.escola_alunos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_alunos TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_biblioteca ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_biblioteca_universal_access" ON public.escola_biblioteca;
    CREATE POLICY "escola_biblioteca_universal_access" ON public.escola_biblioteca FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_biblioteca TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_disciplina ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_disciplina_universal_access" ON public.escola_disciplina;
    CREATE POLICY "escola_disciplina_universal_access" ON public.escola_disciplina FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_disciplina TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_documentos_secretaria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_documentos_secretaria_universal_access" ON public.escola_documentos_secretaria;
    CREATE POLICY "escola_documentos_secretaria_universal_access" ON public.escola_documentos_secretaria FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_documentos_secretaria TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_notas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_notas_universal_access" ON public.escola_notas;
    CREATE POLICY "escola_notas_universal_access" ON public.escola_notas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_notas TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_professores ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_professores_universal_access" ON public.escola_professores;
    CREATE POLICY "escola_professores_universal_access" ON public.escola_professores FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_professores TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_propinas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_propinas_universal_access" ON public.escola_propinas;
    CREATE POLICY "escola_propinas_universal_access" ON public.escola_propinas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_propinas TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_transporte ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_transporte_universal_access" ON public.escola_transporte;
    CREATE POLICY "escola_transporte_universal_access" ON public.escola_transporte FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_transporte TO anon, authenticated, service_role;
  
    ALTER TABLE public.escola_turmas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "escola_turmas_universal_access" ON public.escola_turmas;
    CREATE POLICY "escola_turmas_universal_access" ON public.escola_turmas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.escola_turmas TO anon, authenticated, service_role;
  
    ALTER TABLE public.exercicios_fiscais ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "exercicios_fiscais_universal_access" ON public.exercicios_fiscais;
    CREATE POLICY "exercicios_fiscais_universal_access" ON public.exercicios_fiscais FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.exercicios_fiscais TO anon, authenticated, service_role;
  
    ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "fornecedores_universal_access" ON public.fornecedores;
    CREATE POLICY "fornecedores_universal_access" ON public.fornecedores FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.fornecedores TO anon, authenticated, service_role;
  
    ALTER TABLE public.frota_combustivel ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "frota_combustivel_universal_access" ON public.frota_combustivel;
    CREATE POLICY "frota_combustivel_universal_access" ON public.frota_combustivel FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.frota_combustivel TO anon, authenticated, service_role;
  
    ALTER TABLE public.frota_manutencao ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "frota_manutencao_universal_access" ON public.frota_manutencao;
    CREATE POLICY "frota_manutencao_universal_access" ON public.frota_manutencao FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.frota_manutencao TO anon, authenticated, service_role;
  
    ALTER TABLE public.frota_multas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "frota_multas_universal_access" ON public.frota_multas;
    CREATE POLICY "frota_multas_universal_access" ON public.frota_multas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.frota_multas TO anon, authenticated, service_role;
  
    ALTER TABLE public.frota_veiculos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "frota_veiculos_universal_access" ON public.frota_veiculos;
    CREATE POLICY "frota_veiculos_universal_access" ON public.frota_veiculos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.frota_veiculos TO anon, authenticated, service_role;
  
    ALTER TABLE public.frota_viagens ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "frota_viagens_universal_access" ON public.frota_viagens;
    CREATE POLICY "frota_viagens_universal_access" ON public.frota_viagens FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.frota_viagens TO anon, authenticated, service_role;
  
    ALTER TABLE public.historico_licencas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "historico_licencas_universal_access" ON public.historico_licencas;
    CREATE POLICY "historico_licencas_universal_access" ON public.historico_licencas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.historico_licencas TO anon, authenticated, service_role;
  
    ALTER TABLE public.hotel_housekeeping ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hotel_housekeeping_universal_access" ON public.hotel_housekeeping;
    CREATE POLICY "hotel_housekeeping_universal_access" ON public.hotel_housekeeping FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hotel_housekeeping TO anon, authenticated, service_role;
  
    ALTER TABLE public.hotel_quartos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hotel_quartos_universal_access" ON public.hotel_quartos;
    CREATE POLICY "hotel_quartos_universal_access" ON public.hotel_quartos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hotel_quartos TO anon, authenticated, service_role;
  
    ALTER TABLE public.hotel_reservas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hotel_reservas_universal_access" ON public.hotel_reservas;
    CREATE POLICY "hotel_reservas_universal_access" ON public.hotel_reservas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hotel_reservas TO anon, authenticated, service_role;
  
    ALTER TABLE public.hotel_servicos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hotel_servicos_universal_access" ON public.hotel_servicos;
    CREATE POLICY "hotel_servicos_universal_access" ON public.hotel_servicos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hotel_servicos TO anon, authenticated, service_role;
  
    ALTER TABLE public.hr_assiduidade ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hr_assiduidade_universal_access" ON public.hr_assiduidade;
    CREATE POLICY "hr_assiduidade_universal_access" ON public.hr_assiduidade FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hr_assiduidade TO anon, authenticated, service_role;
  
    ALTER TABLE public.hr_contratos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hr_contratos_universal_access" ON public.hr_contratos;
    CREATE POLICY "hr_contratos_universal_access" ON public.hr_contratos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hr_contratos TO anon, authenticated, service_role;
  
    ALTER TABLE public.hr_ordens_transferencia ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hr_ordens_transferencia_universal_access" ON public.hr_ordens_transferencia;
    CREATE POLICY "hr_ordens_transferencia_universal_access" ON public.hr_ordens_transferencia FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hr_ordens_transferencia TO anon, authenticated, service_role;
  
    ALTER TABLE public.hr_pagamentos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hr_pagamentos_universal_access" ON public.hr_pagamentos;
    CREATE POLICY "hr_pagamentos_universal_access" ON public.hr_pagamentos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hr_pagamentos TO anon, authenticated, service_role;
  
    ALTER TABLE public.hr_processamentos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hr_processamentos_universal_access" ON public.hr_processamentos;
    CREATE POLICY "hr_processamentos_universal_access" ON public.hr_processamentos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.hr_processamentos TO anon, authenticated, service_role;
  
    ALTER TABLE public.impostos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "impostos_universal_access" ON public.impostos;
    CREATE POLICY "impostos_universal_access" ON public.impostos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.impostos TO anon, authenticated, service_role;
  
    ALTER TABLE public.impostos_pagamentos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "impostos_pagamentos_universal_access" ON public.impostos_pagamentos;
    CREATE POLICY "impostos_pagamentos_universal_access" ON public.impostos_pagamentos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.impostos_pagamentos TO anon, authenticated, service_role;
  
    ALTER TABLE public.lancamentos_contabeis ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "lancamentos_contabeis_universal_access" ON public.lancamentos_contabeis;
    CREATE POLICY "lancamentos_contabeis_universal_access" ON public.lancamentos_contabeis FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.lancamentos_contabeis TO anon, authenticated, service_role;
  
    ALTER TABLE public.licencas_empresas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "licencas_empresas_universal_access" ON public.licencas_empresas;
    CREATE POLICY "licencas_empresas_universal_access" ON public.licencas_empresas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.licencas_empresas TO anon, authenticated, service_role;
  
    ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "locais_trabalho_universal_access" ON public.locais_trabalho;
    CREATE POLICY "locais_trabalho_universal_access" ON public.locais_trabalho FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.locais_trabalho TO anon, authenticated, service_role;
  
    ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "logs_auditoria_universal_access" ON public.logs_auditoria;
    CREATE POLICY "logs_auditoria_universal_access" ON public.logs_auditoria FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.logs_auditoria TO anon, authenticated, service_role;
  
    ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "media_arquivos_universal_access" ON public.media_arquivos;
    CREATE POLICY "media_arquivos_universal_access" ON public.media_arquivos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.media_arquivos TO anon, authenticated, service_role;
  
    ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "metrics_universal_access" ON public.metrics;
    CREATE POLICY "metrics_universal_access" ON public.metrics FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.metrics TO anon, authenticated, service_role;
  
    ALTER TABLE public.movimentacoes_stock ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "movimentacoes_stock_universal_access" ON public.movimentacoes_stock;
    CREATE POLICY "movimentacoes_stock_universal_access" ON public.movimentacoes_stock FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.movimentacoes_stock TO anon, authenticated, service_role;
  
    ALTER TABLE public.movimentos_contabilisticos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "movimentos_contabilisticos_universal_access" ON public.movimentos_contabilisticos;
    CREATE POLICY "movimentos_contabilisticos_universal_access" ON public.movimentos_contabilisticos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.movimentos_contabilisticos TO anon, authenticated, service_role;
  
    ALTER TABLE public.nome_tabela ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "nome_tabela_universal_access" ON public.nome_tabela;
    CREATE POLICY "nome_tabela_universal_access" ON public.nome_tabela FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.nome_tabela TO anon, authenticated, service_role;
  
    ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pagamentos_universal_access" ON public.pagamentos;
    CREATE POLICY "pagamentos_universal_access" ON public.pagamentos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.pagamentos TO anon, authenticated, service_role;
  
    ALTER TABLE public.pagamentos_impostos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pagamentos_impostos_universal_access" ON public.pagamentos_impostos;
    CREATE POLICY "pagamentos_impostos_universal_access" ON public.pagamentos_impostos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.pagamentos_impostos TO anon, authenticated, service_role;
  
    ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "perfis_universal_access" ON public.perfis;
    CREATE POLICY "perfis_universal_access" ON public.perfis FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.perfis TO anon, authenticated, service_role;
  
    ALTER TABLE public.pgc_plano_contas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pgc_plano_contas_universal_access" ON public.pgc_plano_contas;
    CREATE POLICY "pgc_plano_contas_universal_access" ON public.pgc_plano_contas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.pgc_plano_contas TO anon, authenticated, service_role;
  
    ALTER TABLE public.pos_user_configs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pos_user_configs_universal_access" ON public.pos_user_configs;
    CREATE POLICY "pos_user_configs_universal_access" ON public.pos_user_configs FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.pos_user_configs TO anon, authenticated, service_role;
  
    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "produtos_universal_access" ON public.produtos;
    CREATE POLICY "produtos_universal_access" ON public.produtos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.produtos TO anon, authenticated, service_role;
  
    ALTER TABLE public.professions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "professions_universal_access" ON public.professions;
    CREATE POLICY "professions_universal_access" ON public.professions FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.professions TO anon, authenticated, service_role;
  
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "profiles_universal_access" ON public.profiles;
    CREATE POLICY "profiles_universal_access" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.profiles TO anon, authenticated, service_role;
  
    ALTER TABLE public.proj_equipa_recursos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proj_equipa_recursos_universal_access" ON public.proj_equipa_recursos;
    CREATE POLICY "proj_equipa_recursos_universal_access" ON public.proj_equipa_recursos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.proj_equipa_recursos TO anon, authenticated, service_role;
  
    ALTER TABLE public.proj_marcos_milestones ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proj_marcos_milestones_universal_access" ON public.proj_marcos_milestones;
    CREATE POLICY "proj_marcos_milestones_universal_access" ON public.proj_marcos_milestones FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.proj_marcos_milestones TO anon, authenticated, service_role;
  
    ALTER TABLE public.proj_orcamentos_custos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proj_orcamentos_custos_universal_access" ON public.proj_orcamentos_custos;
    CREATE POLICY "proj_orcamentos_custos_universal_access" ON public.proj_orcamentos_custos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.proj_orcamentos_custos TO anon, authenticated, service_role;
  
    ALTER TABLE public.proj_projetos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proj_projetos_universal_access" ON public.proj_projetos;
    CREATE POLICY "proj_projetos_universal_access" ON public.proj_projetos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.proj_projetos TO anon, authenticated, service_role;
  
    ALTER TABLE public.proj_tarefas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proj_tarefas_universal_access" ON public.proj_tarefas;
    CREATE POLICY "proj_tarefas_universal_access" ON public.proj_tarefas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.proj_tarefas TO anon, authenticated, service_role;
  
    ALTER TABLE public.seg_armaria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_armaria_universal_access" ON public.seg_armaria;
    CREATE POLICY "seg_armaria_universal_access" ON public.seg_armaria FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.seg_armaria TO anon, authenticated, service_role;
  
    ALTER TABLE public.seg_escalas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_escalas_universal_access" ON public.seg_escalas;
    CREATE POLICY "seg_escalas_universal_access" ON public.seg_escalas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.seg_escalas TO anon, authenticated, service_role;
  
    ALTER TABLE public.seg_ocorrencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_ocorrencias_universal_access" ON public.seg_ocorrencias;
    CREATE POLICY "seg_ocorrencias_universal_access" ON public.seg_ocorrencias FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.seg_ocorrencias TO anon, authenticated, service_role;
  
    ALTER TABLE public.seg_postos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_postos_universal_access" ON public.seg_postos;
    CREATE POLICY "seg_postos_universal_access" ON public.seg_postos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.seg_postos TO anon, authenticated, service_role;
  
    ALTER TABLE public.seg_vigilantes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_vigilantes_universal_access" ON public.seg_vigilantes;
    CREATE POLICY "seg_vigilantes_universal_access" ON public.seg_vigilantes FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.seg_vigilantes TO anon, authenticated, service_role;
  
    ALTER TABLE public.series_fiscais ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "series_fiscais_universal_access" ON public.series_fiscais;
    CREATE POLICY "series_fiscais_universal_access" ON public.series_fiscais FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.series_fiscais TO anon, authenticated, service_role;
  
    ALTER TABLE public.series_fiscais_usuarios ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "series_fiscais_usuarios_universal_access" ON public.series_fiscais_usuarios;
    CREATE POLICY "series_fiscais_usuarios_universal_access" ON public.series_fiscais_usuarios FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.series_fiscais_usuarios TO anon, authenticated, service_role;
  
    ALTER TABLE public.sgp_armaria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sgp_armaria_universal_access" ON public.sgp_armaria;
    CREATE POLICY "sgp_armaria_universal_access" ON public.sgp_armaria FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.sgp_armaria TO anon, authenticated, service_role;
  
    ALTER TABLE public.sgp_armaria_movimentos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sgp_armaria_movimentos_universal_access" ON public.sgp_armaria_movimentos;
    CREATE POLICY "sgp_armaria_movimentos_universal_access" ON public.sgp_armaria_movimentos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.sgp_armaria_movimentos TO anon, authenticated, service_role;
  
    ALTER TABLE public.sgp_escalas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sgp_escalas_universal_access" ON public.sgp_escalas;
    CREATE POLICY "sgp_escalas_universal_access" ON public.sgp_escalas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.sgp_escalas TO anon, authenticated, service_role;
  
    ALTER TABLE public.sgp_ocorrencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sgp_ocorrencias_universal_access" ON public.sgp_ocorrencias;
    CREATE POLICY "sgp_ocorrencias_universal_access" ON public.sgp_ocorrencias FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.sgp_ocorrencias TO anon, authenticated, service_role;
  
    ALTER TABLE public.sgp_patrulhas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sgp_patrulhas_universal_access" ON public.sgp_patrulhas;
    CREATE POLICY "sgp_patrulhas_universal_access" ON public.sgp_patrulhas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.sgp_patrulhas TO anon, authenticated, service_role;
  
    ALTER TABLE public.sgp_postos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sgp_postos_universal_access" ON public.sgp_postos;
    CREATE POLICY "sgp_postos_universal_access" ON public.sgp_postos FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.sgp_postos TO anon, authenticated, service_role;
  
    ALTER TABLE public.sgp_vigilantes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sgp_vigilantes_universal_access" ON public.sgp_vigilantes;
    CREATE POLICY "sgp_vigilantes_universal_access" ON public.sgp_vigilantes FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.sgp_vigilantes TO anon, authenticated, service_role;
  
    ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "system_users_universal_access" ON public.system_users;
    CREATE POLICY "system_users_universal_access" ON public.system_users FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.system_users TO anon, authenticated, service_role;
  
    ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "transacoes_universal_access" ON public.transacoes;
    CREATE POLICY "transacoes_universal_access" ON public.transacoes FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.transacoes TO anon, authenticated, service_role;
  
    ALTER TABLE public.user_activities_sessions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_activities_sessions_universal_access" ON public.user_activities_sessions;
    CREATE POLICY "user_activities_sessions_universal_access" ON public.user_activities_sessions FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.user_activities_sessions TO anon, authenticated, service_role;
  
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "users_universal_access" ON public.users;
    CREATE POLICY "users_universal_access" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.users TO anon, authenticated, service_role;
  
    ALTER TABLE public.v_agro_producao_por_fazenda ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "v_agro_producao_por_fazenda_universal_access" ON public.v_agro_producao_por_fazenda;
    CREATE POLICY "v_agro_producao_por_fazenda_universal_access" ON public.v_agro_producao_por_fazenda FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.v_agro_producao_por_fazenda TO anon, authenticated, service_role;
  
    ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "vendas_universal_access" ON public.vendas;
    CREATE POLICY "vendas_universal_access" ON public.vendas FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.vendas TO anon, authenticated, service_role;
  
NOTIFY pgrst, 'reload schema';
