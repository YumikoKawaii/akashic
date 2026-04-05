import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/layout/Layout'
import BankPage from './pages/BankPage'
import QuestionFormPage from './pages/QuestionFormPage'
import PassageFormPage from './pages/PassageFormPage'
import AttemptPage from './pages/AttemptPage'
import ResultsPage from './pages/ResultsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Main layout with sidebar */}
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/banks" replace />} />
            <Route path="/banks" element={
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
                Select a bank or create one to begin.
              </div>
            } />
            <Route path="/banks/:bankId" element={<BankPage />} />
            <Route path="/banks/:bankId/questions/new" element={<QuestionFormPage />} />
            <Route path="/banks/:bankId/questions/:questionId/edit" element={<QuestionFormPage />} />
            <Route path="/banks/:bankId/passages/new" element={<PassageFormPage />} />
            <Route path="/banks/:bankId/passages/:passageId/edit" element={<PassageFormPage />} />
          </Route>

          {/* Full-screen (no sidebar) */}
          <Route path="/attempts/:id" element={<AttemptPage />} />
          <Route path="/attempts/:id/results" element={<ResultsPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
