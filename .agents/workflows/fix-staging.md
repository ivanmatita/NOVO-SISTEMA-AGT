# Workflow: /fix-staging

## Objetivo
Correção cirúrgica e desenvolvimento de funcionalidades no ambiente de Staging.

## Passos
1. Executar `/audit` para confirmar escopo e causa raiz.
2. Invocar `IMATEC-DEVELOPER` para aplicar correções nos arquivos autorizados.
3. Invocar `IMATEC-DATABASE` se forem necessárias migrations incrementais em Staging.
4. Invocar `IMATEC-SECURITY` para validar isolamento multi-tenant e autenticação.
5. Invocar `IMATEC-QA` para rodar a suite de testes automatizados em Staging.
6. Invocar `IMATEC-STAGING` para compilar o build e sincronizar na Vercel Staging.
7. Notificar o utilizador: "STAGING ATUALIZADO. AGUARDANDO TESTE MANUAL E AUTORIZAÇÃO DO UTILIZADOR."
