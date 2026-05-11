import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import { RequireAdmin } from './components/auth/RequireAdmin'
import { AppShell } from './components/layout/AppShell'
import { ApontamentosLayout } from './layouts/ApontamentosLayout'
import { AdministradorPage } from './pages/AdministradorPage'
import { ChecklistPublicoPage } from './pages/ChecklistPublicoPage'
import { ChecklistResultadosPage } from './pages/ChecklistResultadosPage'
import { ChecklistsPage } from './pages/ChecklistsPage'
import { DashboardPage } from './pages/DashboardPage'
import { EvolucaoPage } from './pages/EvolucaoPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { LoginPage } from './pages/LoginPage'
import { ManagePage } from './pages/ManagePage'
import { RegistroEspecialPage } from './pages/RegistroEspecialPage'
import { RegistroRoute } from './routes/RegistroRoute'

export default function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro-especial" element={<RegistroEspecialPage />} />
      <Route path="/registro" element={<RegistroRoute />} />
      {/* Link público para preenchimento de checklist: /checklist/sky, /checklist/munck, etc. */}
      <Route path="/checklist/:tipo" element={<ChecklistPublicoPage />} />

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
          <Route path="/veiculos" element={<Navigate to="/gerenciar" replace />} />
          <Route
            path="/administrador"
            element={
              <RequireAdmin>
                <AdministradorPage />
              </RequireAdmin>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
