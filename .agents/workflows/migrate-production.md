# Workflow: /migrate-production

## Objetivo
Migração cirúrgica e segura para o ambiente de Produção.

## Passos
1. Confirmar liberação do `IMATEC-PRODUCTION-GATE`.
2. Invocar `IMATEC-PRODUCTION` para realizar o deploy das alterações aprovadas.
3. Aplicar migrations incrementais necessárias no Supabase de Produção (sem tocar em dados existentes).
4. Executar smoke tests imediatos para confirmar disponibilidade.
5. Disparar automaticamente o workflow `/regression-test`.
