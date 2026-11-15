# Implantação e apresentação — AMBEV Pedidos RL

## URLs

- Site de apresentação: https://lionzionion.github.io/pedidos-almoco-solutio/produto/
- App real: https://lionzionion.github.io/pedidos-almoco-solutio/app/
- Demo com dados fictícios: https://lionzionion.github.io/pedidos-almoco-solutio/demo/
- Projeto: https://github.com/lionzionion/pedidos-almoco-solutio
- Supabase: https://supabase.com/dashboard/project/dpmofhdaefcqxohuhkfr

## Executado até 15/11/2026

- [x] Projeto Supabase dedicado criado (São Paulo).
- [x] Banco, políticas RLS, histórico de pedidos e Realtime configurados.
- [x] Conta inicial de Leandro Dias confirmada e promovida para **admin** no banco.
- [x] Controle centralizado de usuários pela Edge Function `manage-users` implantado.
- [x] Aba **Cadastros** para ADM criar colaboradores e restaurante, desativar e trocar senha.
- [x] Gerador de PDF e impressão diária com logomarca, relação nominal, taxas e valores; mapa de produção do restaurante.
- [x] Código e documentação versionados no GitHub.

## Próximos testes operacionais

- [ ] Entrar com a conta ADM já existente, atualizar a sessão e verificar a aba **Cadastros**.
- [ ] Cadastrar usuário **restaurante** com senha provisória privada.
- [ ] Cadastrar funcionário de teste com usuário simples.
- [ ] Entrar com restaurante e colaborador em outros navegadores/dispositivos.
- [ ] Registrar café e almoço, alterar, cancelar, marcar em preparo e entregue.
- [ ] Conferir PDF, impressão em papel, CSV, taxas e total.
- [ ] Definir horários de corte e regra para remessas/entregas extras.
- [ ] Configurar rotinas de backups conforme disponibilidade do plano Supabase.

## Demonstração comercial de 5 minutos

1. **Contexto (30 s):** pedidos informais geram retrabalho e dificuldades na conferência do restaurante.
2. **Colaborador (1 min):** abrir a demo, escolher café/almoço e registrar pedido.
3. **Restaurante (1 min):** ver pedidos centralizados, status e mapa de produção.
4. **ADM (1,5 min):** conferir relatório nominal, imprimir PDF e explicar cadastro exclusivo e permissões.
5. **Encerramento (1 min):** mostrar a arquitetura, persistência na nuvem e código versionado.

> Durante apresentação pública, use `/demo/` com dados fictícios. Não exiba informações pessoais nem senhas reais dos funcionários.

## Próxima versão do produto

Cadastro multiobra e multirrestaurante; cardápio configurável; horários de corte, controle de remessas extras; fechamento semanal/mensal; exportação gerencial e notificações.
