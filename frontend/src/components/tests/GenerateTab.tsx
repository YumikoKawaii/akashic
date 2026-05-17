import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, Category, Passage } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input } from '../ui/FormField'
import MultiSelect from '../ui/MultiSelect'
import { useGenerateTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'
import MagicCircle from '../ui/MagicCircle'

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

const NUM = { width: 52, textAlign: 'center' as const, padding: '4px 4px' }

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
    <div style={{ paddingTop: 4 }}>
    <div className="flex flex-wrap gap-3 items-center">
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

      <div style={{ marginLeft: 'auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -22, right: -22, width: 82, height: 82, color: 'var(--gold)', opacity: 0.55, pointerEvents: 'none', zIndex: 0 }}>
          <MagicCircle variant="halo" speed={2} />
        </div>
        <button className="btn btn-primary" onClick={onGenerate} disabled={isPending}
          style={{ height: 38, padding: '0 24px', position: 'relative', zIndex: 1 }}>
          {isPending ? '…' : '▶ Generate'}
        </button>
      </div>
    </div>
    </div>
  )
}

/* ── Root ─────────────────────────────────────────────────────── */
interface Props { bank: Bank; categories: Category[]; passages: Passage[] }

export default function GenerateTab({ bank, categories, passages }: Props) {
  const [mode, setMode] = useState<GenMode>('standalone')

  return (
    <div className="flex flex-col gap-4">
      <div style={{ position: 'relative' }}>
        {/* decorative circles flanking the title row */}
        <div style={{ position: 'absolute', top: -40, left: -40, width: 110, height: 110, color: 'var(--gold)', opacity: 0.50, pointerEvents: 'none', zIndex: 0 }}>
          <MagicCircle variant="sigil" speed={2} />
        </div>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, color: '#6b4c8a', opacity: 0.40, pointerEvents: 'none', zIndex: 0 }}>
          <MagicCircle variant="orbit" speed={3} />
        </div>

        {/* title + mode toggle */}
        <div className="flex items-center gap-4 flex-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-title" style={{ marginBottom: 0, flex: 1 }}>Generate Test</div>
          <SegToggle value={mode} onChange={setMode}
            options={[{ value: 'standalone', label: 'Standalone' }, { value: 'passage', label: 'Passage' }]} />
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
  const [diffMode,   setDiffMode]   = useState<DiffMode>('difficulty')
  const [easy,       setEasy]       = useState(def.easy_count   ?? 3)
  const [medium,     setMedium]     = useState(def.medium_count ?? 5)
  const [hard,       setHard]       = useState(def.hard_count   ?? 2)
  const [totalCount, setTotalCount] = useState(10)
  const [genError,   setGenError]   = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenError(null)
    const categoryIds = catIds.map(Number).filter(Boolean)
    const config = diffMode === 'count'
      ? (() => { const [e, m, h] = autoSplit(totalCount); return { easy_count: e, medium_count: m, hard_count: h, standalone_only: true, ...(categoryIds.length ? { category_ids: categoryIds } : {}), ...(types.length ? { types } : {}) } })()
      : { easy_count: easy, medium_count: medium, hard_count: hard, standalone_only: true, ...(categoryIds.length ? { category_ids: categoryIds } : {}), ...(types.length ? { types } : {}) }
    const test = await generate.mutateAsync({ name: name.trim() || `${bank.name} — ${new Date().toLocaleString()}`, config })
    if (!test.questions?.length) {
      setGenError('No standalone questions found. Questions organised into passages cannot be used in Standalone mode — switch to Passage mode.')
      return
    }
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
      {genError && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(176,48,48,0.06)', border: '1px solid rgba(176,48,48,0.3)', fontSize: '0.85rem', color: '#b03030' }}>
          {genError}
        </div>
      )}
    </OrnatePanel>
  )
}

/* ── Passage ────────────────────────────────────────────────────── */
type PassageDiff = 'any' | 'easy' | 'medium' | 'hard'

function PassageForm({ bank, passages }: { bank: Bank; passages: Passage[] }) {
  const navigate = useNavigate()
  const generate = useGenerateTest(String(bank.id))
  const start    = useStartAttempt()

  const [name,       setName]      = useState('')
  const [passageIds, setPassageIds] = useState<string[]>([])
  const [passDiff,   setPassDiff]  = useState<PassageDiff>('any')
  const [genError,   setGenError]  = useState<string | null>(null)

  // Passages to use: explicit selection overrides difficulty filter
  const filtered = passDiff === 'any'
    ? passages
    : passages.filter(p => p.difficulty === passDiff)

  const matchCount = filtered.length

  const handleGenerate = async () => {
    setGenError(null)

    // Resolve which passages to generate from
    let toUse: Passage[]
    if (passageIds.length) {
      toUse = passages.filter(p => passageIds.includes(String(p.id)))
    } else if (passDiff !== 'any') {
      toUse = filtered
    } else {
      // No filter — pick one at random
      if (!passages.length) { setGenError('No passages available in this bank.'); return }
      toUse = [passages[Math.floor(Math.random() * passages.length)]]
    }

    if (!toUse.length) {
      setGenError(`No ${passDiff} passages found in this bank.`)
      return
    }

    const pIds   = toUse.map(p => p.id)
    const groups = toUse.flatMap(p => p.groups ?? [])
    const config = {
      easy_count:   groups.filter(g => g.difficulty === 'easy').length,
      medium_count: groups.filter(g => g.difficulty === 'medium').length,
      hard_count:   groups.filter(g => g.difficulty === 'hard').length,
      passage_ids:  pIds,
    }

    const test = await generate.mutateAsync({ name: name.trim() || toUse.map(p => p.title).join(' + '), config })
    if (!test.questions?.length) {
      setGenError('No questions found for the selected passages.')
      return
    }
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
            onChange={ids => { setPassageIds(ids); setGenError(null) }}
            placeholder="All passages (optional)"
            options={passages.map(p => ({ value: String(p.id), label: p.title }))}
          />
        </FormField>
      </div>

      {/* Difficulty — only shown when no explicit passages selected */}
      {!passageIds.length && (
        <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.14em', color: 'var(--ink-dim)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Difficulty
          </span>
          <SegToggle
            value={passDiff}
            onChange={(d: PassageDiff) => { setPassDiff(d); setGenError(null) }}
            options={[
              { value: 'any',    label: 'Any' },
              { value: 'easy',   label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard',   label: 'Hard' },
            ]}
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', fontFamily: 'EB Garamond, serif' }}>
            {matchCount} passage{matchCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: -22, right: -22, width: 82, height: 82, color: 'var(--gold)', opacity: 0.55, pointerEvents: 'none', zIndex: 0 }}>
            <MagicCircle variant="halo" speed={2} />
          </div>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generate.isPending || start.isPending}
            style={{ height: 38, padding: '0 24px', position: 'relative', zIndex: 1 }}>
            {generate.isPending || start.isPending ? '…' : '▶ Generate'}
          </button>
        </div>
      </div>

      {genError && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(176,48,48,0.06)', border: '1px solid rgba(176,48,48,0.3)', fontSize: '0.85rem', color: '#b03030' }}>
          {genError}
        </div>
      )}
    </OrnatePanel>
  )
}
