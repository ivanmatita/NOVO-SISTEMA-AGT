---
name: imatec-production
description: >-
  Procedimentos de deploy seguro, validação de rollback e migração controlada para a Vercel de Produção.
---

# IMATEC Production Skill

Protocolo de Deploy em Produção:
- Execução estritamente condicionada à autorização manual prévia do utilizador.
- Verificação de diff cirúrgico: migrar apenas os arquivos modificados e testados.
- Testes pós-deploy (Smoke Tests) para confirmação de estabilidade.

