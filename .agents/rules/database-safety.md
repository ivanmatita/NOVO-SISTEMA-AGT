# 🗄️ DATABASE SAFETY RULE

DIRETRIZES DE BANCO DE DADOS:
- NUNCA executar DROP DATABASE, DROP TABLE, TRUNCATE, DELETE FROM em massa ou RESET DATABASE.
- NUNCA substituir banco de Produção por banco de Staging.
- Utilizar SOMENTE migrations incrementais, seguras e idempotentes (`IF NOT EXISTS`, `IF EXISTS`).
- Preservar 100% dos dados históricos de clientes, faturas, caixas, colaboradores e empresas.
- Verificar o schema existente antes de propor qualquer alteração estrutural.
- Reutilizar campos e estruturas existentes quando forem compatíveis.
