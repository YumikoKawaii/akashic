import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import BankPage from './pages/BankPage'
import QuestionFormPage from './pages/QuestionFormPage'
import PassageFormPage from './pages/PassageFormPage'
import AttemptPage from './pages/AttemptPage'
import ResultsPage from './pages/ResultsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
      Loading…
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  return (
    <Routes>
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

      <Route path="/attempts/:id" element={<AttemptPage />} />
      <Route path="/attempts/:id/results" element={<ResultsPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginWrapper />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Redirect already-logged-in users away from login
function LoginWrapper() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <LoginPage />
}
