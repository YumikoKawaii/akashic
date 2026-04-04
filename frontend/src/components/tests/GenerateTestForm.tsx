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

function autoSplit(total: number): [number, number, number] {
  const easy   = Math.round(total * 0.25)
  const hard   = Math.round(total * 0.25)
  const medium = total - easy - hard
  return [easy, Math.max(0, medium), hard]
}

export default function GenerateTestForm({ bank, categories }: Props) {
  const navigate       = useNavigate()
  const generate       = useGenerateTest(bank.id)
  const start          = useStartAttempt()
  const saveDefault    = useUpdateDefaultConfig()

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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

        <FormField label={`Difficulty Split · Total: ${total}`}>
          <div className="flex gap-2 items-center">
            {/* Total quick-set */}
            <input
              type="number" min={1} max={100}
              value={total}
              onChange={e => handleTotalChange(Number(e.target.value))}
              className="form-input"
              style={{ width: 48, textAlign: 'center', padding: '7px 4px' }}
              title="Total questions (auto-splits 25% easy / 50% medium / 25% hard)"
            />
            <span style={{ color: 'var(--border)', fontSize: '0.7rem' }}>|</span>
            {([['easy', easy, setEasy], ['medium', medium, setMedium], ['hard', hard, setHard]] as const).map(
              ([diff, val, set]) => (
                <div key={diff} className="flex items-center gap-1" title={diff}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: DIFF_COLORS[diff], boxShadow: `0 0 4px ${DIFF_COLORS[diff]}`, flexShrink: 0, display: 'inline-block' }} />
                  <input
                    type="number" min={0} max={50}
                    value={val}
                    onChange={e => set(Math.max(0, Number(e.target.value)))}
                    className="form-input"
                    style={{ width: 44, textAlign: 'center', padding: '7px 4px' }}
                  />
                </div>
              )
            )}
          </div>
        </FormField>

        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={handleGenerate} disabled={isPending} style={{ height: 38, flex: 1 }}>
            {isPending ? '…' : '⚔ Generate'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleSaveDefault}
            disabled={saveDefault.isPending}
            style={{ height: 38, padding: '0 10px', fontSize: '0.7rem' }}
            title="Save current split as bank default"
          >
            {saved ? '✓' : '⚙'}
          </button>
        </div>
      </div>
    </OrnatePanel>
  )
}
