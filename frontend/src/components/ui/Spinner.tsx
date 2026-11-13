export default function Spinner({ size = 80 }: { size?: number }) {
  const d = Math.max(20, Math.round(size * 0.4))
  return (
    <div className="spinner-delayed" role="status" aria-label="Loading" style={{ width: d, height: d, flexShrink: 0 }}>
      <div className="spinner-ring" />
    </div>
  )
}
