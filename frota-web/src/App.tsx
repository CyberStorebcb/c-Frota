import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import { AppShell } from './components/layout/AppShell'
import { ApontamentosLayout } from './layouts/ApontamentosLayout'
import { DashboardPage } from './pages/DashboardPage'
import { EvolucaoPage } from './pages/EvolucaoPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { LoginPage } from './pages/LoginPage'
import { RegistroEspecialPage } from './pages/RegistroEspecialPage'
import { RequireAdmin } from './components/auth/RequireAdmin'
import { AdministradorPage } from './pages/AdministradorPage'
import { ManagePage } from './pages/ManagePage'
import { RegistroRoute } from './routes/RegistroRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro-especial" element={<RegistroEspecialPage />} />
      <Route path="/registro" element={<RegistroRoute />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/gerenciar" element={<ApontamentosLayout />}>
            <Route index element={<ManagePage />} />
            <Route path="evolucao" element={<EvolucaoPage />} />
            <Route path="historico" element={<HistoricoPage />} />
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
