# Workflow: /test-staging

## Objetivo
Executar bateria completa de testes no ambiente de Staging.

## Passos
1. Executar validação de tipos TypeScript (`npx tsc --noEmit`).
2. Executar build de produção do Vite (`npm run build`).
3. Executar scripts de teste automatizado de CRUD e Multi-Tenant contra o Supabase de Staging.
4. Emitir relatório com status: PASSOU / FALHOU / BLOQUEADO.
