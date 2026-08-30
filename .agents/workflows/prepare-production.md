# Workflow: /prepare-production

## Objetivo
Preparar o pacote de alterações e validar pré-requisitos antes da solicitação de aprovação.

## Passos
1. Verificar se 100% dos testes de Staging passaram.
2. Gerar diff restrito dos arquivos modificados.
3. Validar ausência de alterações destrutivas em banco de dados.
4. Solicitar autorização formal ao utilizador.
