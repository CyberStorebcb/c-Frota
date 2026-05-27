-- Placa do veículo reserva quando motivo = RESERVA
alter table public.checklist_ausencia_justificativas
  add column if not exists placa_reserva text;

comment on column public.checklist_ausencia_justificativas.placa_reserva is
  'Placa do veículo reserva utilizado no período (obrigatório quando motivo = RESERVA)';
