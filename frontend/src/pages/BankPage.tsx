import { useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useBank, useMembers, useAddMember, useRemoveMember } from '../hooks/useBanks'
import { useQuestions } from '../hooks/useQuestions'
import { useTests, useGenerateTest } from '../hooks/useTests'
import { useStartAttempt } from '../hooks/useAttempts'
import { useCategories } from '../hooks/useCategories'
import { usePassages, useDeletePassage } from '../hooks/usePassages'
import { useAuth } from '../contexts/AuthContext'
import { QuestionFilter } from '../types'
import { questionsApi } from '../api/questions'
import QuestionCard from '../components/questions/QuestionCard'
import TestCard from '../components/tests/TestCard'
import GenerateTestForm from '../components/tests/GenerateTestForm'
import OrnateDivider from '../components/ui/OrnateDivider'
import OrnatePanel from '../components/ui/OrnatePanel'
import { FormField, Input } from '../components/ui/FormField'

type Tab = 'questions' | 'tests' | 'passages'

const QUESTION_TYPES = [
  { value: 'mcq',                  label: 'MCQ' },
  { value: 'tf_ng',                label: 'T/F/NG' },
  { value: 'yn_ng',                label: 'Y/N/NG' },
  { value: 'sentence_completion',  label: 'Sentence' },
  { value: 'form_completion',      label: 'Form' },
  { value: 'short_answer',         label: 'Short Answer' },
  { value: 'matching_headings',    label: 'Match Headings' },
  { value: 'matching_information', label: 'Match Info' },
  { value: 'matching_features',    label: 'Match Features' },
]

const questionTypeLabel = (value: string) =>
  QUESTION_TYPES.find(t => t.value === value)?.label ?? value

