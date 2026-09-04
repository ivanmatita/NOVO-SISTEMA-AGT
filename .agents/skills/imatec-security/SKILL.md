---
name: imatec-security
description: >-
  Auditoria e aplicação de segurança, JWT, autorização, RLS e proteção de APIs no IMATEC ERP.
---

# IMATEC Security Skill

Diretrizes de segurança e controle de acesso:
- Validação de tokens JWT nas rotas serverless da Vercel.
- Isolamento estrito por `empresa_id` tanto no banco (RLS) quanto nos handlers de API.
- Proteção de secrets e chaves de serviço (`serviceRoleKey`).
- Nunca desativar autenticação ou RLS para contornar erros de execução.

