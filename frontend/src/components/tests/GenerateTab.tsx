import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, Category, Passage } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input } from '../ui/FormField'
import MultiSelect from '../ui/MultiSelect'
import { useGenerateTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'

type GenMode = 'standalone' | 'passage'

const TYPE_OPTIONS = [
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

const DIFF_COLORS = {
  easy:   { dot: '#2a8a3a', border: 'rgba(42,138,58,0.45)',   bg: 'rgba(42,138,58,0.07)' },
  medium: { dot: '#9a7018', border: 'rgba(154,112,24,0.45)',  bg: 'rgba(154,112,24,0.07)' },
  hard:   { dot: '#b03030', border: 'rgba(176,48,48,0.45)',   bg: 'rgba(176,48,48,0.07)' },
}

function autoSplit(total: number): [number, number, number] {
  const easy = Math.round(total * 0.25)
  const hard = Math.round(total * 0.25)
  return [easy, Math.max(0, total - easy - hard), hard]
}

interface Props { bank: Bank; categories: Category[]; passages: Passage[] }

export default function GenerateTab({ bank, categories, passages }: Props) {
  const [mode, setMode] = useState<GenMode>('standalone')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="section-title" style={{ marginBottom: 0, flex: 1 }}>Generate Test</div>
        <div className="flex gap-1" style={{ border: '1px solid var(--border-dim)', padding: 3, borderRadius: 4 }}>
          {(['standalone', 'passage'] as GenMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                fontFamily: 'Cinzel, serif', fontSize: '0.62rem', letterSpacing: '0.12em',
                padding: '5px 16px', border: 'none', cursor: 'pointer', borderRadius: 2,
                background: mode === m ? 'var(--gold-dim)' : 'transparent',
                color: mode === m ? 'var(--bg)' : 'var(--ink-dim)',
                textTransform: 'uppercase', transition: 'all 0.18s',
              }}
            >
              {m === 'standalone' ? 'Standalone' : 'Passage'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'standalone'
        ? <StandaloneForm bank={bank} categories={categories} />
        : <PassageForm bank={bank} passages={passages} />
      }
    </div>
  )
}

/* ── Standalone ─────────────────────────────────────────────────── */

function StandaloneForm({ bank, categories }: { bank: Bank; categories: Category[] }) {
  const navigate = useNavigate()
  const generate = useGenerateTest(String(bank.id))
  const start    = useStartAttempt()
  const def      = bank.default_config

  const [name,       setName]       = useState('')
  const [catIds,     setCatIds]     = useState<string[]>([])
  const [types,      setTypes]      = useState<string[]>([])
  const [diffMode,   setDiffMode]   = useState<'difficulty' | 'count'>('difficulty')
  const [easy,       setEasy]       = useState(def.easy_count   ?? 3)
  const [medium,     setMedium]     = useState(def.medium_count ?? 5)
  const [hard,       setHard]       = useState(def.hard_count   ?? 2)
  const [totalCount, setTotalCount] = useState(10)
  const diffTotal = easy + medium + hard

  const handleTotalChange = (n: number) => {
    const [e, m, h] = autoSplit(Math.max(0, n))
    setEasy(e); setMedium(m); setHard(h)
  }

  const handleGenerate = async () => {
    const categoryIds = catIds.map(Number).filter(Boolean)
    const config = diffMode === 'count'
      ? (() => { const [e, m, h] = autoSplit(totalCount); return { easy_count: e, medium_count: m, hard_count: h, ...(categoryIds.length ? { category_ids: categoryIds } : {}), ...(types.length ? { types } : {}) } })()
      : { easy_count: easy, medium_count: medium, hard_count: hard, ...(categoryIds.length ? { category_ids: categoryIds } : {}), ...(types.length ? { types } : {}) }
    const test = await generate.mutateAsync({
      name: name.trim() || `${bank.name} — ${new Date().toLocaleString()}`,
      config,
    })
    const attempt = await start.mutateAsync({ bankId: String(bank.id), testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  const isPending = generate.isPending || start.isPending

  return (
    <OrnatePanel>
      <p style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', marginBottom: 20, lineHeight: 1.6 }}>
        Selects questions that are not attached to any passage group.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 14 }}>
        <FormField label="Test Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Morning Practice" />
        </FormField>
        <FormField label="Categories">
          <MultiSelect value={catIds} onChange={setCatIds} placeholder="All Categories"
            options={categories.map(c => ({ value: String(c.id), label: c.name }))} />
        </FormField>
        <FormField label="Types">
          <MultiSelect value={types} onChange={setTypes} placeholder="All Types" options={TYPE_OPTIONS} />
        </FormField>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex gap-1" style={{ border: '1px solid var(--border-dim)', padding: 3, borderRadius: 4 }}>
          {(['difficulty', 'count'] as const).map(m => (
            <button key={m} onClick={() => setDiffMode(m)} style={{
              fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em',
              padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 2,
              background: diffMode === m ? 'var(--gold-dim)' : 'transparent',
              color: diffMode === m ? 'var(--bg)' : 'var(--ink-dim)', textTransform: 'uppercase',
            }}>
              {m === 'difficulty' ? 'By Difficulty' : 'By Count'}
            </button>
          ))}
        </div>

        {diffMode === 'difficulty' ? (
          <FormField label={`Questions · Total ${diffTotal}`}>
            <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
              <div className="flex gap-2 items-center" style={{ minWidth: 'max-content' }}>
                <input type="number" min={1} max={100} value={diffTotal}
                  onChange={e => handleTotalChange(Number(e.target.value))}
                  className="form-input" style={{ width: 54, textAlign: 'center', padding: '7px 4px' }}
                  title="Auto-splits 25% easy / 50% medium / 25% hard" />
                <span style={{ color: 'var(--border-dim)', fontSize: '0.65rem' }}>▸</span>
                {(['easy', 'medium', 'hard'] as const).map(diff => {
                  const val = diff === 'easy' ? easy : diff === 'medium' ? medium : hard
                  const set = diff === 'easy' ? setEasy : diff === 'medium' ? setMedium : setHard
                  return (
                    <div key={diff} className="flex items-center gap-1">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: DIFF_COLORS[diff].dot, boxShadow: `0 0 4px ${DIFF_COLORS[diff].dot}`, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'capitalize' }}>{diff.slice(0,3)}</span>
                      <input type="number" min={0} max={50} value={val}
                        onChange={e => set(Math.max(0, Number(e.target.value)))}
                        className="form-input" style={{ width: 46, textAlign: 'center', padding: '7px 4px' }} />
                    </div>
                  )
                })}
              </div>
            </div>
          </FormField>
        ) : (
          <FormField label="Questions">
            <input type="number" min={1} max={200} value={totalCount}
              onChange={e => setTotalCount(Math.max(1, Number(e.target.value)))}
              className="form-input" style={{ width: 72, textAlign: 'center', padding: '7px 4px' }} />
          </FormField>
        )}

        <button className="btn btn-primary" onClick={handleGenerate} disabled={isPending}
          style={{ height: 38, padding: '0 24px', marginLeft: 'auto' }}>
          {isPending ? '…' : '▶ Generate'}
        </button>
      </div>
    </OrnatePanel>
  )
}

