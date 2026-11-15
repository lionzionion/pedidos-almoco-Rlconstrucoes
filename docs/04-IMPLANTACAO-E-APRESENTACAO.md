# Implantação e demonstração para a obra

## Endereços públicos

- **Apresentação do produto:** https://lionzionion.github.io/pedidos-almoco-solutio/produto/
- **Acesso conectado ao banco:** https://lionzionion.github.io/pedidos-almoco-solutio/app/
- **Demonstração fictícia:** https://lionzionion.github.io/pedidos-almoco-solutio/demo/
- **Repositório do projeto:** https://github.com/lionzionion/pedidos-almoco-solutio

A hospedagem usa GitHub Pages. Após alterações no `main`, confira se o workflow **pages build and deployment** terminou com sucesso em **Actions**. Em mudanças recentes, a publicação pode ainda estar em andamento.

## Configuração feita

- Projeto dedicado `AMBEV Pedidos RL` criado na organização Supabase existente, região São Paulo, ref `dpmofhdaefcqxohuhkfr`.
- Banco provisionado com tabelas `profiles`, `orders`, `order_audit`, triggers, RLS e auditoria.
- Realtime ativo para `public.orders`.
- `app/config.js` aponta ao banco com chave publicável.

## Finalização pendente da entrada em operação

1. **Supabase Auth → URL Configuration:** configurar Site URL e URLs de redirecionamento para `https://lionzionion.github.io/pedidos-almoco-solutio/app/`.
2. Fazer primeiro cadastro no app; confirmar e-mail, se habilitado.
3. Promover o gestor a `admin` via SQL Editor do Supabase:
   ```sql
   update public.profiles set role='admin'
   where id=(select id from auth.users where email='EMAIL_DO_GESTOR');
   ```
4. Cadastrar a proprietária do restaurante e promovê-la a `restaurante`:
   ```sql
   update public.profiles set role='restaurante'
   where id=(select id from auth.users where email='EMAIL_DO_RESTAURANTE');
   ```
5. Executar ensaio em dois celulares e um computador, com cadastros distintos.
6. Reconciliar pedido confirmado → preparo → entrega, edição, cancelamento e CSV.
7. Confirmar limites de horários de recebimento do café e almoço com o restaurante.
8. Validar precificação de remessas extras e cobrança de refeições em preparo canceladas.
9. Só divulgar o link `/app/` para pedidos reais após homologação.

## Demonstração de 3 a 5 minutos na obra

**Abertura (30 s):** Mostrar o problema dos pedidos dispersos por WhatsApp e da dificuldade de conferir quantos foram feitos.

**Passo 1 (1 min):** Acessar o site do produto e abrir a demo. No perfil Colaborador, escolher almoço, acompanhamentos e confirmar.

**Passo 2 (1 min):** Trocar para perfil Restaurante. Mostrar a lista centralizada e avançar pedido de Confirmado para Em preparo.

**Passo 3 (1 min):** Trocar para Gestão RL. Mostrar a lista nominal, valores, taxa coletiva e cancelamento. Exportar CSV.

**Fechamento (30 s):** Explicar banco de dados, permissões, histórico e WhatsApp consolidado. Deixar claro que a demonstração usa dados fictícios.

## Próximas fases do produto

1. Cadastro de obras, restaurantes e empresas (multiobra/multicliente).
2. Cardápio gerenciado pelo restaurante sem editar código.
3. Horários de corte e limites de pedidos por refeição.
4. Remessas independentes com taxas de entrega por evento.
5. Aprovação de conferência, contas a pagar, recibos e integração financeira.
6. Notificações e PWA com melhor suporte offline.
7. Relatórios gerenciais por obra, equipe, semana e mês.
