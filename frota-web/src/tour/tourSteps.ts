export type TourStep = {
  path: string
  selector?: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  waitMs?: number
}

export const TOUR_STEPS: TourStep[] = [
  // ─── Boas-vindas ────────────────────────────────────────────────────────
  {
    path: '/',
    title: '👋 Bem-vindo ao CGB Frota!',
    content:
      'Este é o sistema de gestão completa da frota da CGB Energia. Vou te apresentar todas as funcionalidades em poucos minutos. Use ▶ Próximo / ◀ Voltar para navegar, ou Pular para sair.',
    waitMs: 600,
  },

  // ─── Sidebar ────────────────────────────────────────────────────────────
  {
    path: '/',
    selector: '[data-tour="sidebar"]',
    title: '📍 Menu de Navegação',
    content:
      'Este é o menu lateral. Por aqui você acessa todas as áreas: Dashboard, Gerenciar, Registro, Checklists e (para super admin) Usuários.',
    placement: 'right',
  },

  // ─── Dashboard ──────────────────────────────────────────────────────────
  {
    path: '/',
    title: '📊 Dashboard — Visão Geral',
    content:
      'Observe a tela acima: aqui ficam os KPIs principais da frota — total de veículos, checklists do dia, pendências e evolução mensal. É a primeira tela ao entrar no sistema.',
    waitMs: 400,
  },

  // ─── Gerenciar ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar',
    title: '🛠️ Gerenciar — Apontamentos de Defeitos',
    content:
      'Veja a tela acima: cada NC (Não Conformidade) encontrada nos checklists vira um apontamento aqui. Admins acompanham, documentam a resolução e encerram cada ocorrência.',
    waitMs: 900,
  },
  {
    path: '/gerenciar',
    selector: '[data-tour="manage-stats"]',
    title: '📈 KPIs do Período',
    content:
      'Os cartões mostram totais de Apontamentos, Pendentes, Resolvidos e Defeitos Entrantes (de hoje). Clique em qualquer cartão para filtrar automaticamente a tabela abaixo.',
    placement: 'bottom',
  },
  {
    path: '/gerenciar',
    selector: '[data-tour="manage-filtros"]',
    title: '🔍 Filtros Avançados',
    content:
      'Filtre por veículo, base, processo, supervisor, gerência e intervalo de datas. Os filtros ativos são destacados e podem ser limpos individualmente.',
    placement: 'bottom',
  },
  {
    path: '/gerenciar',
    selector: '[data-tour="manage-table"]',
    title: '📋 Tabela de Apontamentos',
    content:
      'Cada linha é um defeito: veículo, processo, descrição, data e status. Admins podem marcar como resolvido, adicionar evidências de resolução e acompanhar prazos.',
    placement: 'top',
  },

  // ─── Evolução ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/evolucao',
    title: '📉 Evolução — Análise Temporal',
    content:
      'Veja o gráfico acima: mostra aberturas vs. resoluções ao longo do tempo, tempo médio de resolução e tendências mensais. Ferramenta essencial para análise estratégica da frota.',
    waitMs: 800,
  },

  // ─── Histórico ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/historico',
    title: '📜 Histórico — Manutenções Concluídas',
    content:
      'Todas as manutenções corretivas já encerradas ficam aqui, com fotos do antes/depois e descrição da resolução. É possível gerar relatórios em PDF de qualquer registro.',
    waitMs: 800,
  },

  // ─── Checklists ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/checklists',
    title: '✅ Checklists — Controle Diário',
    content:
      'Veja na tela acima quais veículos realizaram (ou não) o checklist do dia. É a ponte entre o operador no campo e a gestão central da frota.',
    waitMs: 800,
  },
  {
    path: '/gerenciar/checklists',
    selector: '[data-tour="checklists-actions"]',
    title: '🔗 Link Público do Checklist',
    content:
      'Os operadores acessam um link único (/checklist) para preencher o checklist do veículo sem precisar de login. Esse link pode ser enviado por WhatsApp ou QR Code.',
    placement: 'bottom',
  },

  // ─── Resultados ─────────────────────────────────────────────────────────
  {
    path: '/gerenciar/checklists/resultados',
    title: '📊 Resultados dos Checklists',
    content:
      'Todos os checklists enviados pelos operadores aparecem aqui. Filtre por tipo de veículo, veja os detalhes completos com fotos, edite (admin) ou exporte em CSV.',
    waitMs: 800,
  },

  // ─── Registro ──────────────────────────────────────────────────────────
  {
    path: '/registro',
    title: '🚗 Registro — Cadastro da Frota',
    content:
      'Veja a lista de veículos acima: este é o cadastro mestre da frota. Usuários autorizados adicionam veículos manualmente ou importam planilhas Excel de uma só vez.',
    waitMs: 800,
  },
  {
    path: '/registro',
    selector: '[data-tour="registro-actions"]',
    title: '➕ Importação e Cadastro',
    content:
      'Os botões "Importar Excel" e "Novo veículo" aparecem apenas para os usuários com permissão de modificar a base. Para os demais, a página é somente leitura.',
    placement: 'bottom',
  },

  // ─── Usuários ──────────────────────────────────────────────────────────
  {
    path: '/usuarios',
    title: '👥 Usuários — Gestão de Acessos',
    content:
      'Apenas super admins acessam esta área. Aqui você cria novos usuários, define perfis (admin/usuário), reseta senhas e gerencia quem tem acesso ao sistema.',
    waitMs: 800,
  },

  // ─── Encerramento ──────────────────────────────────────────────────────
  {
    path: '/',
    title: '🎉 Tour Concluído!',
    content:
      'Você conheceu todas as áreas do sistema. Boa gestão da frota! Para rever o tour a qualquer momento, clique no botão "?" no canto inferior direito da tela.',
    waitMs: 400,
  },
]

export const TOUR_AUTOSTART_EMAILS = [
  'demo@cgbengenharia.com.br',
]

export function shouldAutoStartTour(email: string | undefined | null): boolean {
  if (!email) return false
  return TOUR_AUTOSTART_EMAILS.includes(email.trim().toLowerCase())
}
