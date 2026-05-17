import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  triggerStyle?: React.CSSProperties
}

interface DropPos { top: number; left: number; width: number }

export default function Select({ value, onChange, options, placeholder = '', disabled = false, triggerStyle }: Props) {
  const [open, setOpen]   = useState(false)
  const [pos,  setPos]    = useState<DropPos>({ top: 0, left: 0, width: 0 })
  const triggerRef        = useRef<HTMLButtonElement>(null)
  const dropdownRef       = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 2, left: r.left, width: r.width })
    }
  }, [])

  const handleToggle = () => {
    if (disabled) return
    if (!open) updatePos()
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'default' : 'pointer',
          textAlign: 'left',
          color: selected ? 'var(--ink)' : 'var(--ink-dim)',
          borderColor: open ? 'var(--gold)' : undefined,
          boxShadow: open ? '0 0 8px rgba(154,112,24,0.15)' : undefined,
          ...triggerStyle,
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

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top, left: pos.left, width: pos.width,
            zIndex: 9999,
            background: '#f5ecda',
            border: '1px solid var(--gold)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(154,112,24,0.08)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value === value ? '' : opt.value); setOpen(false) }}
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
        </div>,
        document.body
      )}
    </div>
  )
}
