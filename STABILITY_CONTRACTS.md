# STABILITY_CONTRACTS.md
# Contratos de Estabilidade — Sistema AGT Multi-Tenant

> **REGRA ABSOLUTA**: Qualquer atualizacao futura DEVE preservar todas as funcionalidades existentes,
> conexoes, dados, regras de negocio, autenticacao, multi-empresa, producao/teste, RLS, Supabase,
> Realtime e rotinas que ja funcionam.

---

## 1. Multi-Tenancy — Isolamento de Empresa

| Contrato | Descricao |
|---|---|
| **SEM empresa fixa** | Nunca hardcodar um empresa_id UUID em nenhum ficheiro (frontend ou backend). |
| **SEM fallback automatico** | Nunca fazer fallback automatico para a empresa principal se empresa_id for null. |
| **SEM mistura de dados** | Dados de empresas diferentes nunca devem aparecer juntos sem filtragem explicita por empresa_id. |
| **SEM mistura prod/teste** | Ambientes de producao e teste sao completamente separados. |
| **Erro explicito** | Se empresa_id for null quando obrigatorio, lancar erro claro ao utilizador e nao prosseguir. |

Violacoes corrigidas:
- api/_auth.js: service-role bypass retornava empresa_id da IMATEC ANGOLA -> corrigido para empresa_id: null
- src/App.tsx: payload de produtos incluia company_id: '11111111-0000-0000-0000-000000000001' -> removido
- api/_auth.js: funcao isImatecAdmin que concedia privilegios so a IMATEC -> removida

---

## 2. Schema de Base de Dados — Contratos de Colunas

> Nunca enviar colunas que nao existem na tabela — causam erros 400/500.

### documentos_emitidos
- Coluna de data: data_emissao (NAO 'date')
- Coluna de ano: ano
- NAO EXISTE: date

### produtos
- Coluna de empresa: empresa_id
- NAO EXISTE: company_id

### pos_user_configs
- Unique constraint: apenas em user_id (nao em (user_id, empresa_id))

---

## 3. Autenticacao e Sessao

| Contrato | Descricao |
|---|---|
| **Sem loops de auth** | getCurrentUser() tem deduplicacao de in-flight Promise. |
| **TOKEN_REFRESHED nao re-cria o user** | Mesmo user.id nao dispara re-fetch do perfil. |
| **Sem fetchData duplicado** | useEffect([authReady, fiscalYear]) chama apenas fetchData(). |
| **Heartbeat silencioso** | /api/user-activities retorna 200 para utilizadores nao autenticados. |

---

## 4. Realtime / Subscriptions

| Contrato | Descricao |
|---|---|
| **Sem duplicacao de canais** | RealtimeManager tem guard por channelName e subscribing Set. |
| **Unsubscribe controlado** | Canal so e destruido quando 0 listeners restam. |
| **Realtime por empresa** | Canais Realtime sao sempre filtrados por empresa_id. |

---

## 5. Throttle de loadDocumentosEmitidos

- Aceita: (explicitId?: string, explicitYear?: string)
- O handler de Realtime passa (companyId, fiscalYear) — year agora e passado corretamente.

---

## 6. API Handlers — Contratos

| Endpoint | Contrato |
|---|---|
| GET /api/pos-points | isOperationRoute reconhece rotas GET como operacionais. |
| POST /api/invoices | docTypeAbbr deve ser definido antes de usar. |
| GET /api/user-activities | Sem auth -> 200 silencioso, nunca 401. |
| GET /api/auth/me | empresa_id vem do perfil, nunca hardcoded. |

---

## 7. Regras de Alteracao de Codigo

ANTES de alterar qualquer ficheiro:
1. Auditar a implementacao atual.
2. Identificar todas as dependencias.
3. Verificar se a coluna/campo existe realmente na tabela.
4. NAO quebrar o que ja funciona.

PROIBIDO:
- DROP TABLE, TRUNCATE, DELETE FROM em tabelas de producao.
- Alterar constraints de pos_user_configs.
- Adicionar empresa_id hardcoded em qualquer ficheiro.
- Misturar dados de empresas diferentes sem filtro por empresa_id.

PowerShell (Windows): && NAO e separador valido. Usar comandos separados.

---

## 8. Empresas em Producao (referencia para auditoria)

| ID | Nome |
|---|---|
| 2ebafa88-9a6e-4243-b127-b146410815eb | Imatec Angola, Lda |
| 09d8f37d-6ff5-45e5-a7f1-24c2aab3ef47 | CARMA PRESTACAO DE SERVICOS |
| ecaf8701-4b54-4ab9-bad2-09f582ed3d09 | LAB PADEL |

> Estes UUIDs NAO devem aparecer hardcoded em nenhum ficheiro de codigo.

---

## 9. Historico de Correcoes

| Sessao | Commit | Correccao |
|---|---|---|
| 1 | 47f0239 | Removido date de select em documentos_emitidos |
| 1 | 47f0239 | Corrigido isOperationRoute em pos.js |
| 1 | 47f0239 | Heartbeat 401 silenciado em user-activities.js |
| 1 | 47f0239 | Removido UUID IMATEC hardcoded de _auth.js |
| 1 | 47f0239 | Removida isImatecAdmin de _auth.js |
| 1 | 47f0239 | Adicionado docTypeAbbr em invoices.js |
| 2 | (este) | In-flight deduplication em authService.ts getCurrentUser |
| 2 | (este) | TOKEN_REFRESHED guard em AuthContext.tsx |
| 2 | (este) | Removido double-fetch docs/compras em App.tsx useEffect |
| 2 | (este) | Corrigida assinatura throttle loadDocumentosEmitidos com year |
| 2 | (este) | Removido company_id e UUID hardcoded do payload de produtos |
| 2 | (este) | Corrigidos containers de graficos em BusinessOverview e EcosystemDashboard |
