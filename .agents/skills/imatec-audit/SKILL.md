---
name: imatec-audit
description: >-
  Diagnóstico forense, auditoria de código, análise de APIs, logs e schema de banco de dados do IMATEC ERP sem realizar modificações.
---

# IMATEC Audit Skill

Esta skill fornece diretrizes para auditoria forense do IMATEC ERP:
- Analisar logs de console e respostas HTTP (status 400, 401, 500).
- Identificar inconsistências entre o schema do banco de dados e as entidades do frontend.
- Comparar contratos de API entre client e serverless handlers.
- Operação estritamente READ-ONLY: Proibido fazer alterações de código ou banco de dados durante a auditoria.

