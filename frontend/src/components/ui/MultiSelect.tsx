import { useState, useRef, useEffect } from 'react'
import { SelectOption } from './Select'

interface Props {
  value: string[]
  onChange: (value: string[]) => void
  options: SelectOption[]
  placeholder?: string
}

export default function MultiSelect({ value, onChange, options, placeholder = 'All' }: Props) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])

  const label = value.length === 0
    ? placeholder
    : value.length === options.length
      ? 'All Categories'
      : options.filter(o => value.includes(o.value)).map(o => o.label).join(', ')

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="form-input"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left',
          color: value.length ? 'var(--ink)' : 'var(--ink-dim)',
          borderColor: open ? 'var(--gold)' : undefined,
          boxShadow: open ? '0 0 8px rgba(154,112,24,0.15)' : undefined,
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <svg width="10" height="7" viewBox="0 0 10 7" fill="none"
          style={{ flexShrink: 0, marginLeft: 8, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M1 1l4 4 4-4" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="square"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 100,
          background: '#f5ecda', border: '1px solid var(--gold)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {/* All / None */}
          <div
            onClick={() => onChange(value.length === options.length ? [] : options.map(o => o.value))}
            style={{
              padding: '7px 12px', fontSize: '0.78rem', fontFamily: 'Cinzel, serif',
              letterSpacing: '0.08em', color: 'var(--gold-dim)', cursor: 'pointer',
              borderBottom: '1px solid var(--border-dim)',
              background: 'rgba(154,112,24,0.04)',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(154,112,24,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(154,112,24,0.04)'}
          >
            {value.length === options.length ? '− Deselect All' : '＋ Select All'}
          </div>

          {options.map(opt => {
            const checked = value.includes(opt.value)
            return (
              <div
                key={opt.value}
                onClick={() => toggle(opt.value)}
                style={{
                  padding: '8px 12px', fontSize: '0.9rem', fontFamily: 'EB Garamond, serif',
                  color: checked ? 'var(--gold)' : 'var(--ink)',
                  background: checked ? 'rgba(154,112,24,0.08)' : 'transparent',
                  cursor: 'pointer',
                  borderLeft: checked ? '2px solid var(--gold)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'rgba(154,112,24,0.05)' }}
                onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{
                  width: 12, height: 12, border: `1px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
                  background: checked ? 'var(--gold)' : 'transparent',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', color: '#1a1208',
                }}>
                  {checked ? '✓' : ''}
                </span>
                {opt.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
