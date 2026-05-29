-- Permite que qualquer usuário autenticado leia veículos desmobilizados
-- (deleted_at IS NOT NULL).
--
-- Motivo: o FleetContext mescla Supabase + catálogo embebido. Para NÃO
-- re-adicionar um veículo desmobilizado a partir do catálogo, o cliente
-- precisa saber quais placas estão removidas. Antes, só admins liam linhas
-- com deleted_at preenchido, então usuários comuns continuavam vendo
-- veículos já desmobilizados. Placas/dados de frota não são sensíveis
-- (aparecem em todo o app), então a leitura é liberada para autenticados.

CREATE POLICY "Autenticados podem ler veículos removidos"
ON public.vehicles
FOR SELECT
TO authenticated
USING (deleted_at IS NOT NULL);
