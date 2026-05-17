import { useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useBank, useMembers, useAddMember, useRemoveMember } from '../hooks/useBanks'
import { useQuestions } from '../hooks/useQuestions'
import { useTests } from '../hooks/useTests'
import { useCategories } from '../hooks/useCategories'
import { usePassages, usePassagesPaged, useDeletePassage } from '../hooks/usePassages'
import { useAuth } from '../contexts/AuthContext'
import { QuestionFilter } from '../types'
import { questionsApi } from '../api/questions'
import QuestionCard from '../components/questions/QuestionCard'
import TestCard from '../components/tests/TestCard'
import GenerateTab from '../components/tests/GenerateTab'
import OrnateDivider from '../components/ui/OrnateDivider'
import OrnatePanel from '../components/ui/OrnatePanel'
import { FormField, Input } from '../components/ui/FormField'
import { Spinner } from '../components/ui/MagicCircle'
import MagicCircle from '../components/ui/MagicCircle'
import RuneCorners from '../components/ui/RuneCorners'

type Tab = 'questions' | 'passages' | 'generate' | 'tests'

const TAB_LABELS: Record<Tab, string> = {
  questions: 'Questions',
  passages:  'Passages',
  generate:  'Generate',
  tests:     'Tests',
}

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

const DIFF_COLORS = {
  easy:   { dot: '#2a8a3a', border: 'rgba(42,138,58,0.45)',   bg: 'rgba(42,138,58,0.07)' },
  medium: { dot: '#9a7018', border: 'rgba(154,112,24,0.45)',  bg: 'rgba(154,112,24,0.07)' },
  hard:   { dot: '#b03030', border: 'rgba(176,48,48,0.45)',   bg: 'rgba(176,48,48,0.07)' },
}

