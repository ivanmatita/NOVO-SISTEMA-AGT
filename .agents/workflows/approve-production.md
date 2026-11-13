# Workflow: /approve-production

## Objetivo
Approval Gate de segurança para liberação de deploy em Produção.

## Passos
1. Invocar `IMATEC-PRODUCTION-GATE`.
2. Verificar se a mensagem do utilizador contém explicitamente a frase:
   "AUTORIZO A MIGRAÇÃO PARA PRODUÇÃO"
3. Se NÃO contiver: Manter PRODUÇÃO BLOQUEADA e abortar.
4. Se contiver: Liberar avanço para o workflow `/migrate-production`.
