import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useBank } from '../hooks/useBanks'
import { useQuestions } from '../hooks/useQuestions'
import { useTests } from '../hooks/useTests'
import { useCategories } from '../hooks/useCategories'
import { QuestionFilter } from '../types'
import { questionsApi } from '../api/questions'
import QuestionCard from '../components/questions/QuestionCard'
import TestCard from '../components/tests/TestCard'
import GenerateTestForm from '../components/tests/GenerateTestForm'
import OrnateDivider from '../components/ui/OrnateDivider'

type Tab = 'questions' | 'tests'

export default function BankPage() {
  const { bankId = '' } = useParams<{ bankId: string }>()
  const navigate        = useNavigate()
  const queryClient     = useQueryClient()

  const { data: bank }             = useBank(bankId)
  const { data: categories = [] }  = useCategories(bankId)
  const { data: tests = [] }       = useTests(bankId)

  const [tab,           setTab]           = useState<Tab>('questions')
  const [filter,        setFilter]        = useState<QuestionFilter>({})
  const [page,          setPage]          = useState(1)
  const [importing,     setImporting]     = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportMessage(null)
    try {
      const result = await questionsApi.ingest(bankId, file)
      setImportMessage(`Imported ${result.created} question${result.created !== 1 ? 's' : ''} successfully.`)
      queryClient.invalidateQueries({ queryKey: ['questions', bankId] })
    } catch (err: any) {
      const data = err?.response?.data?.data
      if (data?.errors?.length) {
        setImportMessage(`Import failed: ${data.errors.map((e: any) => `row ${e.row}: ${e.message}`).join('; ')}`)
      } else {
        setImportMessage('Import failed. Please check the file format.')
      }
    } finally {
      setImporting(false)
    }
  }

  const { data: paged } = useQuestions(bankId, filter, page)
  const questions = paged?.data ?? []
  const total     = paged?.total ?? 0
  const totalPages = paged ? Math.ceil(paged.total / paged.limit) : 1

  if (!bank) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
      Loading…
    </div>
  )


  const toggleFilter = (key: 'difficulty', val: string) => {
    setPage(1)
    setFilter(f => ({ ...f, [key]: f[key] === val ? undefined : val }))
  }

  const toggleTypeFilter = (val: string) => {
    setPage(1)
    setFilter(f => {
      const current = f.types ?? []
      return { ...f, types: current.includes(val) ? current.filter(t => t !== val) : [...current, val] }
    })
  }

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{bank.name} — <span>Question Bank</span></h1>
          <p className="page-meta">{total} questions · {categories.length} categories</p>
        </div>
        <div className="page-header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml,.csv"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button className="btn btn-ghost" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            <span className="hidden sm:inline">{importing ? 'Importing…' : '⬆ Import'}</span>
            <span className="sm:hidden">⬆</span>
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(`/banks/${bankId}/questions/new`)}>
            <span className="hidden sm:inline">＋ Add Question</span>
            <span className="sm:hidden">＋</span>
          </button>
          <button
            className={`btn ${tab === 'questions' ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => setTab(t => t === 'questions' ? 'tests' : 'questions')}
          >
            {tab === 'questions' ? 'Tests' : 'Questions'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: total,                    label: 'Total',      color: 'var(--gold)' },
          { value: categories.length,        label: 'Categories', color: 'var(--ink-dim)' },
          { value: tests.length,             label: 'Tests',      color: 'var(--ink-dim)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {importMessage && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 4,
            border: `1px solid ${importMessage.startsWith('Import failed') ? '#b03030' : '#2a8a3a'}`,
            background: importMessage.startsWith('Import failed') ? 'rgba(176,48,48,0.08)' : 'rgba(42,138,58,0.08)',
            color: importMessage.startsWith('Import failed') ? '#b03030' : '#2a8a3a',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
          onClick={() => setImportMessage(null)}
        >
          {importMessage} <span style={{ opacity: 0.6 }}>✕</span>
        </div>
      )}

      {tab === 'questions' && (
        <>
          {/* Generate form */}
          <GenerateTestForm bank={bank} categories={categories} />

          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>Filter</span>
            {(['mcq', 'true_false', 'open'] as const).map(t => (
              <button key={t} className={`filter-chip ${filter.types?.includes(t) ? 'active' : ''}`} onClick={() => toggleTypeFilter(t)}>
                {t === 'mcq' ? 'MCQ' : t === 'true_false' ? 'True / False' : 'Open'}
              </button>
            ))}
            <div style={{ width: 1, height: 18, background: 'var(--border-dim)' }} />
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} className={`filter-chip ${filter.difficulty === d ? 'active' : ''}`} onClick={() => toggleFilter('difficulty', d)}>
                {d}
              </button>
            ))}
          </div>

          {/* Questions */}
          <div className="section-title">Questions</div>
          <div className="flex flex-col gap-3">
            {questions.length === 0 ? (
              <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center' }}>
                No questions found.{' '}
                <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => navigate(`/banks/${bankId}/questions/new`)}>
                  Add the first one →
                </span>
              </div>
            ) : (
              questions.map((q, i) => (
                <QuestionCard key={q.id} question={q} index={i} bankId={bankId} />
              ))
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2" style={{ marginTop: 8 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  ← Prev
                </button>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={page}
                  onChange={e => {
                    const v = Math.max(1, Math.min(totalPages, Number(e.target.value)))
                    if (!isNaN(v)) setPage(v)
                  }}
                  className="form-input"
                  style={{ width: 56, textAlign: 'center', padding: '5px 4px' }}
                />
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'var(--ink-dim)', letterSpacing: '0.1em' }}>
                  / {totalPages}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'tests' && (
        <>
          <OrnateDivider />
          <div className="section-title">Tests</div>
          {tests.length === 0 ? (
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center' }}>
              No tests yet. Generate one from the Questions tab.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map(t => <TestCard key={t.id} test={t} bankId={bankId} />)}
            </div>
          )}
        </>
      )}

      <div style={{ height: 32 }} />
    </>
  )
}