export default function BankPage() {
  const { bankId = '' }       = useParams<{ bankId: string }>()
  const navigate              = useNavigate()
  const queryClient           = useQueryClient()
  const [searchParams]        = useSearchParams()

  const { user }                   = useAuth()
  const { data: bank }             = useBank(bankId)
  const { data: categories = [] }  = useCategories(bankId)
  const { data: tests = [] }       = useTests(bankId)
  const { data: passages = [] }    = usePassages(bankId)   // full list for GenerateTab
  const { data: members = [] }     = useMembers(bankId)
  const deletePassage              = useDeletePassage(bankId)
  const addMember                  = useAddMember(bankId)
  const removeMember               = useRemoveMember(bankId)

  const myRole  = bank?.my_role ?? 'viewer'
  const canEdit = myRole === 'owner' || myRole === 'editor'
  const isOwner = myRole === 'owner'

  const [tab,           setTab]           = useState<Tab>((searchParams.get('tab') as Tab) ?? 'questions')
  const [filter,        setFilter]        = useState<QuestionFilter>({})
  const [page,          setPage]          = useState(1)
  const [passagePage,   setPassagePage]   = useState(1)

  const { data: passagePageData }  = usePassagesPaged(bankId, passagePage)
  const pagedPassages      = passagePageData?.data      ?? []
  const totalPassages      = passagePageData?.total     ?? passages.length
  const totalPassagePages  = Math.max(1, Math.ceil(totalPassages / (passagePageData?.page_size ?? 10)))
  const [importing,     setImporting]     = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [pConfirmDel,   setPConfirmDel]   = useState<number | null>(null)

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

  const { data: questionPage } = useQuestions(bankId, filter, page)
  const questions   = questionPage?.data      ?? []
  const totalQ      = questionPage?.total     ?? 0
  const totalPages  = Math.max(1, Math.ceil(totalQ / (questionPage?.page_size ?? 20)))

  if (!bank) return (
    <div className="flex items-center justify-center h-full">
      <Spinner />
    </div>
  )

  const toggleTypeFilter = (val: string) => {
    setPage(1)
    setFilter(f => ({ ...f, type: f.type === val ? undefined : val }))
  }

  const toggleDiffFilter = (val: string) => {
    setPage(1)
    setFilter(f => ({ ...f, difficulty: f.difficulty === val ? undefined : val }))
  }

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────── */}
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
            <button className="btn btn-ghost" onClick={() => setShareOpen(v => !v)}>⇄ Share</button>
          )}
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Share panel ─────────────────────────────────────────── */}
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

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { value: totalQ,             label: 'Questions',  color: 'var(--gold)',     circle: { variant: 'orbit' as const, color: 'var(--gold)',    opacity: 0.90 } },
          { value: passages.length,   label: 'Passages',   color: 'var(--ink-dim)',  circle: { variant: 'halo'  as const, color: '#2a8a3a',         opacity: 0.85 } },
          { value: categories.length, label: 'Categories', color: 'var(--ink-dim)',  circle: { variant: 'sigil' as const, color: 'var(--gold-dim)', opacity: 0.85 } },
          { value: tests.length,      label: 'Tests',      color: 'var(--ink-dim)',  circle: { variant: 'spark' as const, color: '#6b4c8a',          opacity: 0.82 } },
        ]).map(s => (
          <div key={s.label} className="stat-card">
            <RuneCorners color="var(--gold-dim)" opacity={0.60} />
            <div style={{ position: 'absolute', bottom: -100, right: -100, width: 200, height: 200, color: s.circle.color, opacity: s.circle.opacity, pointerEvents: 'none', zIndex: 0 }}>
              <MagicCircle variant={s.circle.variant} speed={4} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Import message ──────────────────────────────────────── */}
      {importMessage && (
        <div
          style={{
            padding: '10px 16px',
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

      {/* ── Questions tab ───────────────────────────────────────── */}
      {tab === 'questions' && (
        <>
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
            <div className="section-title" style={{ marginBottom: 0 }}>
              Questions ({totalQ}
              {totalPages > 1 && <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--ink-dim)', letterSpacing: '0.05em' }}> — page {page}/{totalPages}</span>}
              )
            </div>
            {canEdit && (
              <button className="btn btn-ghost" onClick={() => navigate(`/banks/${bankId}/questions/new`)}>＋ Add Question</button>
            )}
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
                <QuestionCard key={q.id} question={q} index={(page - 1) * 20 + i} bankId={bankId} />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3" style={{ paddingTop: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.7rem', padding: '5px 14px' }}
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 28, height: 28,
                      fontFamily: 'Cinzel, serif', fontSize: '0.6rem',
                      border: '1px solid',
                      borderColor: p === page ? 'var(--gold)' : 'var(--border-dim)',
                      background: p === page ? 'var(--gold)' : 'transparent',
                      color: p === page ? 'var(--bg)' : 'var(--ink-dim)',
                      cursor: 'pointer', borderRadius: 2,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.7rem', padding: '5px 14px' }}
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
              >
                Next →
              </button>
            </div>
          )}

        </>
      )}

      {/* ── Passages tab ────────────────────────────────────────── */}
      {tab === 'passages' && (
        <>
          <OrnateDivider />
          <div className="flex items-center justify-between">
            <div className="section-title" style={{ marginBottom: 0 }}>
              Passages ({totalPassages}
              {totalPassagePages > 1 && <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--ink-dim)', letterSpacing: '0.05em' }}> — page {passagePage}/{totalPassagePages}</span>}
              )
            </div>
            {canEdit && (
              <button className="btn btn-ghost" onClick={() => navigate(`/banks/${bankId}/passages/new`)}>＋ Add Passage</button>
            )}
          </div>

          {pagedPassages.length === 0 ? (
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center' }}>
              No passages yet. Import a JSON/YAML file or add one manually.
            </div>
          ) : (
            <div className="flex flex-col gap-3" style={{ maxWidth: 760 }}>
              {pagedPassages.map(p => {
                const dc = DIFF_COLORS[p.difficulty] ?? DIFF_COLORS.medium
                return (
                  <div key={p.id} style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--border-dim)', padding: '16px 20px', background: 'var(--bg-card)' }}>
                    {/* Top-left — difficulty color */}
                    <div style={{ position: 'absolute', top: -44, left: -44, width: 110, height: 110, color: dc.dot, opacity: 0.55, pointerEvents: 'none', zIndex: 0 }}>
                      <MagicCircle variant="full" speed={5} />
                    </div>
                    {/* Bottom-right — purple */}
                    <div style={{ position: 'absolute', bottom: -44, right: -44, width: 110, height: 110, color: '#6b4c8a', opacity: 0.45, pointerEvents: 'none', zIndex: 0 }}>
                      <MagicCircle variant="full" speed={5} />
                    </div>
                    <div className="flex items-start justify-between gap-4" style={{ marginBottom: 8, position: 'relative', zIndex: 1 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 3 }}>
                          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'var(--ink)' }}>{p.title}</span>
                          <span style={{ fontSize: '0.6rem', padding: '1px 7px', border: `1px solid ${dc.border}`, color: dc.dot, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', background: dc.bg }}>
                            {p.difficulty}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>
                          {p.category?.name}{p.category?.name && ' · '}
                          {p.groups?.length ?? 0} group{(p.groups?.length ?? 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2 items-center flex-shrink-0">
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.6rem', padding: '4px 10px' }}
                            onClick={() => navigate(`/banks/${bankId}/passages/${p.id}`)}
                          >
                            Edit
                          </button>
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
                        </div>
                      )}
                    </div>

                    {p.paragraphs && p.paragraphs.length > 0 && (
                      <p style={{ position: 'relative', zIndex: 1, fontSize: '0.85rem', color: 'var(--ink-dim)', lineHeight: 1.6, maxHeight: 100, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)', marginBottom: 8 }}>
                        {p.paragraphs[0].text}
                      </p>
                    )}

                    {p.groups && p.groups.length > 0 && (
                      <div className="flex flex-wrap gap-1" style={{ marginTop: 4, position: 'relative', zIndex: 1 }}>
                        {p.groups.map(g => {
                          const gc = DIFF_COLORS[g.difficulty] ?? DIFF_COLORS.medium
                          return (
                            <span key={g.id} style={{ fontSize: '0.6rem', padding: '2px 7px', border: `1px solid ${gc.border}`, color: gc.dot, fontFamily: 'Cinzel, serif', background: gc.bg, letterSpacing: '0.06em' }}>
                              {questionTypeLabel(g.type)} · {g.questions?.length ?? 0}q
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {totalPassagePages > 1 && (
            <div className="flex items-center justify-center gap-3" style={{ paddingTop: 8, maxWidth: 760 }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.7rem', padding: '5px 14px' }}
                onClick={() => setPassagePage(p => p - 1)}
                disabled={passagePage === 1}
              >
                ← Prev
              </button>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalPassagePages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPassagePage(p)}
                    style={{
                      width: 28, height: 28,
                      fontFamily: 'Cinzel, serif', fontSize: '0.6rem',
                      border: '1px solid',
                      borderColor: p === passagePage ? 'var(--gold)' : 'var(--border-dim)',
                      background: p === passagePage ? 'var(--gold)' : 'transparent',
                      color: p === passagePage ? 'var(--bg)' : 'var(--ink-dim)',
                      cursor: 'pointer', borderRadius: 2,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.7rem', padding: '5px 14px' }}
                onClick={() => setPassagePage(p => p + 1)}
                disabled={passagePage >= totalPassagePages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Generate tab ────────────────────────────────────────── */}
      {tab === 'generate' && bank && (
        <GenerateTab bank={bank} categories={categories} passages={passages} />
      )}

      {/* ── Tests tab ───────────────────────────────────────────── */}
      {tab === 'tests' && (
        <>
          <OrnateDivider />
          <div className="section-title">Tests ({tests.length})</div>
          {tests.length === 0 ? (
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center' }}>
              No tests yet.{' '}
              <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setTab('generate')}>
                Generate one →
              </span>
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
