/**
 * Definição dos passos do tour guiado.
 *
 * Cada passo pode:
 * - Ter um `selector` CSS para destacar elemento específico (spotlight)
 * - Não ter selector → exibe modal centralizado explicativo
 * - Mudar de rota via `path` (navegação automática)
 */

export type TourStep = {
  /** Rota a navegar antes de mostrar o passo. */
  path: string
  /** Seletor CSS do elemento a destacar. Se omitido, exibe modal centralizado. */
  selector?: string
  /** Título do balão/modal. */
  title: string
  /** Conteúdo explicativo. */
  content: string
  /** Posição preferida do tooltip (auto se omitido). */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  /** Aguarda em ms antes de mostrar (para esperar carregamentos). */
  waitMs?: number
}

export const TOUR_STEPS: TourStep[] = [
  // ─── Boas-vindas ────────────────────────────────────────────────────────
  {
    path: '/',
    title: '👋 Bem-vindo ao CGB Frota!',
    content:
      'Este é o sistema de gestão completa da frota. Vou te apresentar todas as funcionalidades em poucos minutos. Use os botões ▶ Próximo / ◀ Voltar para navegar, ou Pular para finalizar.',
    placement: 'center',
    waitMs: 500,
  },

  // ─── Dashboard ──────────────────────────────────────────────────────────
  {
    path: '/',
    selector: '[data-tour="sidebar"]',
    title: '📍 Menu de Navegação',
    content:
      'Este é o menu lateral. Por aqui você acessa Dashboard, Gerenciar, Registro, Checklists e (para super admin) Usuários.',
    placement: 'right',
  },
  {
    path: '/',
    title: '📊 Dashboard',
    content:
      'O Dashboard mostra a visão geral da frota: KPIs principais, checklists realizados, pendências, evolução e ranking. É a tela inicial de todo o sistema.',
    placement: 'center',
  },

  // ─── Gerenciar ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar',
    title: '🛠️ Página Gerenciar',
    content:
      'Aqui você gerencia todos os apontamentos de defeitos da frota. Cada NC (Não Conformidade) de checklist vira um apontamento que pode ser acompanhado, marcado como resolvido e ter sua resolução documentada.',
    placement: 'center',
    waitMs: 800,
  },
  {
    path: '/gerenciar',
    selector: '[data-tour="manage-stats"]',
    title: '📈 KPIs do período',
    content:
      'Os cartões superiores mostram totais de Apontamentos, Pendentes, Resolvidos e Defeitos Entrantes (apontados hoje). Clique em cada cartão para filtrar a tabela.',
    placement: 'bottom',
  },
  {
    path: '/gerenciar',
    selector: '[data-tour="manage-filtros"]',
    title: '🔍 Filtros poderosos',
    content:
      'Filtre por veículo, base, processo, supervisor, gerência, data e mais. Os filtros são salvos automaticamente.',
    placement: 'bottom',
  },
  {
    path: '/gerenciar',
    selector: '[data-tour="manage-table"]',
    title: '📋 Tabela de apontamentos',
    content:
      'Cada linha representa um defeito. Veja veículo, processo, defeito, data e status. Admin/super admin podem marcar como resolvido diretamente aqui.',
    placement: 'top',
  },

  // ─── Evolução ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/evolucao',
    title: '📉 Evolução temporal',
    content:
      'Esta página mostra a evolução de defeitos ao longo do tempo: aberturas vs. resoluções, tempo médio de resolução, tendências por mês. Útil para análise estratégica.',
    placement: 'center',
    waitMs: 600,
  },

  // ─── Histórico ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/historico',
    title: '📜 Histórico de Resoluções',
    content:
      'Histórico completo de todas as manutenções corretivas concluídas, com evidências fotográficas do antes/depois e geração de relatórios em PDF.',
    placement: 'center',
    waitMs: 600,
  },

  // ─── Checklists ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/checklists',
    title: '✅ Checklists',
    content:
      'Aqui você acompanha quais veículos realizaram (ou não) os checklists do dia. É a ponte entre o operador no campo e a gestão da frota.',
    placement: 'center',
    waitMs: 600,
  },
  {
    path: '/gerenciar/checklists',
    selector: '[data-tour="checklists-actions"]',
    title: '🔗 Link público do checklist',
    content:
      'Os operadores acessam um link único (/checklist) para preencher o checklist diário do veículo. Pode ser enviado por WhatsApp.',
    placement: 'bottom',
  },

  // ─── Resultados ─────────────────────────────────────────────────────────
  {
    path: '/gerenciar/checklists/resultados',
    title: '📊 Resultados dos Checklists',
    content:
      'Veja todos os checklists já enviados pelos operadores. Filtre por tipo de veículo, busque, edite (admin), exporte CSV ou veja os detalhes completos com fotos.',
    placement: 'center',
    waitMs: 600,
  },

  // ─── Registro ──────────────────────────────────────────────────────────
  {
    path: '/registro',
    title: '🚗 Registro de Veículos',
    content:
      'Cadastro mestre da frota. Usuários autorizados podem adicionar veículos manualmente ou importar planilhas Excel inteiras de uma vez.',
    placement: 'center',
    waitMs: 600,
  },
  {
    path: '/registro',
    selector: '[data-tour="registro-actions"]',
    title: '➕ Importação e cadastro',
    content:
      'Os botões "Importar Excel" e "Novo veículo" aparecem apenas para os usuários autorizados a modificar a base. Para os demais, a página é só de consulta.',
    placement: 'bottom',
  },

  // ─── Usuários ──────────────────────────────────────────────────────────
  {
    path: '/usuarios',
    title: '👥 Gestão de Usuários',
    content:
      'Apenas super admins acessam esta página. Aqui você cria novos usuários, define roles (admin/user), reseta senhas e gerencia acessos.',
    placement: 'center',
    waitMs: 600,
  },

  // ─── Encerramento ──────────────────────────────────────────────────────
  {
    path: '/',
    title: '🎉 Tour concluído!',
    content:
      'Você conheceu as principais áreas do sistema. Boa gestão da frota! Você pode reiniciar este tour a qualquer momento clicando no botão de ajuda no canto inferior direito.',
    placement: 'center',
  },
]

/** E-mails que disparam o tour automaticamente ao fazer login. */
export const TOUR_AUTOSTART_EMAILS = [
  'demo@cgbengenharia.com.br',
]

export function shouldAutoStartTour(email: string | undefined | null): boolean {
  if (!email) return false
  return TOUR_AUTOSTART_EMAILS.includes(email.trim().toLowerCase())
}
