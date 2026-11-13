---
name: imatec-staging
description: >-
  Gestão de builds, deploy e testes no ambiente de Staging (Vercel Teste / Supabase Staging).
---

# IMATEC Staging Skill

Protocolo de Staging:
- Verificação de integridade via `npx tsc --noEmit` e `npm run build`.
- Deploy na Vercel Staging através da branch de homologação/main.
- Notificação do utilizador para realização do Teste Manual Pessoal.
- Proibição de deploy direto para Produção.

