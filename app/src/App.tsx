import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PlannerProvider } from './lib/plannerContext'
import Layout from './components/Layout'
import Browser from './pages/Browser'
import Planner from './pages/Planner'
import ShoppingList from './pages/ShoppingList'

export default function App() {
  return (
    <PlannerProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Browser />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/shopping" element={<ShoppingList />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </PlannerProvider>
  )
}
