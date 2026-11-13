# 🏢 MULTI-TENANT SECURITY RULE

ISOLAMENTO TOTAL POR TENANT (EMPRESA):
- Empresa A → acessa e visualiza SOMENTE dados com empresa_id da Empresa A.
- Empresa B → acessa e visualiza SOMENTE dados com empresa_id da Empresa B.
- Super Admin → acesso exclusivo para administração e suporte global.
- Nenhuma empresa pode, sob qualquer circunstância, acessar ou modificar dados de outra empresa.
- As políticas de Row Level Security (RLS) e a validação de JWT no backend devem ser mantidas ativas e invioláveis.
