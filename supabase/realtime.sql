-- Habilita atualizações em tempo real da lista de pedidos.
-- Já aplicado no projeto Supabase AMBEV Pedidos RL em 15/11/2026.
-- Para projeto novo: rode apenas uma vez no SQL Editor.
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
