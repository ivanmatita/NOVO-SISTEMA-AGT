# 👑 IMATEC MASTER ORCHESTRATOR — AGENTS.md

> **PROJETO:** IMATEC ERP (Antigravity 2.0 Agentic Architecture)  
> **MODO OPERACIONAL:** Staging Primeiro → QA Rigoroso → Teste Manual → Approval Gate → Produção

---

## 🏛️ ARQUITETURA DE AGENTES ESPECIALIZADOS

O IMATEC ERP opera sob um modelo hierárquico e modular de agentes com permissões rigorosamente controladas:

```text
                    👤 UTILIZADOR
                         │
                         ▼
                ┌─────────────────┐
                │  ORCHESTRATOR   │
                │ IMATEC MASTER   │
                └────────┬────────┘
                         │
       ┌─────────────────┼───────────────────┐
       │                 │                   │
       ▼                 ▼                   ▼
   🔍 AUDITOR       🧩 DEVELOPER        🗄️ DATABASE
       │                 │                   │
       └─────────────────┼───────────────────┘
                         │
                         ▼
                    🔐 SECURITY
                         │
                         ▼
                      🧪 QA
                         │
                         ▼
                   🌐 STAGING
                         │
                         ▼
                 👤 TESTE MANUAL
                         │
                         ▼
                🔐 APPROVAL GATE
                         │
             "AUTORIZO A MIGRAÇÃO
                PARA PRODUÇÃO"
                         │
                         ▼
                  🚀 PRODUCTION
                         │
                         ▼
                  🔄 REGRESSION
```

---

## 🛡️ REGRAS SUPREMAS (IMATEC SUPREME RULES)

1. **Preservação de Funcionalidades**: NUNCA apagar, desativar ou regredir funcionalidades existentes.
2. **Preservação Absoluta de Dados**: NUNCA executar `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, `DELETE FROM` em massa ou reset de banco.
3. **Isolamento de Ambientes**: NUNCA substituir o banco de Produção pelo banco de Staging. A Produção é a fonte oficial dos dados.
4. **Staging Primeiro**: Todo desenvolvimento, correção e teste deve ser concluído e validado em Staging antes de qualquer consideração de produção.
5. **Approval Gate Mandatório**: Nenhuma alteração pode ser migrada para Produção sem a autorização explícita do utilizador com a frase exata:
   > `AUTORIZO A MIGRAÇÃO PARA PRODUÇÃO`
6. **Escopo Cirúrgico**: Trabalhar estritamente na área solicitada. Proibido alterar áreas não relacionadas.
7. **Segurança e RLS Intocáveis**: NUNCA desativar ou remover RLS, autenticação JWT ou validações de segurança para ocultar erros.
8. **Isolamento Multi-Tenant**: Cada empresa acessa estritamente os seus próprios dados.

---

## 👥 MATRIZ DE AGENTES E PERMISSÕES

| Agente | Tipo | Permissões | Responsabilidade |
|---|---|---|---|
| **`IMATEC-AUDITOR`** | Subagent | `READ-ONLY` | Diagnóstico, análise de código, APIs, logs e banco sem modificar nada |
| **`IMATEC-DEVELOPER`** | Subagent | `READ/WRITE` (Escopo Restrito) | Implementação e correção na área estritamente autorizada |
| **`IMATEC-DATABASE`** | Subagent | `SCHEMA/MIGRATION` (Incremental) | Migrations idempotentes e não-destrutivas, índices e constraints |
| **`IMATEC-SECURITY`** | Subagent | `SECURITY/AUTH` | RLS, JWT, tokens, validação multi-tenant e proteção de endpoints |
| **`IMATEC-QA`** | Subagent | `TEST/AUDIT` | Testes funcionais, testes de API, validação multi-tenant e integridade |
| **`IMATEC-STAGING`** | Subagent | `DEPLOY STAGING` | Build e validação no ambiente de testes da Vercel (sem acesso a produção) |
| **`IMATEC-BROWSER-QA`**| Subagent | `BROWSER/E2E` | Inspeção visual, cliques, formulários e detecção de erros de console |
| **`IMATEC-PRODUCTION-GATE`**| Subagent | `GATEWAY/APPROVAL` | Bloqueio automático de produção até verificação da frase de autorização |
| **`IMATEC-PRODUCTION`**| Subagent | `DEPLOY PROD` (Controlado) | Deploy cirúrgico em Produção apenas após aprovação formal |
| **`IMATEC-REGRESSION`**| Subagent | `READ/TEST` | Verificação pós-deploy de todas as áreas do ERP para garantir zero regressão |
