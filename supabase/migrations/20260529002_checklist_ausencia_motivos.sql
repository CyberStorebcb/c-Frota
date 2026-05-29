-- Atualiza o CHECK de `motivo` para aceitar todos os motivos usados pelo app.
--
-- O constraint original só permitia 'RESERVA' e 'NÃO RODOU'. O app passou a
-- usar também 'OFICINA', 'DESMOBILIZADO' e 'FEITO'. Sem este ajuste, essas
-- justificativas falhavam ao gravar no Supabase (violação de CHECK, código
-- 23514) e ficavam apenas no localStorage do admin — por isso os demais
-- usuários não as viam.

ALTER TABLE public.checklist_ausencia_justificativas
  DROP CONSTRAINT IF EXISTS checklist_ausencia_justificativas_motivo_check;

ALTER TABLE public.checklist_ausencia_justificativas
  ADD CONSTRAINT checklist_ausencia_justificativas_motivo_check
  CHECK (motivo IN ('FEITO', 'RESERVA', 'NÃO RODOU', 'OFICINA', 'DESMOBILIZADO'));
