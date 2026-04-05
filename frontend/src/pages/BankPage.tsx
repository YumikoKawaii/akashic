import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useBank } from '../hooks/useBanks'
import { useQuestions } from '../hooks/useQuestions'
import { useTests } from '../hooks/useTests'
import { useCategories } from '../hooks/useCategories'
import { usePassages, useCreatePassage, useDeletePassage } from '../hooks/usePassages'
import { useGenerateTest } from '../hooks/useTests'
import { useStartAttempt } from '../hooks/useAttempts'
import { QuestionFilter } from '../types'
import { questionsApi } from '../api/questions'
import QuestionCard from '../components/questions/QuestionCard'
import TestCard from '../components/tests/TestCard'
import GenerateTestForm from '../components/tests/GenerateTestForm'
import OrnateDivider from '../components/ui/OrnateDivider'
import OrnatePanel from '../components/ui/OrnatePanel'
import { FormField, Input, Textarea } from '../components/ui/FormField'
import Select from '../components/ui/Select'

type Tab = 'questions' | 'tests' | 'passages'

export default function BankPage() {
  const { bankId = '' } = useParams<{ bankId: string }>()
  const navigate        = useNavigate()
  const queryClient     = useQueryClient()

  const { data: bank }             = useBank(bankId)
  const { data: categories = [] }  = useCategories(bankId)
  const { data: tests = [] }       = useTests(bankId)
  const { data: passages = [] }    = usePassages(bankId)
  const createPassage              = useCreatePassage(bankId)
  const deletePassage              = useDeletePassage(bankId)
  const generateTest               = useGenerateTest(bankId)
  const startAttempt               = useStartAttempt()

  const [tab,           setTab]           = useState<Tab>('questions')
  const [filter,        setFilter]        = useState<QuestionFilter>({})
  const [page,          setPage]          = useState(1)
  const [pageInput,     setPageInput]     = useState('1')
  const [importing,     setImporting]     = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  // New passage form state
  const [pTitle,      setPTitle]      = useState('')
  const [pBody,       setPBody]       = useState('')
  const [pDifficulty, setPDifficulty] = useState('medium')
  const [pCategoryId, setPCategoryId] = useState('')
  const [pConfirmDel, setPConfirmDel] = useState<string | null>(null)

  // Passage test generate form state
  const [pgName,   setPgName]   = useState('')
  const [pgEasy,   setPgEasy]   = useState(0)
  const [pgMedium, setPgMedium] = useState(1)
  const [pgHard,   setPgHard]   = useState(0)
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
    setPage(1); setPageInput('1')
    setFilter(f => ({ ...f, [key]: f[key] === val ? undefined : val }))
  }

  const toggleTypeFilter = (val: string) => {
    setPage(1); setPageInput('1')
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
          {(['questions', 'passages', 'tests'] as Tab[]).map(t => (
            <button
              key={t}
              className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(t)}
              style={{ textTransform: 'capitalize' }}
            >
              {t}
            </button>
          ))}
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
                  onClick={() => { setPage(p => { setPageInput(String(p - 1)); return p - 1 }) }}
                  disabled={page <= 1}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  ← Prev
                </button>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = Math.max(1, Math.min(totalPages, parseInt(pageInput, 10)))
                      if (!isNaN(v)) { setPage(v); setPageInput(String(v)) }
                    }
                  }}
                  onBlur={() => setPageInput(String(page))}
                  className="form-input"
                  style={{ width: 56, textAlign: 'center', padding: '5px 4px' }}
                />
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'var(--ink-dim)', letterSpacing: '0.1em' }}>
                  / {totalPages}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setPage(p => { setPageInput(String(p + 1)); return p + 1 }) }}
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

      {tab === 'passages' && (
        <>
          <OrnateDivider />

          {/* Create passage form */}
          <div className="section-title">New Passage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Title">
                <Input value={pTitle} onChange={e => setPTitle(e.target.value)} placeholder="Passage title" />
              </FormField>
              <FormField label="Category">
                <Select
                  value={pCategoryId}
                  onChange={setPCategoryId}
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select category"
                />
              </FormField>
              <FormField label="Difficulty">
                <Select
                  value={pDifficulty}
                  onChange={setPDifficulty}
                  options={[
                    { value: 'easy',   label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard',   label: 'Hard' },
                  ]}
                />
              </FormField>
            </div>
            <FormField label="Body">
              <Textarea value={pBody} onChange={e => setPBody(e.target.value)} placeholder="Paste or type the passage text…" rows={6} />
            </FormField>
            <div>
              <button
                className="btn btn-primary"
                disabled={!pTitle.trim() || !pCategoryId || createPassage.isPending}
                onClick={async () => {
                  await createPassage.mutateAsync({ title: pTitle.trim(), body: pBody, difficulty: pDifficulty, category_id: pCategoryId })
                  setPTitle(''); setPBody('')
                }}
              >
                {createPassage.isPending ? '…' : '＋ Add Passage'}
              </button>
            </div>
          </div>

          <OrnateDivider />

          {/* Generate passage test */}
          <OrnatePanel>
            <div className="section-title" style={{ marginBottom: 14 }}>Generate Passage Test</div>
            <div className="flex flex-wrap gap-4 items-end">
              <FormField label="Test Name">
                <Input value={pgName} onChange={e => setPgName(e.target.value)} placeholder={`${bank?.name} — ${new Date().toLocaleString()}`} />
              </FormField>
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <FormField key={d} label={d.charAt(0).toUpperCase() + d.slice(1)}>
                  <input
                    type="number" min={0} max={20}
                    value={d === 'easy' ? pgEasy : d === 'medium' ? pgMedium : pgHard}
                    onChange={e => {
                      const v = Math.max(0, Number(e.target.value))
                      if (d === 'easy') setPgEasy(v)
                      else if (d === 'medium') setPgMedium(v)
                      else setPgHard(v)
                    }}
                    className="form-input"
                    style={{ width: 56, textAlign: 'center', padding: '7px 4px' }}
                  />
                </FormField>
              ))}
              <button
                className="btn btn-primary"
                disabled={pgEasy + pgMedium + pgHard === 0 || generateTest.isPending || startAttempt.isPending}
                style={{ height: 38, padding: '0 20px', whiteSpace: 'nowrap' }}
                onClick={async () => {
                  const test = await generateTest.mutateAsync({
                    name: pgName.trim() || `${bank?.name} — ${new Date().toLocaleString()}`,
                    config: { easy_count: pgEasy, medium_count: pgMedium, hard_count: pgHard, types: ['passage'] },
                  })
                  const attempt = await startAttempt.mutateAsync({ bankId, testId: test.id })
                  navigate(`/attempts/${attempt.id}`)
                }}
              >
                {generateTest.isPending || startAttempt.isPending ? '…' : '⚔ Generate'}
              </button>
            </div>
          </OrnatePanel>

          <OrnateDivider />

          {/* Passage list */}
          <div className="section-title">Passages ({passages.length})</div>
          {passages.length === 0 ? (
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center' }}>
              No passages yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4" style={{ maxWidth: 720 }}>
              {passages.map(p => (
                <div key={p.id} style={{ border: '1px solid var(--border-dim)', padding: '16px 20px' }}>
                  <div className="flex items-start justify-between gap-4" style={{ marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'var(--ink)' }}>{p.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)', marginTop: 2 }}>
                        {p.category?.name} · {p.difficulty} · {p.questions?.length ?? 0} questions
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pConfirmDel === p.id ? (
                        <>
                          <button className="btn btn-ghost" style={{ fontSize: '0.6rem', padding: '4px 10px', color: '#b03030', borderColor: 'rgba(176,48,48,0.4)' }}
                            onClick={() => { deletePassage.mutate(p.id); setPConfirmDel(null) }}>Yes</button>
                          <button className="btn btn-ghost" style={{ fontSize: '0.6rem', padding: '4px 10px' }}
                            onClick={() => setPConfirmDel(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn-danger" onClick={() => setPConfirmDel(p.id)}>✕</button>
                      )}
                    </div>
                  </div>
                  {p.body && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                      maxHeight: 120, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>
                      {p.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
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
