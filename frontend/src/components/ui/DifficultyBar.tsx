interface Props {
  easy: number
  medium: number
  hard: number
  total?: number
}

export default function DifficultyBar({ easy, medium, hard }: Props) {
  const segments: { cls: string; count: number }[] = [
    { cls: 'easy',   count: easy },
    { cls: 'medium', count: medium },
    { cls: 'hard',   count: hard },
  ]
  const cells = segments.flatMap(s => Array(s.count).fill(s.cls))
  if (cells.length === 0) return null
  return (
    <div className="difficulty-bar">
      {cells.map((cls, i) => <span key={i} className={cls} />)}
    </div>
  )
}
