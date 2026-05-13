import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import { RequireAdmin } from './components/auth/RequireAdmin'
import { AppShell } from './components/layout/AppShell'
import { ApontamentosLayout } from './layouts/ApontamentosLayout'
import { UsuariosPage } from './pages/AdministradorPage'
import { ChecklistPublicoPage } from './pages/ChecklistPublicoPage'
import { ChecklistResultadosPage } from './pages/ChecklistResultadosPage'
import { ChecklistsPage } from './pages/ChecklistsPage'
import { DashboardPage } from './pages/DashboardPage'
import { EvolucaoPage } from './pages/EvolucaoPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { PrivacyPage, TermsPage } from './pages/LegalPages'
import { LoginPage } from './pages/LoginPage'
import { ManagePage } from './pages/ManagePage'
import { RegistroEspecialPage } from './pages/RegistroEspecialPage'
import { VeiculosStatusPage } from './pages/VeiculosStatusPage'
import { RegistroRoute } from './routes/RegistroRoute'

export default function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/registro-especial" element={<RegistroEspecialPage />} />
      <Route path="/registro" element={<RegistroRoute />} />
      {/* Link público único para motoristas preencherem checklists */}
      <Route path="/checklist" element={<ChecklistPublicoPage />} />
      {/* Links antigos por tipo agora voltam para o fluxo único */}
      <Route path="/checklist/:tipo" element={<Navigate to="/checklist" replace />} />

      {/* Rotas autenticadas */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/gerenciar" element={<ApontamentosLayout />}>
            <Route index element={<ManagePage />} />
            <Route path="evolucao" element={<EvolucaoPage />} />
            <Route path="historico" element={<HistoricoPage />} />
            <Route path="checklists" element={<ChecklistsPage />} />
            <Route path="checklists/resultados" element={<ChecklistResultadosPage />} />
          </Route>
          <Route path="/veiculos/status" element={<VeiculosStatusPage />} />
          <Route path="/veiculos" element={<Navigate to="/gerenciar" replace />} />
          <Route
            path="/usuarios"
            element={
              <RequireAdmin>
                <UsuariosPage />
              </RequireAdmin>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
