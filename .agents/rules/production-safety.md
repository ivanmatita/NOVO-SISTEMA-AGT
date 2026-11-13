# 🔒 PRODUCTION SAFETY RULE

PRODUÇÃO É READ-ONLY POR PADRÃO.

Nenhuma alteração de produção pode ser executada sem:
1. Staging concluído com 100% de sucesso.
2. QA aprovado (testes unitários e funcionais passando).
3. Teste manual do utilizador realizado.
4. Autorização explícita recebida.

Frase obrigatória para liberação de Produção:
> AUTORIZO A MIGRAÇÃO PARA PRODUÇÃO

Sem esta frase exata:
PRODUÇÃO = BLOQUEADA.
