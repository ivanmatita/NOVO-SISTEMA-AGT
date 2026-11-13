---
name: imatec-supabase
description: >-
  Gestão de schema, RLS, Realtime e consultas PostgreSQL no Supabase para o IMATEC ERP.
---

# IMATEC Supabase Skill

Diretrizes para operações de banco de dados Supabase:
- Criação de migrations incrementais e idempotentes.
- Verificação de políticas RLS para garantir isolamento multi-tenant (`empresa_id`).
- Configuração de publicação Realtime (`supabase_realtime`).
- Proibição absoluta de operações destrutivas (`DROP`, `TRUNCATE`, `DELETE`).

