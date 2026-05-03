import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ApontamentosLayout } from './layouts/ApontamentosLayout'
import { DashboardPage } from './pages/DashboardPage'
import { EvolucaoPage } from './pages/EvolucaoPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { ManagePage } from './pages/ManagePage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="/gerenciar" element={<ApontamentosLayout />}>
          <Route index element={<ManagePage />} />
          <Route path="evolucao" element={<EvolucaoPage />} />
          <Route path="historico" element={<HistoricoPage />} />
        </Route>
        <Route path="/veiculos" element={<Navigate to="/gerenciar" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