export default function BankPage() {
  const { bankId = '' }       = useParams<{ bankId: string }>()
  const navigate              = useNavigate()
  const queryClient           = useQueryClient()
  const [searchParams]        = useSearchParams()

  const { user }                   = useAuth()
  const { data: bank }             = useBank(bankId)
  const { data: categories = [] }  = useCategories(bankId)
  const { data: tests = [] }       = useTests(bankId)
  const { data: passages = [] }    = usePassages(bankId)
  const { data: members = [] }     = useMembers(bankId)
  const deletePassage              = useDeletePassage(bankId)
  const generateTest               = useGenerateTest(bankId)
  const startAttempt               = useStartAttempt()
  const addMember                  = useAddMember(bankId)
  const removeMember               = useRemoveMember(bankId)

  const myRole    = bank?.my_role ?? 'viewer'
  const canEdit   = myRole === 'owner' || myRole === 'editor'
  const isOwner   = myRole === 'owner'

  const [tab,           setTab]           = useState<Tab>((searchParams.get('tab') as Tab) ?? 'questions')
  const [filter,        setFilter]        = useState<QuestionFilter>({})
  const [importing,     setImporting]     = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [pConfirmDel,   setPConfirmDel]   = useState<number | null>(null)

  const [generatingPassageId, setGeneratingPassageId] = useState<number | null>(null)

  const handleGenerateFromPassage = async (p: typeof passages[0]) => {
    setGeneratingPassageId(p.id)
    try {
      const groups = p.groups ?? []
      const easy   = groups.filter(g => g.difficulty === 'easy').length
      const medium = groups.filter(g => g.difficulty === 'medium').length
      const hard   = groups.filter(g => g.difficulty === 'hard').length
      const test = await generateTest.mutateAsync({
        name: p.title,
        config: { easy_count: easy, medium_count: medium, hard_count: hard, passage_ids: [p.id] },
      })
      const attempt = await startAttempt.mutateAsync({ bankId, testId: test.id })
      navigate(`/attempts/${attempt.id}`)
    } finally {
      setGeneratingPassageId(null)
    }
  }

  const [shareOpen,  setShareOpen]  = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole,  setShareRole]  = useState<'editor' | 'viewer'>('viewer')
  const [shareError, setShareError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''
    setImporting(true)
    setImportMessage(null)

    let totalCreated = 0
    const fileErrors: string[] = []

    for (const file of files) {
      try {
        const result = await questionsApi.ingest(bankId, file)
        totalCreated += result.created
      } catch (err: any) {
        const data = err?.response?.data
        const detail = data?.errors?.length
          ? data.errors.map((e: any) => `row ${e.row}: ${e.message}`).join('; ')
          : data?.error ?? 'invalid format'
        fileErrors.push(`${file.name}: ${detail}`)
      }
    }

    queryClient.invalidateQueries({ queryKey: ['questions', bankId] })
    queryClient.invalidateQueries({ queryKey: ['passages', bankId] })

    if (fileErrors.length === 0) {
      setImportMessage(`Imported ${totalCreated} item${totalCreated !== 1 ? 's' : ''} from ${files.length} file${files.length !== 1 ? 's' : ''}.`)
    } else if (totalCreated > 0) {
      setImportMessage(`Imported ${totalCreated} item${totalCreated !== 1 ? 's' : ''}. Errors: ${fileErrors.join(' | ')}`)
    } else {
      setImportMessage(`Import failed — ${fileErrors.join(' | ')}`)
    }

    setImporting(false)
  }

  const { data: questions = [] } = useQuestions(bankId, filter)

  if (!bank) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
      Loading…
    </div>
  )

  const toggleTypeFilter = (val: string) => {
    setFilter(f => ({ ...f, type: f.type === val ? undefined : val }))
  }

  const toggleDiffFilter = (val: string) => {
    setFilter(f => ({ ...f, difficulty: f.difficulty === val ? undefined : val }))
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{bank.name} — <span>Question Bank</span></h1>
          <p className="page-meta">
            {questions.length} questions · {categories.length} categories
            <span style={{
              marginLeft: 10,
              fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.12em',
              padding: '2px 7px', border: '1px solid var(--border-dim)',
              color: myRole === 'owner' ? 'var(--gold)' : 'var(--ink-dim)',
              textTransform: 'uppercase',
            }}>
              {myRole}
            </span>
          </p>
        </div>
        <div className="page-header-actions">
          {canEdit && (
            <>
              <input ref={fileInputRef} type="file" accept=".json,.yaml,.yml,.csv" multiple style={{ display: 'none' }} onChange={handleImport} />
              <button className="btn btn-ghost" disabled={importing} onClick={() => fileInputRef.current?.click()}>
                <span className="hidden sm:inline">{importing ? 'Importing…' : '⬆ Import'}</span>
                <span className="sm:hidden">⬆</span>
              </button>
            </>
          )}
          {isOwner && (
            <button className="btn btn-ghost" onClick={() => setShareOpen(v => !v)}>
              ⇄ Share
            </button>
          )}
          {(['questions', 'passages', 'tests'] as Tab[]).map(t => (
            <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {shareOpen && isOwner && (
        <OrnatePanel>
          <div className="section-title" style={{ marginBottom: 14 }}>Share Bank</div>
          <div className="flex gap-3 items-end flex-wrap" style={{ marginBottom: 16 }}>
            <FormField label="Email">
              <Input
                value={shareEmail}
                onChange={e => { setShareEmail(e.target.value); setShareError(null) }}
                placeholder="user@example.com"
                style={{ width: 220 }}
              />
            </FormField>
            <FormField label="Role">
              <div className="flex gap-1" style={{ border: '1px solid var(--border-dim)', padding: 3, borderRadius: 4 }}>
                {(['viewer', 'editor'] as const).map(r => (
                  <button key={r} onClick={() => setShareRole(r)} style={{
                    fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em',
                    padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 2,
                    background: shareRole === r ? 'var(--gold-dim)' : 'transparent',
                    color: shareRole === r ? 'var(--bg)' : 'var(--ink-dim)',
                    textTransform: 'uppercase',
                  }}>
                    {r}
                  </button>
                ))}
              </div>
            </FormField>
            <button
              className="btn btn-primary"
              disabled={!shareEmail.trim() || addMember.isPending}
              onClick={async () => {
                try {
                  await addMember.mutateAsync({ email: shareEmail.trim(), role: shareRole })
                  setShareEmail('')
                  setShareError(null)
                } catch {
                  setShareError('User not found — they must sign in once first.')
                }
              }}
            >
              {addMember.isPending ? '…' : '＋ Add'}
            </button>
          </div>
          {shareError && <div style={{ fontSize: '0.8rem', color: '#b03030', marginBottom: 10 }}>{shareError}</div>}
          {members.length > 0 && (
            <div className="flex flex-col gap-2">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between gap-3" style={{ fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--border-dim)' }}>
                  <div>
                    <span style={{ color: 'var(--ink)' }}>{m.user?.name}</span>
                    <span style={{ color: 'var(--ink-dim)', marginLeft: 8, fontSize: '0.75rem' }}>{m.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>{m.role}</span>
                    {m.user_id !== user?.id && (
                      <button className="btn-danger" style={{ fontSize: '0.6rem', padding: '2px 6px' }} onClick={() => removeMember.mutate(m.user_id)}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </OrnatePanel>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: questions.length, label: 'Total',      color: 'var(--gold)' },
          { value: categories.length, label: 'Categories', color: 'var(--ink-dim)' },
          { value: tests.length,     label: 'Tests',      color: 'var(--ink-dim)' },
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
            padding: '10px 16px', borderRadius: 4,
            border: `1px solid ${importMessage.startsWith('Import failed') ? '#b03030' : '#2a8a3a'}`,
            background: importMessage.startsWith('Import failed') ? 'rgba(176,48,48,0.08)' : 'rgba(42,138,58,0.08)',
            color: importMessage.startsWith('Import failed') ? '#b03030' : '#2a8a3a',
            fontSize: '0.85rem', cursor: 'pointer',
          }}
          onClick={() => setImportMessage(null)}
        >
          {importMessage} <span style={{ opacity: 0.6 }}>✕</span>
        </div>
      )}

      {tab === 'questions' && (
        <>
          {bank && <GenerateTestForm bank={bank} categories={categories} />}

          <div className="flex gap-2 flex-wrap items-center">
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>Filter</span>
            {QUESTION_TYPES.map(t => (
              <button key={t.value} className={`filter-chip ${filter.type === t.value ? 'active' : ''}`} onClick={() => toggleTypeFilter(t.value)}>
                {t.label}
              </button>
            ))}
            <div style={{ width: 1, height: 18, background: 'var(--border-dim)' }} />
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} className={`filter-chip ${filter.difficulty === d ? 'active' : ''}`} onClick={() => toggleDiffFilter(d)}>
                {d}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="section-title" style={{ marginBottom: 0 }}>Questions</div>
            {canEdit && <button className="btn btn-ghost" onClick={() => navigate(`/banks/${bankId}/questions/new`)}>＋ Add Question</button>}
          </div>
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
          </div>
        </>
      )}

      {tab === 'passages' && (
        <>
          <OrnateDivider />
          <div className="flex items-center justify-between">
            <div className="section-title" style={{ marginBottom: 0 }}>Passages ({passages.length})</div>
            {canEdit && <button className="btn btn-ghost" onClick={() => navigate(`/banks/${bankId}/passages/new`)}>＋ Add Passage</button>}
          </div>
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
                        {p.category?.name} · {p.difficulty}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: '0.6rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
                        disabled={generatingPassageId === p.id}
                        onClick={() => handleGenerateFromPassage(p)}
                      >
                        {generatingPassageId === p.id ? '…' : '⚔ Generate'}
                      </button>
                      {canEdit && (
                        <>
                          {pConfirmDel === p.id ? (
                            <>
                              <button className="btn btn-ghost" style={{ fontSize: '0.6rem', padding: '4px 10px', color: '#b03030', borderColor: 'rgba(176,48,48,0.4)' }}
                                onClick={() => { deletePassage.mutate(String(p.id)); setPConfirmDel(null) }}>Yes</button>
                              <button className="btn btn-ghost" style={{ fontSize: '0.6rem', padding: '4px 10px' }}
                                onClick={() => setPConfirmDel(null)}>Cancel</button>
                            </>
                          ) : (
                            <button className="btn-danger" onClick={() => setPConfirmDel(p.id)}>✕</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
	                  {p.body && (
	                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
	                      maxHeight: 120, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>
	                      {p.body}
	                    </p>
	                  )}
	                  {p.groups && p.groups.length > 0 && (
	                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
	                      {p.groups.map(g => (
	                        <span key={g.id} style={{
	                          border: '1px solid var(--border-dim)',
	                          color: 'var(--ink-dim)',
	                          fontSize: '0.68rem',
	                          padding: '4px 8px',
	                          fontFamily: 'Cinzel, serif',
	                        }}>
	                          {questionTypeLabel(g.type)} · {g.questions?.length ?? 0}
	                        </span>
	                      ))}
	                    </div>
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
