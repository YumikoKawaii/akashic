import { useState, useEffect } from 'react'
import { useExplore } from '../hooks/useExplore'
import PublicRecordCarousel from '../components/explore/PublicRecordCarousel'
import { Spinner } from '../components/ui/MagicCircle'

export default function HomePage() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  // Debounce the query that hits the API.
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 250)
    return () => clearTimeout(t)
  }, [input])

  const { data, isLoading } = useExplore(query)
  const records = data?.data ?? []
  const total   = data?.total ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.3em', color: 'var(--gold)', fontSize: '1.4rem', margin: 0 }}>
          ✦ THE ARCHIVE ✦
        </h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: '0.85rem', marginTop: 8 }}>
          Search the community's public records
        </p>
      </div>

      <div style={{ width: 'min(560px, 92%)', marginTop: 20, marginBottom: 30 }}>
        <input
          className="form-input"
          placeholder="Search public records…"
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ width: '100%', padding: '11px 16px' }}
          autoFocus
        />
      </div>

      <div style={{ width: '100%', maxWidth: 1000 }}>
        <div style={{ marginBottom: 16, padding: '0 8px' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>
            {query ? `Results for “${query}”` : 'Public Records'} · {total}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center" style={{ padding: 60 }}><Spinner /></div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-dim)', padding: '56px 0', lineHeight: 1.8 }}>
            <div style={{ color: 'var(--gold-dim)', fontSize: '1.3rem', marginBottom: 10 }}>✦</div>
            No public records found.<br />
            Try a different search — or create a record and make it public to share with the community.
          </div>
        ) : (
          <PublicRecordCarousel key={query} records={records} autoRotate={!query} />
        )}
      </div>
    </div>
  )
}
