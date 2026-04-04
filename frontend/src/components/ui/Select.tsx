import { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
}

export default function Select({ value, onChange, options, placeholder = '' }: Props) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          color: selected ? 'var(--ink)' : 'var(--ink-dim)',
          borderColor: open ? 'var(--gold)' : undefined,
          boxShadow: open ? '0 0 8px rgba(154,112,24,0.15)' : undefined,
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="10" height="7" viewBox="0 0 10 7" fill="none"
          style={{ flexShrink: 0, marginLeft: 8, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M1 1l4 4 4-4" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="square"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 2px)',
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#f5ecda',
          border: '1px solid var(--gold)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(154,112,24,0.08)',
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                padding: '8px 12px',
                fontSize: '0.9rem',
                fontFamily: 'EB Garamond, serif',
                color: opt.value === value ? 'var(--gold)' : 'var(--ink)',
                background: opt.value === value ? 'rgba(154,112,24,0.08)' : 'transparent',
                cursor: 'pointer',
                borderLeft: opt.value === value ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'rgba(154,112,24,0.05)' }}
              onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
