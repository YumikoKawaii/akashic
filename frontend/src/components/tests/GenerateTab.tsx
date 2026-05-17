import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, Category, Passage } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input } from '../ui/FormField'
import MultiSelect from '../ui/MultiSelect'
import { useGenerateTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'

type GenMode   = 'standalone' | 'passage'
type DiffMode  = 'difficulty' | 'count'

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

const DIFF = {
  easy:   { dot: '#2a8a3a', border: 'rgba(42,138,58,0.45)',   bg: 'rgba(42,138,58,0.07)'  },
  medium: { dot: '#9a7018', border: 'rgba(154,112,24,0.45)',  bg: 'rgba(154,112,24,0.07)' },
  hard:   { dot: '#b03030', border: 'rgba(176,48,48,0.45)',   bg: 'rgba(176,48,48,0.07)'  },
} as const

const NUM = { width: 52, textAlign: 'center' as const, padding: '8px 4px' }

function autoSplit(total: number): [number, number, number] {
  const e = Math.round(total * 0.25)
  const h = Math.round(total * 0.25)
  return [e, Math.max(0, total - e - h), h]
}

/* ── Mode toggle pill ─────────────────────────────────────────── */
function SegToggle<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1" style={{ border: '1px solid var(--border-dim)', padding: 3, borderRadius: 4, flexShrink: 0 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            fontFamily: 'Cinzel, serif', fontSize: '0.58rem', letterSpacing: '0.12em',
            padding: '4px 12px', border: 'none', cursor: 'pointer', borderRadius: 2,
            background: value === o.value ? 'var(--gold-dim)' : 'transparent',
            color:      value === o.value ? 'var(--bg)' : 'var(--ink-dim)',
            textTransform: 'uppercase', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Difficulty row (shared) ──────────────────────────────────── */
function DifficultyRow({ diffMode, setDiffMode, easy, setEasy, medium, setMedium, hard, setHard, totalCount, setTotalCount, onGenerate, isPending }: {
  diffMode: DiffMode; setDiffMode: (m: DiffMode) => void
  easy: number; setEasy: (n: number) => void
  medium: number; setMedium: (n: number) => void
  hard: number; setHard: (n: number) => void
  totalCount: number; setTotalCount: (n: number) => void
  onGenerate: () => void; isPending: boolean
}) {
  const diffTotal = easy + medium + hard

  const handleTotalChange = (n: number) => {
    const [e, m, h] = autoSplit(Math.max(0, n))
    setEasy(e); setMedium(m); setHard(h)
  }

  return (
    <div className="flex flex-wrap gap-3 items-center" style={{ paddingTop: 14, borderTop: '1px solid var(--border-dim)' }}>
      <SegToggle
        value={diffMode}
        onChange={setDiffMode}
        options={[{ value: 'difficulty', label: 'By Difficulty' }, { value: 'count', label: 'By Count' }]}
      />

      {diffMode === 'difficulty' ? (
        <div className="flex gap-2 items-center" style={{ overflowX: 'auto' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>
            Total
          </span>
          <input type="number" min={0} max={200} value={diffTotal}
            onChange={e => handleTotalChange(Number(e.target.value))}
            className="form-input" style={NUM}
            title="Auto-splits 25% easy / 50% medium / 25% hard" />
          <span style={{ color: 'var(--border-dim)', fontSize: '0.7rem' }}>▸</span>
          {(['easy', 'medium', 'hard'] as const).map(d => {
            const val = d === 'easy' ? easy : d === 'medium' ? medium : hard
            const set = d === 'easy' ? setEasy : d === 'medium' ? setMedium : setHard
            return (
              <div key={d} className="flex items-center gap-1">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: DIFF[d].dot, boxShadow: `0 0 4px ${DIFF[d].dot}`, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  {d.slice(0, 3).toUpperCase()}
                </span>
                <input type="number" min={0} max={100} value={val}
                  onChange={e => set(Math.max(0, Number(e.target.value)))}
                  className="form-input" style={NUM} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--ink-dim)' }}>Questions</span>
          <input type="number" min={1} max={200} value={totalCount}
            onChange={e => setTotalCount(Math.max(1, Number(e.target.value)))}
            className="form-input" style={NUM} />
        </div>
      )}

      <button className="btn btn-primary" onClick={onGenerate} disabled={isPending}
        style={{ height: 38, padding: '0 24px', marginLeft: 'auto' }}>
        {isPending ? '…' : '▶ Generate'}
      </button>
    </div>
  )
}

/* ── Root tab ─────────────────────────────────────────────────── */
interface Props { bank: Bank; categories: Category[]; passages: Passage[] }

export default function GenerateTab({ bank, categories, passages }: Props) {
  const [mode, setMode] = useState<GenMode>('standalone')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="section-title" style={{ marginBottom: 0, flex: 1 }}>Generate Test</div>
        <SegToggle
          value={mode}
          onChange={setMode}
          options={[{ value: 'standalone', label: 'Standalone' }, { value: 'passage', label: 'Passage' }]}
        />
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
  const [diffMode,   setDiffMode]   = useState<DiffMode>('difficulty')
  const [easy,       setEasy]       = useState(def.easy_count   ?? 3)
  const [medium,     setMedium]     = useState(def.medium_count ?? 5)
  const [hard,       setHard]       = useState(def.hard_count   ?? 2)
  const [totalCount, setTotalCount] = useState(10)

  const handleGenerate = async () => {
    const categoryIds = catIds.map(Number).filter(Boolean)
    const config = diffMode === 'count'
      ? (() => { const [e, m, h] = autoSplit(totalCount); return { easy_count: e, medium_count: m, hard_count: h, ...(categoryIds.length ? { category_ids: categoryIds } : {}), ...(types.length ? { types } : {}) } })()
      : { easy_count: easy, medium_count: medium, hard_count: hard, ...(categoryIds.length ? { category_ids: categoryIds } : {}), ...(types.length ? { types } : {}) }
    const test    = await generate.mutateAsync({ name: name.trim() || `${bank.name} — ${new Date().toLocaleString()}`, config })
    const attempt = await start.mutateAsync({ bankId: String(bank.id), testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  return (
    <OrnatePanel>
      {/* ─ Input row ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: 14, marginBottom: 14 }}>
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

      {/* ─ Difficulty row ─ */}
      <DifficultyRow
        diffMode={diffMode} setDiffMode={setDiffMode}
        easy={easy} setEasy={setEasy}
        medium={medium} setMedium={setMedium}
        hard={hard} setHard={setHard}
        totalCount={totalCount} setTotalCount={setTotalCount}
        onGenerate={handleGenerate}
        isPending={generate.isPending || start.isPending}
      />
    </OrnatePanel>
  )
}

/* ── Passage ────────────────────────────────────────────────────── */
function PassageForm({ bank, passages }: { bank: Bank; passages: Passage[] }) {
  const navigate = useNavigate()
  const generate = useGenerateTest(String(bank.id))
  const start    = useStartAttempt()

  const [name,       setName]       = useState('')
  const [selected,   setSelected]   = useState<Set<number>>(new Set())
  const [diffMode,   setDiffMode]   = useState<DiffMode>('difficulty')
  const [easy,       setEasy]       = useState(0)
  const [medium,     setMedium]     = useState(0)
  const [hard,       setHard]       = useState(0)
  const [totalCount, setTotalCount] = useState(10)

  const selectedPassages = passages.filter(p => selected.has(p.id))

  // Auto-fill difficulty counts from selected passages when in difficulty mode
  useEffect(() => {
    if (diffMode !== 'difficulty') return
    const groups = selectedPassages.flatMap(p => p.groups ?? [])
    setEasy  (groups.filter(g => g.difficulty === 'easy').length)
    setMedium(groups.filter(g => g.difficulty === 'medium').length)
    setHard  (groups.filter(g => g.difficulty === 'hard').length)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, diffMode])

  const toggle = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleGenerate = async () => {
    if (selected.size === 0) return
    const config = diffMode === 'count'
      ? (() => { const [e, m, h] = autoSplit(totalCount); return { easy_count: e, medium_count: m, hard_count: h, passage_ids: [...selected] } })()
      : { easy_count: easy, medium_count: medium, hard_count: hard, passage_ids: [...selected] }
    const test    = await generate.mutateAsync({ name: name.trim() || selectedPassages.map(p => p.title).join(' + '), config })
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
      {/* ─ Passage cards ─ */}
      <div className="flex flex-col gap-2">
        {passages.map(p => {
          const groups = p.groups ?? []
          const qCount = groups.reduce((acc, g) => acc + (g.questions?.length ?? 0), 0)
          const isSel  = selected.has(p.id)
          const dc     = DIFF[p.difficulty] ?? DIFF.medium

          return (
            <div
              key={p.id}
              onClick={() => toggle(p.id)}
              style={{
                padding: '14px 18px',
                background: isSel ? 'rgba(154,112,24,0.05)' : 'var(--bg-card)',
                border: `1px solid ${isSel ? 'var(--gold)' : 'var(--border-dim)'}`,
                cursor: 'pointer', transition: 'all 0.18s',
                boxShadow: isSel ? '0 0 10px rgba(154,112,24,0.10)' : 'none',
              }}
            >
              <div className="flex items-start gap-3">
                {/* checkbox */}
                <div style={{
                  width: 15, height: 15, marginTop: 3, flexShrink: 0,
                  border: `1px solid ${isSel ? 'var(--gold)' : 'var(--border-dim)'}`,
                  background: isSel ? 'var(--gold)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {isSel && <span style={{ color: '#fff8e8', fontSize: '0.6rem', lineHeight: 1 }}>✓</span>}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 3 }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: 'var(--ink)' }}>{p.title}</span>
                    <span style={{ fontSize: '0.58rem', padding: '1px 7px', border: `1px solid ${dc.border}`, color: dc.dot, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', background: dc.bg }}>
                      {p.difficulty}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)', marginBottom: groups.length ? 7 : 0 }}>
                    {p.category?.name}{p.category?.name ? ' · ' : ''}{groups.length} group{groups.length !== 1 ? 's' : ''} · {qCount}q
                  </div>
                  {groups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {groups.map(g => {
                        const gc = DIFF[g.difficulty] ?? DIFF.medium
                        return (
                          <span key={g.id} style={{ fontSize: '0.58rem', padding: '2px 7px', border: `1px solid ${gc.border}`, color: gc.dot, fontFamily: 'Cinzel, serif', background: gc.bg, letterSpacing: '0.06em' }}>
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

      {/* ─ Config panel (appears when passages are selected) ─ */}
      {selected.size > 0 && (
        <OrnatePanel>
          <div style={{ marginBottom: 14 }}>
            <FormField label="Test Name">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={selectedPassages.map(p => p.title).join(' + ')}
                style={{ maxWidth: 480 }}
              />
            </FormField>
          </div>

          <DifficultyRow
            diffMode={diffMode} setDiffMode={setDiffMode}
            easy={easy} setEasy={setEasy}
            medium={medium} setMedium={setMedium}
            hard={hard} setHard={setHard}
            totalCount={totalCount} setTotalCount={setTotalCount}
            onGenerate={handleGenerate}
            isPending={generate.isPending || start.isPending}
          />
        </OrnatePanel>
      )}
    </div>
  )
}
