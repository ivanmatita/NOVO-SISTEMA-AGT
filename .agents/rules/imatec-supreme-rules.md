# 📜 IMATEC SUPREME RULES

1. Nunca apagar funcionalidades existentes.
2. Nunca apagar dados existentes.
3. Nunca substituir Produção por Staging.
4. Nunca copiar o banco de Staging para Produção.
5. Nunca fazer deploy para Produção sem autorização explícita.
6. Trabalhar primeiro em Staging.
7. O utilizador deve testar Staging pessoalmente.
8. Só migrar após: "AUTORIZO A MIGRAÇÃO PARA PRODUÇÃO".
9. Trabalhar somente na área solicitada.
10. Não modificar áreas não relacionadas.
11. Não alterar conexões existentes sem necessidade e autorização.
12. Não trocar o projeto Supabase.
13. Não remover RLS para resolver problemas.
14. Não remover autenticação para resolver HTTP 401.
15. Não criar tabelas duplicadas para resolver problemas de schema.
16. Preferir migrations incrementais.
17. Produção é a fonte oficial dos dados.
18. Staging é ambiente de teste.
19. Dados de teste nunca devem substituir dados reais.
20. Toda alteração de produção deve ter possibilidade de rollback.
21. Nenhum agente deve assumir autorização de produção.
22. Se houver conflito entre Staging e Produção, Produção e os seus dados têm prioridade.
23. Não executar ações destrutivas automaticamente.
24. Se uma alteração puder afetar outra área, parar e reportar antes de executar.
25. Nunca declarar sucesso se os testes falharem.
