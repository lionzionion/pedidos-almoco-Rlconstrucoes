# AMBEV | PEDIDOS RL

### Gestão digital de café da manhã e almoço na obra

Aplicativo web de gestão de refeições da **RL Engenharia na obra AMBEV Itapissuma/PE**. Organiza solicitações dos colaboradores, produção do restaurante, cancelamentos, relatórios e conferência diária antes do pagamento.

## 🌐 Abra o projeto

| Ambiente | Link | Finalidade |
|---|---|---|
| **Site de apresentação do produto** | [Abrir apresentação](https://lionzionion.github.io/pedidos-almoco-solutio/produto/) | Explicar a solução a gestores e parceiros |
| **Aplicativo conectado ao banco** | [Abrir acesso](https://lionzionion.github.io/pedidos-almoco-solutio/app/) | Login e pedidos reais **após homologação** |
| **Demonstração interativa** | [Testar sistema](https://lionzionion.github.io/pedidos-almoco-solutio/demo/) | Pedidos **fictícios**, sem usar o banco real |
| **Versão anterior** | [Abrir formulário legado](https://lionzionion.github.io/pedidos-almoco-solutio/) | Mantida temporariamente na raiz |

> **ATENÇÃO:** o aplicativo conectado tem backend real, mas ainda precisa da criação dos perfis administrativos e testes end-to-end antes de ser adotado para cobrança de refeições. Para apresentar a solução, utilize `/demo/`.

## O que já foi implementado

- Formulário responsivo do colaborador com café da manhã e almoço.
- Rodízio semanal conforme o cardápio do restaurante.
- Café completo R$ 17, pão simples R$ 10 e almoço R$ 22.
- Acompanhamentos de almoço e campo de observações.
- Painel de preparo do restaurante e atualização Realtime.
- Perfis de acesso colaborador, restaurante e administrador.
- Edição e cancelamento antes do preparo.
- Arquivamento/restauração administrativos (exclusão lógica e auditada).
- Relação nominal e fechamento financeiro por data/refeição.
- Exportação CSV e resumo consolidado para envio manual por WhatsApp.
- Banco Supabase separado, autenticado, com PostgreSQL e políticas RLS.
- Demonstração com dados fictícios para reuniões e apresentação no canteiro.

## Comece pela documentação

1. [Visão geral e problema resolvido](docs/01-VISAO-GERAL.md)
2. [Manual completo de uso para colaborador, restaurante e gestão](docs/02-GUIA-USO.md)
3. [Arquitetura, segurança e modelo de dados](docs/03-ARQUITETURA-E-SEGURANCA.md)
4. [Implantação, acessos e roteiro de apresentação comercial](docs/04-IMPLANTACAO-E-APRESENTACAO.md)

## Estrutura do repositório

```text
├── assets/          # logomarca oficial RL em WebP e cópia SVG
├── app/             # aplicação conectada a Supabase
├── demo/            # demonstração local e fictícia
├── produto/         # vitrine comercial do software
├── supabase/        # schema.sql e realtime.sql
├── docs/            # guias funcionais, técnicos e implantação
├── tests/           # testes de cardápio e cálculo financeiro
├── index.html       # formulário anterior preservado
└── README.md
```

## Execução em desenvolvimento

O sistema web **não exige npm nem build** para funcionar. Abra `app/index.html` ou execute servidor estático (por exemplo, `python -m http.server 8000`) na pasta do repositório e visite `http://localhost:8000/app/`. Para testes Node.js do cardápio:

```powershell
node --test tests/*.test.cjs
```

A configuração do projeto Supabase dedicado está em `app/config.js`. Contém **somente URL e chave publicável** do Supabase (não é segredo). Nunca coloque `service_role` ou `sb_secret` no frontend.

## Arquitetura resumida

```text
Colaborador ─┐
Restaurante ─┼──> GitHub Pages (/app) ──> Supabase Auth + API ──> PostgreSQL (RLS)
Gestão RL  ──┘                               │
                                            └──> Realtime + auditoria
Gestão RL ──> CSV / resumo WhatsApp (envio manual)
```

## Regras importantes

- O servidor valida as opções do rodízio, data e preço, e impede múltiplos pedidos ativos da **mesma refeição** pelo mesmo usuário no mesmo dia.
- A taxa de entrega padrão é **uma por remessa/refeição**: café R$ 12; almoço segunda a sexta R$ 8; sábado e domingo R$ 12.
- Pedidos cancelados ou arquivados não integram o total ativo; a gestão deve reconciliar os pedidos efetivamente preparados/entregues.
- Não há exclusão física pela interface; o histórico de cancelamentos/arquivamentos é preservado.
- WhatsApp abre um texto consolidado para confirmação manual pelo usuário.
- A versão `/demo/` **não** escreve pedidos no banco de dados.

## Próxima etapa para usar na obra

1. Ajustar URLs de confirmação de e-mail no Supabase.
2. Cadastrar e promover o gestor à função `admin`.
3. Cadastrar e promover a proprietária à função `restaurante`.
4. Fazer testes com dois celulares e validar cancelamento, preparo, entrega, conferência e fechamento.
5. Definir horário de corte de pedidos e tratamento de remessas extraordinárias.

---

**RL Engenharia — Fazendo Acontecer.** Projeto demonstrativo e sistema interno de gestão de refeições • 2026.

## Identidade visual oficial

A logomarca oficial **RL Engenharia — Fazendo Acontecer**, enviada pelo proprietário, foi incorporada ao repositório em `assets/rl-logo.webp` (imagem com fundo transparente). O arquivo é usado no cabeçalho de **todas as telas do app**, login, demonstração, site de apresentação e formulário anterior. O favicon também usa a marca.

Para validar todas as referências da imagem antes de publicar, execute `node --test tests/logo.test.cjs`.
