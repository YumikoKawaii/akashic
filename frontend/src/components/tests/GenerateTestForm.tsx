import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, Category } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input } from '../ui/FormField'
import Select from '../ui/Select'
import { useGenerateTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'
import { useUpdateDefaultConfig } from '../../hooks/useBanks'

interface Props { bank: Bank; categories: Category[] }

const DIFF_COLORS = { easy: '#3a9a4a', medium: 'var(--gold)', hard: '#b03030' }
const DIFF_LABELS = { easy: 'Easy', medium: 'Med', hard: 'Hard' }

function autoSplit(total: number): [number, number, number] {
  const easy   = Math.round(total * 0.25)
  const hard   = Math.round(total * 0.25)
  const medium = total - easy - hard
  return [easy, Math.max(0, medium), hard]
}

export default function GenerateTestForm({ bank, categories }: Props) {
  const navigate    = useNavigate()
  const generate    = useGenerateTest(bank.id)
  const start       = useStartAttempt()
  const saveDefault = useUpdateDefaultConfig()

  const def = bank.default_config
  const [name,       setName]       = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [easy,       setEasy]       = useState(def.easy_count   ?? 3)
  const [medium,     setMedium]     = useState(def.medium_count ?? 5)
  const [hard,       setHard]       = useState(def.hard_count   ?? 2)
  const [saved,      setSaved]      = useState(false)

  const total = easy + medium + hard

  const handleTotalChange = (n: number) => {
    const [e, m, h] = autoSplit(Math.max(0, n))
    setEasy(e); setMedium(m); setHard(h)
  }

  const handleSaveDefault = async () => {
    await saveDefault.mutateAsync({ id: bank.id, config: { easy_count: easy, medium_count: medium, hard_count: hard } })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleGenerate = async () => {
    const test = await generate.mutateAsync({
      name: name.trim() || `${bank.name} — ${new Date().toLocaleDateString()}`,
      config: {
        easy_count:   easy,
        medium_count: medium,
        hard_count:   hard,
        ...(categoryId ? { category_id: categoryId } : {}),
      },
    })
    const attempt = await start.mutateAsync({ bankId: bank.id, testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  const isPending = generate.isPending || start.isPending

  return (
    <OrnatePanel>
      <div className="section-title" style={{ marginBottom: 18 }}>Quick Generate</div>

      {/* Row 1: Name + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 14 }}>
        <FormField label="Test Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Morning Practice" />
        </FormField>
        <FormField label="Category">
          <Select
            value={categoryId}
            onChange={setCategoryId}
            placeholder="All Categories"
            options={categories.map(c => ({ value: c.id, label: c.name }))}
          />
        </FormField>
      </div>

      {/* Row 2: Difficulty + Actions */}
      <div className="flex flex-wrap gap-4 items-end">
        <FormField label={`Questions · Total ${total}`}>
          <div className="flex gap-2 items-center">
            <input
              type="number" min={1} max={100}
              value={total}
              onChange={e => handleTotalChange(Number(e.target.value))}
              className="form-input"
              style={{ width: 54, textAlign: 'center', padding: '7px 4px' }}
              title="Set total — auto-splits 25% easy / 50% medium / 25% hard"
            />
            <span style={{ color: 'var(--border-dim)', fontSize: '0.65rem', padding: '0 2px' }}>▸</span>
            {([['easy', easy, setEasy], ['medium', medium, setMedium], ['hard', hard, setHard]] as const).map(
              ([diff, val, set]) => (
                <div key={diff} className="flex items-center gap-1">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: DIFF_COLORS[diff], boxShadow: `0 0 4px ${DIFF_COLORS[diff]}`, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
                    {DIFF_LABELS[diff]}
                  </span>
                  <input
                    type="number" min={0} max={50}
                    value={val}
                    onChange={e => set(Math.max(0, Number(e.target.value)))}
                    className="form-input"
                    style={{ width: 46, textAlign: 'center', padding: '7px 4px' }}
                  />
                </div>
              )
            )}
          </div>
        </FormField>

        <div className="flex gap-2 items-end" style={{ marginLeft: 'auto' }}>
          {/* Save default button with tooltip */}
          <div style={{ position: 'relative' }} className="save-default-wrap">
            <button
              className="btn btn-ghost"
              onClick={handleSaveDefault}
              disabled={saveDefault.isPending}
              style={{ height: 38, padding: '0 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              {saved ? '✓ Saved' : '⚙ Set Default'}
            </button>
            <div className="save-default-tooltip">
              Save current split as the bank default — pre-fills this form on next visit
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={isPending}
            style={{ height: 38, padding: '0 20px', whiteSpace: 'nowrap' }}
          >
            {isPending ? '…' : '⚔ Generate'}
          </button>
        </div>
      </div>
    </OrnatePanel>
  )
}
