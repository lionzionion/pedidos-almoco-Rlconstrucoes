# AMBEV | PEDIDOS RL — Visão Geral do Produto

## O problema na rotina da obra

Pedidos de café da manhã e almoço feitos de modo disperso por mensagens são difíceis de consolidar e conferir. Erros de anotação, pedidos duplicados, cancelamentos sem rastreabilidade e taxas de entrega pouco claras dificultam o fechamento com o restaurante.

## A solução

**AMBEV | PEDIDOS RL** é um sistema web responsivo que organiza o processo de refeições no canteiro da obra em três jornadas:

1. **Colaborador:** entra com login individual e senha cadastrados pela administração, escolhe a refeição do dia e os acompanhamentos, confirma, consulta histórico, edita e cancela antes do início do preparo.
2. **Restaurante:** vê a relação de pedidos do dia em um painel compartilhado, marca como **em preparo** e **entregue**, e identifica cancelamentos sem depender de dezenas de mensagens.
3. **Gestão RL:** confere nomes, pedidos, refeições, status, preços e a entrega coletiva, exporta CSV, cancela com motivo, arquiva/restaura mantendo trilha de auditoria e abre resumo para WhatsApp.

## Links

- [Página principal da apresentação](../)
- [Acesso único de colaboradores, restaurante e ADM](../acesso/)
- [Demonstração isolada com dados fictícios](../demo/)
- [Banco Supabase dedicado](https://supabase.com/dashboard/project/dpmofhdaefcqxohuhkfr)

Em GitHub Pages, os três primeiros endereços equivalem a:
- https://lionzionion.github.io/pedidos-almoco-solutio/
- https://lionzionion.github.io/pedidos-almoco-solutio/acesso/
- https://lionzionion.github.io/pedidos-almoco-solutio/demo/

## Diferenciais operacionais

- Rodízio de café da manhã e almoço para sete dias.
- Cardápio e preços validados também pelo servidor.
- Uma taxa de entrega por remessa/refeição no fechamento diário padrão.
- Relatório nominal e exportação para conferência.
- Cancelamento e arquivamento com preservação de histórico.
- Acesso por papel com Row Level Security (RLS).
- Dados pessoais de colaboradores no banco, não em planilhas públicas do GitHub.

## Status atual (15/11/2026)

- **Implementado:** interfaces, regras de cardápio, preços, Supabase dedicado, autenticação, políticas RLS, auditoria, Realtime, documentação e links para demonstração.
- **Pendente de homologação:** primeiro cadastro e promoção do gestor, cadastro e promoção da proprietária, verificação de fluxo real em dois aparelhos, confirmação de horários de fechamento e políticas de entrega.
- **Atenção:** o sistema conectado ainda não foi homologado para operação real. Use `/demo/` nas apresentações para não criar pedidos verdadeiros.

## Limites atuais e evolução sugerida

- Cancelamento de pedidos após início do preparo requer decisão administrativa; pode existir custo excepcional fora da apuração padrão.
- A taxa de entrega é aplicada uma vez por período, e **remessas adicionais** exigem ampliação do modelo.
- O cardápio é fixo conforme comunicado em 15/11/2026; painel de edição pelo restaurante é futura melhoria.
- WhatsApp abre mensagem consolidada para confirmação manual; não há envio automático pela API WhatsApp Business.
- Existe controle de pedidos, não gestão de estoque nem emissão de NF.

## Identidade e divulgação

O portal do projeto está disponível na página inicial do GitHub Pages. O link de **acesso da equipe** é `/acesso/`. O [guia de compartilhamento](05-COMPARTILHAR-ACESSO.md) contém mensagens prontas para colaboradores e restaurante. O [guia de GitHub](06-GITHUB-PERFIL.md) orienta a descrição, Website, tópicos e repositório fixado no perfil.
