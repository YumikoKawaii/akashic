import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import HomeLayout from './components/layout/HomeLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import BankPage from './pages/BankPage'
import QuestionFormPage from './pages/QuestionFormPage'
import PassageFormPage from './pages/PassageFormPage'
import AttemptPage from './pages/AttemptPage'
import ResultsPage from './pages/ResultsPage'
import { MagicCircleBackground } from './components/ui/MagicCircle'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  // Auth resolves almost instantly (token read from localStorage), so this
  // splash flashes for only a frame or two on reload. Render the SAME
  // right-anchored background circle the loaded Layout uses (leftOffset={0}),
  // with no extra centered spinner — otherwise reload pops a second,
  // differently-positioned detailed magic circle that then vanishes.
  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <MagicCircleBackground leftOffset={0} />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  return (
    <Routes>
      <Route element={<HomeLayout />}>
        <Route index element={<HomePage />} />
      </Route>
      <Route path="/banks" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/banks/:bankId" element={<BankPageKeyed />} />
        <Route path="/banks/:bankId/questions/new" element={<QuestionFormPage />} />
        <Route path="/banks/:bankId/questions/:questionId/edit" element={<QuestionFormPage />} />
        <Route path="/banks/:bankId/passages/new" element={<PassageFormPage />} />
        <Route path="/banks/:bankId/passages/:passageId/edit" element={<PassageFormPage />} />
      </Route>

      <Route path="/attempts/:bankId/:id" element={<AttemptPage />} />
      <Route path="/attempts/:bankId/:id/results" element={<ResultsPage />} />
      {/* Unmatched URLs render nothing inside <Routes>, which looks like a
          dead blank page — send them home instead. */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Switching records via the RecordSwitcher stays on the same route pattern, so
// BankPage would otherwise keep its mounted state (tab, page, filters, import
// banner) — and briefly show bank A's data under bank B's header. Remount per bank.
function BankPageKeyed() {
  const { bankId } = useParams<{ bankId: string }>()
  return <BankPage key={bankId} />
}

// Redirect already-logged-in users away from login
function LoginWrapper() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <LoginPage />
}
