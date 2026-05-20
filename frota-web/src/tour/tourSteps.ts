export type TourArea = 'Início' | 'Dashboard' | 'Gerenciar' | 'Evolução' | 'Histórico' | 'Checklists' | 'Resultados' | 'Registro' | 'Usuários' | 'Encerramento'

export type TourStep = {
  path: string
  area: TourArea
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
    area: 'Início',
    title: '👋 Bem-vindo ao CGB Frota!',
    content:
      'Este é o sistema de gestão completa da frota da CGB Energia. Vou te apresentar todas as funcionalidades em poucos minutos. Use ▶ Próximo / ◀ Voltar para navegar, ou Pular para sair.',
    waitMs: 600,
  },

  // ─── Sidebar ────────────────────────────────────────────────────────────
  {
    path: '/',
    area: 'Dashboard',
    selector: '[data-tour="sidebar"]',
    title: '📍 Menu de Navegação',
    content:
      'Este é o menu lateral. Por aqui você acessa todas as áreas: Dashboard, Gerenciar, Registro, Checklists e (para super admin) Usuários.',
    placement: 'right',
  },

  // ─── Dashboard ──────────────────────────────────────────────────────────
  {
    path: '/',
    area: 'Dashboard',
    title: '📊 Dashboard — Visão Geral',
    content:
      'Observe a tela acima: aqui ficam os KPIs principais da frota — total de veículos, checklists do dia, pendências e evolução mensal. É a primeira tela ao entrar no sistema.',
    waitMs: 400,
  },

  // ─── Gerenciar ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar',
    area: 'Gerenciar',
    title: '🛠️ Gerenciar — Apontamentos de Defeitos',
    content:
      'Veja a tela acima: cada NC (Não Conformidade) encontrada nos checklists vira um apontamento aqui. Admins acompanham, documentam a resolução e encerram cada ocorrência.',
    waitMs: 900,
  },
  {
    path: '/gerenciar',
    area: 'Gerenciar',
    selector: '[data-tour="manage-stats"]',
    title: '📈 KPIs do Período',
    content:
      'Os cartões mostram totais de Apontamentos, Pendentes, Resolvidos e Defeitos Entrantes (de hoje). Clique em qualquer cartão para filtrar automaticamente a tabela abaixo.',
    placement: 'bottom',
  },
  {
    path: '/gerenciar',
    area: 'Gerenciar',
    selector: '[data-tour="manage-filtros"]',
    title: '🔍 Filtros Avançados',
    content:
      'Filtre por veículo, base, supervisor, gerência e intervalo de datas. Os filtros ativos são destacados e podem ser limpos individualmente.',
    placement: 'bottom',
  },
  {
    path: '/gerenciar',
    area: 'Gerenciar',
    selector: '[data-tour="manage-table"]',
    title: '📋 Tabela de Apontamentos',
    content:
      'Cada linha é um defeito: veículo, processo, descrição, data e status. Admins podem marcar como resolvido, adicionar evidências de resolução e acompanhar prazos.',
    placement: 'top',
  },

  // ─── Evolução ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/evolucao',
    area: 'Evolução',
    title: '📉 Evolução — Análise Temporal',
    content:
      'Veja o painel acima: mostra aberturas vs. resoluções ao longo do tempo, tempo médio de resolução e tendências mensais. Ferramenta essencial para análise estratégica da frota.',
    waitMs: 900,
  },
  {
    path: '/gerenciar/evolucao',
    area: 'Evolução',
    selector: '[data-tour="evolucao-kpis"]',
    title: '📊 KPIs de Velocidade',
    content:
      'Estes cartões mostram: total resolvidos, pendentes, dias médios de resolução e tendência vs. período anterior. Verde = meta atingida, vermelho = atenção necessária.',
    placement: 'bottom',
  },
  {
    path: '/gerenciar/evolucao',
    area: 'Evolução',
    selector: '[data-tour="evolucao-chart"]',
    title: '📈 Gráfico Barras + Linha',
    content:
      'As barras mostram resolvidos vs. pendentes por semana/mês. A linha vermelha indica o tempo médio de resolução em dias. Use as abas Gráfico / Heatmap / Defeitos para alternar visões.',
    placement: 'top',
  },

  // ─── Histórico ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/historico',
    area: 'Histórico',
    title: '📜 Histórico — Manutenções Concluídas',
    content:
      'Todas as manutenções corretivas já encerradas ficam aqui, com fotos do antes/depois e descrição da resolução. É possível gerar relatórios em PDF de qualquer registro.',
    waitMs: 800,
  },
  {
    path: '/gerenciar/historico',
    area: 'Histórico',
    selector: '[data-tour="historico-lista"]',
    title: '🗂️ Lista de Registros',
    content:
      'Cada card mostra: veículo, defeito corrigido, data de resolução e custo do reparo. Clique em "PDF" para gerar o relatório completo com fotos e dados da manutenção.',
    placement: 'top',
  },

  // ─── Checklists ──────────────────────────────────────────────────────────
  {
    path: '/gerenciar/checklists',
    area: 'Checklists',
    title: '✅ Checklists — Controle Diário',
    content:
      'Veja na tela acima quais veículos realizaram (ou não) o checklist do dia. É a ponte entre o operador no campo e a gestão central da frota.',
    waitMs: 800,
  },
  {
    path: '/gerenciar/checklists',
    area: 'Checklists',
    selector: '[data-tour="checklists-actions"]',
    title: '🔗 Link Público do Checklist',
    content:
      'Os operadores acessam um link único (/checklist) para preencher o checklist do veículo sem precisar de login. O formulário pede a placa, as perguntas de inspeção e fotos dos defeitos encontrados. Pode ser enviado por WhatsApp ou QR Code.',
    placement: 'bottom',
  },

  // ─── Resultados ─────────────────────────────────────────────────────────
  {
    path: '/gerenciar/checklists/resultados',
    area: 'Resultados',
    title: '📊 Resultados dos Checklists',
    content:
      'Todos os checklists enviados pelos operadores aparecem aqui. Filtre por tipo de veículo, veja os detalhes completos com fotos, edite (admin) ou exporte em CSV.',
    waitMs: 800,
  },

  // ─── Registro ──────────────────────────────────────────────────────────
  {
    path: '/registro',
    area: 'Registro',
    title: '🚗 Registro — Cadastro da Frota',
    content:
      'Veja a lista de veículos acima: este é o cadastro mestre da frota. Usuários autorizados adicionam veículos manualmente ou importam planilhas Excel de uma só vez.',
    waitMs: 800,
  },
  {
    path: '/registro',
    area: 'Registro',
    selector: '[data-tour="registro-actions"]',
    title: '➕ Importação e Cadastro',
    content:
      'Os botões "Importar Excel" e "Novo veículo" aparecem apenas para os usuários com permissão de modificar a base. Para os demais, a página é somente leitura.',
    placement: 'bottom',
  },

  // ─── Usuários ──────────────────────────────────────────────────────────
  {
    path: '/usuarios',
    area: 'Usuários',
    title: '👥 Usuários — Gestão de Acessos',
    content:
      'Apenas super admins acessam esta área. Aqui você cria novos usuários, define perfis (admin/usuário), reseta senhas e gerencia quem tem acesso ao sistema.',
    waitMs: 800,
  },

  // ─── Encerramento ──────────────────────────────────────────────────────
  {
    path: '/',
    area: 'Encerramento',
    title: '🎉 Tour Concluído!',
    content:
      'Você conheceu todas as áreas do sistema. Boa gestão da frota! Para rever o tour a qualquer momento, clique no botão "?" no canto inferior direito da tela.',
    waitMs: 400,
  },
]

export const TOUR_AUTOSTART_EMAILS = ['demo@cgbengenharia.com.br']

export function shouldAutoStartTour(email: string | undefined | null): boolean {
  if (!email) return false
  return TOUR_AUTOSTART_EMAILS.includes(email.trim().toLowerCase())
}

/** Áreas únicas em ordem de aparição, para o mini-mapa */
export const TOUR_AREAS: TourArea[] = TOUR_STEPS.reduce<TourArea[]>((acc, s) => {
  if (!acc.includes(s.area)) acc.push(s.area)
  return acc
}, [])
