import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, Category, Passage } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input } from '../ui/FormField'
import MultiSelect from '../ui/MultiSelect'
import { useGenerateTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'

type GenMode  = 'standalone' | 'passage'
type DiffMode = 'difficulty' | 'count'

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

const NUM = { width: 52, textAlign: 'center' as const, padding: '8px 4px' }

const DIFF = {
  easy:   { dot: '#2a8a3a', border: 'rgba(42,138,58,0.45)',   bg: 'rgba(42,138,58,0.07)'  },
  medium: { dot: '#9a7018', border: 'rgba(154,112,24,0.45)',  bg: 'rgba(154,112,24,0.07)' },
  hard:   { dot: '#b03030', border: 'rgba(176,48,48,0.45)',   bg: 'rgba(176,48,48,0.07)'  },
} as const

function autoSplit(total: number): [number, number, number] {
  const e = Math.round(total * 0.25)
  const h = Math.round(total * 0.25)
  return [e, Math.max(0, total - e - h), h]
}

/* ── Pill toggle ──────────────────────────────────────────────── */
function SegToggle<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1" style={{ border: '1px solid var(--border-dim)', padding: 3, borderRadius: 4, flexShrink: 0 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          fontFamily: 'Cinzel, serif', fontSize: '0.58rem', letterSpacing: '0.12em',
          padding: '4px 12px', border: 'none', cursor: 'pointer', borderRadius: 2,
          background: value === o.value ? 'var(--gold-dim)' : 'transparent',
          color:      value === o.value ? 'var(--bg)'      : 'var(--ink-dim)',
          textTransform: 'uppercase', transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Shared difficulty / generate row ─────────────────────────── */
function DifficultyRow({ diffMode, setDiffMode, easy, setEasy, medium, setMedium, hard, setHard, totalCount, setTotalCount, onGenerate, isPending }: {
  diffMode: DiffMode; setDiffMode: (m: DiffMode) => void
  easy: number; setEasy: (n: number) => void
  medium: number; setMedium: (n: number) => void
  hard: number; setHard: (n: number) => void
  totalCount: number; setTotalCount: (n: number) => void
  onGenerate: () => void; isPending: boolean
}) {
  const diffTotal = easy + medium + hard

  const handleTotal = (n: number) => {
    const [e, m, h] = autoSplit(Math.max(0, n))
    setEasy(e); setMedium(m); setHard(h)
  }

  return (
    <div className="flex flex-wrap gap-3 items-center" style={{ paddingTop: 14, borderTop: '1px solid var(--border-dim)' }}>
      <SegToggle
        value={diffMode} onChange={setDiffMode}
        options={[{ value: 'difficulty', label: 'By Difficulty' }, { value: 'count', label: 'By Count' }]}
      />

      {diffMode === 'difficulty' ? (
        <div className="flex gap-2 items-center" style={{ overflowX: 'auto' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>
            Total
          </span>
          <input type="number" min={0} max={200} value={diffTotal}
            onChange={e => handleTotal(Number(e.target.value))}
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

/* ── Root ─────────────────────────────────────────────────────── */
interface Props { bank: Bank; categories: Category[]; passages: Passage[] }

export default function GenerateTab({ bank, categories, passages }: Props) {
  const [mode, setMode] = useState<GenMode>('standalone')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="section-title" style={{ marginBottom: 0, flex: 1 }}>Generate Test</div>
        <SegToggle value={mode} onChange={setMode}
          options={[{ value: 'standalone', label: 'Standalone' }, { value: 'passage', label: 'Passage' }]} />
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

  const [name,        setName]       = useState('')
  const [passageIds,  setPassageIds] = useState<string[]>([])
  const [diffMode,    setDiffMode]   = useState<DiffMode>('difficulty')
  const [easy,        setEasy]       = useState(0)
  const [medium,      setMedium]     = useState(0)
  const [hard,        setHard]       = useState(0)
  const [totalCount,  setTotalCount] = useState(10)

  const refillFromPassages = (ids: string[]) => {
    const selected = passages.filter(p => ids.includes(String(p.id)))
    const groups   = selected.flatMap(p => p.groups ?? [])
    setEasy  (groups.filter(g => g.difficulty === 'easy').length)
    setMedium(groups.filter(g => g.difficulty === 'medium').length)
    setHard  (groups.filter(g => g.difficulty === 'hard').length)
  }

  const handlePassageChange = (ids: string[]) => {
    setPassageIds(ids)
    if (diffMode === 'difficulty') refillFromPassages(ids)
  }

  const handleDiffModeChange = (m: DiffMode) => {
    setDiffMode(m)
    if (m === 'difficulty') refillFromPassages(passageIds)
  }

  const handleGenerate = async () => {
    if (!passageIds.length) return
    const pIds = passageIds.map(Number).filter(Boolean)
    const selectedPassages = passages.filter(p => pIds.includes(p.id))
    const config = diffMode === 'count'
      ? (() => { const [e, m, h] = autoSplit(totalCount); return { easy_count: e, medium_count: m, hard_count: h, passage_ids: pIds } })()
      : { easy_count: easy, medium_count: medium, hard_count: hard, passage_ids: pIds }
    const test    = await generate.mutateAsync({ name: name.trim() || selectedPassages.map(p => p.title).join(' + '), config })
    const attempt = await start.mutateAsync({ bankId: String(bank.id), testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  return (
    <OrnatePanel>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: 14, marginBottom: 14 }}>
        <FormField label="Test Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Passage Practice" />
        </FormField>
        <FormField label="Passages">
          <MultiSelect
            value={passageIds}
            onChange={handlePassageChange}
            placeholder="Select Passages"
            options={passages.map(p => ({ value: String(p.id), label: p.title }))}
          />
        </FormField>
      </div>
      <DifficultyRow
        diffMode={diffMode} setDiffMode={handleDiffModeChange}
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