/* ── Passage ────────────────────────────────────────────────────── */

function PassageForm({ bank, passages }: { bank: Bank; passages: Passage[] }) {
  const navigate = useNavigate()
  const generate = useGenerateTest(String(bank.id))
  const start    = useStartAttempt()

  const [name,     setName]     = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const isPending = generate.isPending || start.isPending

  const toggle = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const selectedPassages = passages.filter(p => selected.has(p.id))
  const allGroups        = selectedPassages.flatMap(p => p.groups ?? [])
  const easy   = allGroups.filter(g => g.difficulty === 'easy').length
  const medium = allGroups.filter(g => g.difficulty === 'medium').length
  const hard   = allGroups.filter(g => g.difficulty === 'hard').length

  const handleGenerate = async () => {
    if (selected.size === 0) return
    const test = await generate.mutateAsync({
      name: name.trim() || selectedPassages.map(p => p.title).join(' + '),
      config: { easy_count: easy, medium_count: medium, hard_count: hard, passage_ids: [...selected] },
    })
    const attempt = await start.mutateAsync({ bankId: String(bank.id), testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  if (passages.length === 0) {
    return (
      <OrnatePanel>
        <p style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', textAlign: 'center', padding: '16px 0' }}>
          No passages in this bank yet. Import or add passages first.
        </p>
      </OrnatePanel>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <OrnatePanel>
        <p style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', marginBottom: 16, lineHeight: 1.6 }}>
          Select one or more passages. All questions from their groups will be included in the test.
        </p>
        <FormField label="Test Name" >
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={selectedPassages.length ? selectedPassages.map(p => p.title).join(' + ') : 'Select passages below…'}
            style={{ maxWidth: 420 }}
          />
        </FormField>
      </OrnatePanel>

      <div className="flex flex-col gap-3">
        {passages.map(p => {
          const groups   = p.groups ?? []
          const qCount   = groups.reduce((acc, g) => acc + (g.questions?.length ?? 0), 0)
          const isSel    = selected.has(p.id)
          const dc       = DIFF_COLORS[p.difficulty] ?? DIFF_COLORS.medium

          return (
            <div
              key={p.id}
              onClick={() => toggle(p.id)}
              style={{
                padding: '16px 20px',
                background: isSel ? 'rgba(154,112,24,0.05)' : 'var(--bg-card)',
                border: `1px solid ${isSel ? 'var(--gold)' : 'var(--border-dim)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSel ? '0 0 12px rgba(154,112,24,0.10)' : 'none',
              }}
            >
              <div className="flex items-start gap-3">
                {/* checkbox */}
                <div style={{
                  width: 15, height: 15, marginTop: 3, flexShrink: 0,
                  border: `1px solid ${isSel ? 'var(--gold)' : 'var(--border-dim)'}`,
                  background: isSel ? 'var(--gold)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s',
                }}>
                  {isSel && <span style={{ color: '#fff8e8', fontSize: '0.65rem', lineHeight: 1 }}>✓</span>}
                </div>

                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: 'var(--ink)' }}>{p.title}</span>
                    <span style={{ fontSize: '0.6rem', padding: '1px 7px', border: `1px solid ${dc.border}`, color: dc.dot, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', background: dc.bg }}>
                      {p.difficulty}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)', marginBottom: groups.length ? 8 : 0 }}>
                    {p.category?.name}{p.category?.name ? ' · ' : ''}{groups.length} group{groups.length !== 1 ? 's' : ''} · {qCount} question{qCount !== 1 ? 's' : ''}
                  </div>
                  {groups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {groups.map(g => {
                        const gc = DIFF_COLORS[g.difficulty] ?? DIFF_COLORS.medium
                        return (
                          <span key={g.id} style={{
                            fontSize: '0.6rem', padding: '2px 7px',
                            border: `1px solid ${gc.border}`, color: gc.dot,
                            fontFamily: 'Cinzel, serif', background: gc.bg, letterSpacing: '0.06em',
                          }}>
                            {g.type.replace(/_/g, ' ')} · {g.questions?.length ?? '?'}q
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selected.size > 0 && (
        <OrnatePanel>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
                {selected.size} passage{selected.size !== 1 ? 's' : ''} selected · {easy + medium + hard} groups
              </div>
              <div className="flex gap-4">
                {([['easy', easy], ['medium', medium], ['hard', hard]] as const).map(([d, n]) => (
                  <div key={d} className="flex items-center gap-1">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: DIFF_COLORS[d].dot, boxShadow: `0 0 4px ${DIFF_COLORS[d].dot}`, display: 'inline-block' }} />
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: 'var(--ink-dim)', textTransform: 'capitalize' }}>{n} {d}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={isPending || (easy + medium + hard === 0)}
              style={{ padding: '10px 28px' }}>
              {isPending ? '…' : '▶ Generate'}
            </button>
          </div>
        </OrnatePanel>
      )}
    </div>
  )
}
